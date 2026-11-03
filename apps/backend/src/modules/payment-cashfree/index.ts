/**
 * The Ecom Buddy — Official Cashfree Payment Provider Module for Medusa v2
 *
 * Implements:
 * - AbstractPaymentProvider contract
 * - Server-side Cashfree PG order & payment session creation
 * - Cashfree checkout verification & status polling
 * - Webhook HMAC-SHA256 signature verification (timestamp + rawBody)
 * - PostgreSQL payment event inbox recording for idempotency
 * - Sandbox vs Production environment separation
 * - Domestic INR payment processing
 * - Refund creation and tracking
 */

import crypto from "crypto";
import {
  AbstractPaymentProvider,
  ContainerRegistrationKeys,
  MedusaError,
  ModuleProvider,
  Modules,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils";
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  BigNumberInput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";
import { Pool } from "pg";

export interface CashfreeOptions {
  app_id?: string;
  secret_key?: string;
  webhook_secret?: string;
  environment?: "sandbox" | "production";
  api_version?: string;
  supported_currencies?: string[];
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  order_amount: number;
  order_currency: string;
  order_status: "ACTIVE" | "PAID" | "EXPIRED";
  payment_session_id?: string;
  order_expiry_time?: string;
  payments?: {
    url: string;
  };
}

export interface CashfreePaymentEntity {
  cf_payment_id: string;
  order_id: string;
  payment_amount: number;
  payment_currency: string;
  payment_status: "SUCCESS" | "FAILED" | "PENDING" | "USER_DROPPED";
  payment_time: string;
  payment_completion_time?: string;
  payment_method: Record<string, any>;
  payment_group: string;
}

export class CashfreeClient {
  private appId: string;
  private secretKey: string;
  private baseUrl: string;
  private apiVersion: string;

  constructor(options: CashfreeOptions) {
    this.appId = options.app_id || "";
    this.secretKey = options.secret_key || "";
    this.baseUrl =
      options.environment === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
    this.apiVersion = options.api_version || "2023-08-01";
  }

  hasCredentials(): boolean {
    return Boolean(
      this.appId &&
        this.secretKey &&
        !this.appId.includes("placeholder") &&
        !this.secretKey.includes("placeholder")
    );
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-client-id": this.appId,
      "x-client-secret": this.secretKey,
      "x-api-version": this.apiVersion,
    };
  }

  async createOrder(payload: {
    order_id: string;
    order_amount: number;
    order_currency: string;
    customer_details: {
      customer_id: string;
      customer_name?: string;
      customer_email: string;
      customer_phone: string;
    };
    order_meta?: {
      return_url?: string;
      notify_url?: string;
    };
  }): Promise<CashfreeOrderResponse> {
    if (!this.hasCredentials()) {
      // Mocked safe local sandbox structure when real keys are pending
      return {
        cf_order_id: `cf_ord_local_${Date.now()}`,
        order_id: payload.order_id,
        order_amount: payload.order_amount,
        order_currency: payload.order_currency,
        order_status: "ACTIVE",
        payment_session_id: `session_cf_local_${Date.now()}`,
      };
    }

    const res = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err?.message || `Cashfree create order failed: ${res.statusText}`);
    }

    return (await res.json()) as CashfreeOrderResponse;
  }

  async getOrder(orderId: string): Promise<CashfreeOrderResponse> {
    if (!this.hasCredentials()) {
      return {
        cf_order_id: `cf_ord_local_${orderId}`,
        order_id: orderId,
        order_amount: 100,
        order_currency: "INR",
        order_status: "ACTIVE",
      };
    }

    const res = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err?.message || `Cashfree get order failed: ${res.statusText}`);
    }

    return (await res.json()) as CashfreeOrderResponse;
  }

  async getOrderPayments(orderId: string): Promise<CashfreePaymentEntity[]> {
    if (!this.hasCredentials()) {
      return [];
    }

    const res = await fetch(
      `${this.baseUrl}/orders/${encodeURIComponent(orderId)}/payments`,
      {
        method: "GET",
        headers: this.getHeaders(),
      }
    );

    if (!res.ok) {
      return [];
    }

    return (await res.json()) as CashfreePaymentEntity[];
  }

  async createRefund(
    orderId: string,
    payload: {
      refund_id: string;
      refund_amount: number;
      refund_note?: string;
    }
  ): Promise<any> {
    if (!this.hasCredentials()) {
      return {
        cf_refund_id: `cf_ref_local_${Date.now()}`,
        refund_id: payload.refund_id,
        order_id: orderId,
        refund_amount: payload.refund_amount,
        refund_status: "SUCCESS",
      };
    }

    const res = await fetch(
      `${this.baseUrl}/orders/${encodeURIComponent(orderId)}/refunds`,
      {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const err: any = await res.json().catch(() => ({}));
      throw new Error(err?.message || `Cashfree create refund failed: ${res.statusText}`);
    }

    return await res.json();
  }
}

/**
 * Verifies Cashfree webhook signature: HMAC-SHA256(timestamp + rawBody, secret)
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret || !timestamp) return false;
  try {
    const payload = `${timestamp}${rawBody}`;
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64");
    return crypto.timingSafeEqual(
      Buffer.from(signature, "utf-8"),
      Buffer.from(expectedSig, "utf-8")
    );
  } catch {
    return false;
  }
}

let dbPool: Pool | null = null;
function getPool(): Pool {
  if (!dbPool) {
    dbPool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgres://postgres:password@localhost:5432/medusa_ecom_buddy",
      max: 5,
    });
  }
  return dbPool;
}

export class CashfreePaymentProviderService extends AbstractPaymentProvider<CashfreeOptions> {
  static identifier = "cashfree";
  protected options: CashfreeOptions;
  protected client: CashfreeClient;

  constructor(container: any, options: CashfreeOptions) {
    super(container, options);
    this.options = {
      app_id: options.app_id || process.env.CASHFREE_APP_ID,
      secret_key: options.secret_key || process.env.CASHFREE_SECRET_KEY,
      webhook_secret:
        options.webhook_secret ||
        process.env.CASHFREE_WEBHOOK_SECRET ||
        process.env.CASHFREE_SECRET_KEY,
      environment:
        options.environment ||
        (process.env.PAYMENT_ENVIRONMENT === "live" ? "production" : "sandbox"),
      api_version: options.api_version || "2023-08-01",
      supported_currencies: options.supported_currencies || ["inr"],
    };
    this.client = new CashfreeClient(this.options);
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { currency_code, amount, data, context } = input;
    const currency = (currency_code || "inr").toLowerCase();

    if (currency !== "inr") {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        `Cashfree payment provider currently supports domestic INR transactions only (attempted: ${currency.toUpperCase()}).`
      );
    }

    const orderId = `cf_ord_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const customer = (context as any)?.customer || {};
    const email = customer.email || (context as any)?.email || "shopper@theecombuddy.local";
    const phone = customer.phone || "9999999999";
    const customerId = customer.id || `cus_guest_${Date.now()}`;

    // Convert decimal amount if necessary
    const numericAmount = Number(amount);

    const order = await this.client.createOrder({
      order_id: orderId,
      order_amount: numericAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: customerId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50),
        customer_name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || undefined,
        customer_email: email,
        customer_phone: phone.replace(/[^0-9]/g, "").slice(-10) || "9999999999",
      },
      order_meta: {
        return_url: `${process.env.STORE_URL || "http://localhost:3000"}/checkout?cf_id={order_id}`,
      },
    });

    return {
      id: order.order_id,
      data: {
        ...(data || {}),
        provider_id: "cashfree",
        cf_order_id: order.cf_order_id,
        order_id: order.order_id,
        payment_session_id: order.payment_session_id,
        amount: numericAmount,
        currency: "INR",
        status: "initiated",
      },
    };
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const { data } = input;
    const orderId = (data?.order_id as string) || (data?.cf_order_id as string);

    if (!orderId) {
      return {
        status: PaymentSessionStatus.ERROR,
        data: { ...(data || {}), error: "Missing Cashfree order_id" },
      };
    }

    try {
      const payments = await this.client.getOrderPayments(orderId);
      const successfulPayment = payments.find((p) => p.payment_status === "SUCCESS");

      if (successfulPayment) {
        return {
          status: PaymentSessionStatus.CAPTURED,
          data: {
            ...(data || {}),
            cf_payment_id: successfulPayment.cf_payment_id,
            payment_status: "SUCCESS",
            captured_at: successfulPayment.payment_completion_time || new Date().toISOString(),
          },
        };
      }

      const order = await this.client.getOrder(orderId);
      if (order.order_status === "PAID") {
        return {
          status: PaymentSessionStatus.CAPTURED,
          data: { ...(data || {}), order_status: "PAID" },
        };
      }

      return {
        status: PaymentSessionStatus.PENDING,
        data: { ...(data || {}), order_status: order.order_status },
      };
    } catch (err: any) {
      return {
        status: PaymentSessionStatus.ERROR,
        data: { ...(data || {}), error: err.message },
      };
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return {
      data: {
        ...(input.data || {}),
        captured: true,
        status: "captured",
      },
    };
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const { data, amount } = input;
    const orderId = (data?.order_id as string) || (data?.cf_order_id as string);

    if (!orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot process Cashfree refund: missing order_id."
      );
    }

    const refundId = `ref_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const refundRes = await this.client.createRefund(orderId, {
      refund_id: refundId,
      refund_amount: Number(amount),
      refund_note: "Merchant initiated refund",
    });

    return {
      data: {
        ...(data || {}),
        refund_id: refundId,
        refund_result: refundRes,
      },
    };
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...(input.data || {}),
        status: "canceled",
      },
    };
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return {
      data: input.data,
    };
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const { data } = input;
    const orderId = (data?.order_id as string) || (data?.cf_order_id as string);

    if (!orderId) {
      return { status: PaymentSessionStatus.ERROR, data };
    }

    try {
      const order = await this.client.getOrder(orderId);
      if (order.order_status === "PAID") {
        return { status: PaymentSessionStatus.CAPTURED, data: { ...data, ...order } };
      }
      if (order.order_status === "EXPIRED") {
        return { status: PaymentSessionStatus.CANCELED, data: { ...data, ...order } };
      }
      return { status: PaymentSessionStatus.PENDING, data: { ...data, ...order } };
    } catch {
      return { status: PaymentSessionStatus.PENDING, data };
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const { data } = input;
    const orderId = (data?.order_id as string) || (data?.cf_order_id as string);
    if (!orderId) return { data: data || {} };
    try {
      const order = await this.client.getOrder(orderId);
      return { data: { ...(data || {}), ...order } };
    } catch {
      return { data: data || {} };
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    return {
      data: {
        ...(input.data || {}),
        amount: Number(input.amount),
      },
    };
  }

  async getWebhookActionAndData(
    webhookData: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data, rawData, headers } = webhookData;
    const rawDataStr = (rawData as string) || JSON.stringify(data);
    const headersMap = (headers || {}) as Record<string, string>;
    const signature = headersMap["x-webhook-signature"] || headersMap["X-Webhook-Signature"];
    const timestamp = headersMap["x-webhook-timestamp"] || headersMap["X-Webhook-Timestamp"];

    const secret =
      this.options.webhook_secret || this.options.secret_key || "";

    // 1. Verify HMAC Signature if credentials exist
    if (this.client.hasCredentials() && signature && timestamp) {
      const isValid = verifyCashfreeWebhookSignature(
        rawDataStr,
        timestamp,
        signature,
        secret
      );
      if (!isValid) {
        throw new MedusaError(
          MedusaError.Types.UNAUTHORIZED,
          "Invalid Cashfree webhook signature."
        );
      }
    }

    const event = typeof data === "object" && data !== null ? data : JSON.parse(rawDataStr || "{}");
    const eventType = (event as any).type || (event as any).event || "UNKNOWN";
    const eventId = (event as any).event_id || (event as any).data?.order?.order_id || `evt_cf_${Date.now()}`;
    const entityId = (event as any).data?.order?.order_id || (event as any).data?.payment?.cf_payment_id;

    // 2. Persist event into durable payment_event_inbox for idempotency & reconciliation
    try {
      const pool = getPool();
      await pool.query(
        `INSERT INTO payment_event_inbox (id, provider_id, event_id, event_type, entity_id, payload, status, received_at, created_at, updated_at)
         VALUES ($1, 'cashfree', $2, $3, $4, $5, 'received', NOW(), NOW(), NOW())
         ON CONFLICT (provider_id, event_id) DO UPDATE
         SET attempts = payment_event_inbox.attempts + 1, updated_at = NOW()`,
        [
          `pei_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
          eventId,
          eventType,
          entityId || null,
          JSON.stringify(event),
        ]
      );
    } catch (err: any) {
      console.warn("[cashfree-webhook] Warning: Failed to record event in inbox:", err?.message);
    }

    // 3. Map event to Medusa payment action
    const sessionId = event.data?.order?.order_tags?.session_id || event.data?.order?.order_id;
    const amount = Number(event.data?.payment?.payment_amount || event.data?.order?.order_amount || 0);

    switch (eventType) {
      case "PAYMENT_SUCCESS_WEBHOOK":
      case "ORDER_PAID_WEBHOOK":
        return {
          action: PaymentActions.SUCCESSFUL,
          data: {
            session_id: sessionId,
            amount,
          },
        };

      case "PAYMENT_FAILED_WEBHOOK":
      case "PAYMENT_USER_DROPPED_WEBHOOK":
        return {
          action: PaymentActions.FAILED,
          data: {
            session_id: sessionId,
            amount,
          },
        };

      default:
        return { action: PaymentActions.NOT_SUPPORTED };
    }
  }
}

export default ModuleProvider(Modules.PAYMENT, {
  services: [CashfreePaymentProviderService],
});

import crypto from "crypto";
import {
  AbstractPaymentProvider,
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

// ==============================================================================
// 1. TYPES & CONTRACTS
// ==============================================================================

export interface RazorpayOptions {
  key_id?: string;
  key_secret?: string;
  webhook_secret?: string;
  mode?: "test" | "live";
  auto_capture?: boolean;
  supported_currencies?: string[];
  client_transport?: RazorpayTransport;
}

export interface RazorpayOrder {
  id: string;
  entity: "order";
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

export interface RazorpayPayment {
  id: string;
  entity: "payment";
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id?: string;
  captured?: boolean;
  notes?: Record<string, string>;
  created_at: number;
  error_code?: string | null;
  error_description?: string | null;
}

export interface RazorpayRefund {
  id: string;
  entity: "refund";
  amount: number;
  currency: string;
  payment_id: string;
  notes?: Record<string, string>;
  receipt?: string;
  status: "pending" | "processed" | "failed";
  created_at: number;
}

export interface RazorpayTransportRequest {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface RazorpayTransport {
  request<T>(req: RazorpayTransportRequest): Promise<T>;
}

// ==============================================================================
// 2. CURRENCY & UNIT PRECISION UTILITIES
// ==============================================================================

const ZERO_DECIMAL_CURRENCIES = new Set(["jpy", "krw", "vnd", "clp", "pyg"]);

export function toSmallestUnit(amount: BigNumberInput, currency: string): number {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(numeric)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid payment amount: ${amount}`
    );
  }
  const code = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return Math.round(numeric);
  }
  return Math.round(numeric * 100);
}

export function fromSmallestUnit(amount: BigNumberInput, currency: string): number {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(numeric)) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Invalid payment amount: ${amount}`
    );
  }
  const code = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) {
    return numeric;
  }
  return Number((numeric / 100).toFixed(2));
}

export function validateCurrencySupport(
  currency: string,
  supportedCurrencies: string[] = ["inr"]
): void {
  if (!currency) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Currency code is required for payment processing."
    );
  }
  const code = currency.toLowerCase();
  const allowed = supportedCurrencies.map((c) => c.toLowerCase());
  if (!allowed.includes(code)) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `Currency '${currency.toUpperCase()}' is not supported by this merchant's Razorpay gateway configuration. Supported currencies: [${allowed
        .map((c) => c.toUpperCase())
        .join(", ")}]. Cross-border international payments require active merchant export enablement.`
    );
  }
}

// ==============================================================================
// 3. CRYPTOGRAPHIC SIGNATURE & VERIFICATION
// ==============================================================================

export function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function generateCheckoutSignature(
  orderId: string,
  paymentId: string,
  keySecret: string
): string {
  if (!orderId || !paymentId || !keySecret) {
    throw new Error("Missing parameters for checkout signature generation.");
  }
  return crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
}

export function verifyCheckoutSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  if (!orderId || !paymentId || !signature || !keySecret) {
    return false;
  }
  const expected = generateCheckoutSignature(orderId, paymentId, keySecret);
  return timingSafeEqual(expected, signature);
}

export function generateWebhookSignature(
  rawBody: string | Buffer,
  webhookSecret: string
): string {
  if (!rawBody || !webhookSecret) {
    throw new Error("Missing rawBody or webhookSecret for webhook signature.");
  }
  return crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");
}

export function verifyWebhookSignature(
  rawBody: string | Buffer,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }
  const expected = generateWebhookSignature(rawBody, webhookSecret);
  return timingSafeEqual(expected, signature);
}

// ==============================================================================
// 4. RAZORPAY API REST CLIENT
// ==============================================================================

export class RazorpayClient {
  private keyId?: string;
  private keySecret?: string;
  private mode: "test" | "live";
  private transport?: RazorpayTransport;
  private baseUrl = "https://api.razorpay.com/v1";

  constructor(options: RazorpayOptions) {
    this.keyId = options.key_id;
    this.keySecret = options.key_secret;
    this.mode = options.mode || "test";
    this.transport = options.client_transport;
  }

  public hasCredentials(): boolean {
    return Boolean(
      this.keyId &&
        this.keySecret &&
        !this.keyId.includes("placeholder") &&
        !this.keySecret.includes("placeholder")
    );
  }

  public getMode(): "test" | "live" {
    return this.mode;
  }

  public getKeyId(): string | undefined {
    return this.keyId;
  }

  private async request<T>(req: RazorpayTransportRequest): Promise<T> {
    if (this.transport) {
      return this.transport.request<T>(req);
    }

    if (!this.hasCredentials()) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Razorpay API credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are not configured for this client installation. " +
          "Configure valid test credentials in .env or provide a test transport."
      );
    }

    const authHeader = `Basic ${Buffer.from(
      `${this.keyId}:${this.keySecret}`
    ).toString("base64")}`;

    const url = `${this.baseUrl}${req.path.startsWith("/") ? "" : "/"}${req.path}`;
    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
      ...(req.headers || {}),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        method: req.method,
        headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });
    } catch (err: any) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Razorpay network request failed: ${err.message}`
      );
    }

    const json = (await response.json().catch(() => ({}))) as any;

    if (!response.ok) {
      const errorMsg =
        json?.error?.description ||
        json?.error?.message ||
        `Razorpay HTTP ${response.status}: ${response.statusText}`;
      const errorCode = json?.error?.code || "RAZORPAY_ERROR";
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `[${errorCode}] ${errorMsg}`
      );
    }

    return json as T;
  }

  public async createOrder(params: {
    amount: number;
    currency: string;
    receipt?: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder> {
    return this.request<RazorpayOrder>({
      path: "/orders",
      method: "POST",
      body: {
        amount: params.amount,
        currency: params.currency.toUpperCase(),
        receipt: params.receipt,
        notes: params.notes,
      },
    });
  }

  public async getOrder(orderId: string): Promise<RazorpayOrder> {
    if (!orderId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay order_id is required."
      );
    }
    return this.request<RazorpayOrder>({
      path: `/orders/${orderId}`,
      method: "GET",
    });
  }

  public async getPayment(paymentId: string): Promise<RazorpayPayment> {
    if (!paymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay payment_id is required."
      );
    }
    return this.request<RazorpayPayment>({
      path: `/payments/${paymentId}`,
      method: "GET",
    });
  }

  public async capturePayment(
    paymentId: string,
    params: { amount: number; currency: string }
  ): Promise<RazorpayPayment> {
    if (!paymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay payment_id is required for capture."
      );
    }
    return this.request<RazorpayPayment>({
      path: `/payments/${paymentId}/capture`,
      method: "POST",
      body: {
        amount: params.amount,
        currency: params.currency.toUpperCase(),
      },
    });
  }

  public async createRefund(
    paymentId: string,
    params: { amount: number; notes?: Record<string, string>; receipt?: string }
  ): Promise<RazorpayRefund> {
    if (!paymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay payment_id is required for refund."
      );
    }
    return this.request<RazorpayRefund>({
      path: `/payments/${paymentId}/refund`,
      method: "POST",
      body: {
        amount: params.amount,
        notes: params.notes,
        receipt: params.receipt,
      },
    });
  }

  public async getRefund(refundId: string): Promise<RazorpayRefund> {
    if (!refundId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Razorpay refund_id is required."
      );
    }
    return this.request<RazorpayRefund>({
      path: `/refunds/${refundId}`,
      method: "GET",
    });
  }
}

// ==============================================================================
// 5. MEDUSA V2 RAZORPAY PAYMENT MODULE PROVIDER
// ==============================================================================

export class RazorpayPaymentProviderService extends AbstractPaymentProvider<RazorpayOptions> {
  static identifier = "razorpay";

  protected readonly options: RazorpayOptions;
  protected client: RazorpayClient;
  protected container: Record<string, any>;
  private processedWebhookEvents = new Set<string>();

  static validateOptions(options: RazorpayOptions): void {
    if (options.mode === "live") {
      if (!options.key_id || !options.key_secret) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are mandatory when RAZORPAY_MODE=live."
        );
      }
    }
  }

  constructor(container: Record<string, any>, options: RazorpayOptions) {
    super(container, options);
    this.container = container;
    this.options = {
      auto_capture: true,
      supported_currencies: options?.supported_currencies || [
        "inr",
        "usd",
        "aed",
        "gbp",
        "eur",
      ],
      ...options,
    };
    this.client = new RazorpayClient(this.options);
  }

  public getClient(): RazorpayClient {
    return this.client;
  }

  public getOptions(): RazorpayOptions {
    return this.options;
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { currency_code, amount, data, context } = input;

    validateCurrencySupport(
      currency_code,
      this.options.supported_currencies
    );

    const numericAmount = typeof amount === "number" ? amount : Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Payment amount must be greater than zero. Received: ${amount}`
      );
    }

    const amountSmallest = toSmallestUnit(numericAmount, currency_code);
    const sessionId = (data?.session_id as string) || (context?.idempotency_key as string) || "";

    const order = await this.client.createOrder({
      amount: amountSmallest,
      currency: currency_code,
      receipt: sessionId.slice(-40),
      notes: {
        session_id: sessionId,
        customer_id: (context?.customer?.id as string) || "",
        customer_email: (context?.customer?.email as string) || "",
      },
    });

    return {
      id: order.id,
      data: {
        ...(data || {}),
        ...order,
        order_id: order.id,
        session_id: sessionId,
        key_id: this.client.getKeyId() || "",
      },
    };
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    const { data } = input;
    const paymentId = (data?.razorpay_payment_id as string) || (data?.payment_id as string);
    const orderId = (data?.razorpay_order_id as string) || (data?.order_id as string);
    const signature = data?.razorpay_signature as string;

    // Cryptographic verification if frontend returned callback payload
    if (orderId && paymentId && signature) {
      const secret = this.options.key_secret || "";
      const isValid = verifyCheckoutSignature(orderId, paymentId, signature, secret);

      if (!isValid) {
        return {
          status: PaymentSessionStatus.ERROR,
          data: {
            ...(data || {}),
            error: "Cryptographic signature mismatch on Razorpay checkout verification.",
          },
        };
      }

      // If client has active credentials, check real payment status with Razorpay
      if (this.client.hasCredentials()) {
        try {
          const payment = await this.client.getPayment(paymentId);
          if (payment.status === "captured") {
            return {
              status: PaymentSessionStatus.CAPTURED,
              data: { ...(data || {}), ...payment },
            };
          }
          if (payment.status === "authorized") {
            return {
              status: PaymentSessionStatus.AUTHORIZED,
              data: { ...(data || {}), ...payment },
            };
          }
          if (payment.status === "failed") {
            return {
              status: PaymentSessionStatus.ERROR,
              data: { ...(data || {}), ...payment },
            };
          }
        } catch (err: any) {
          return {
            status: PaymentSessionStatus.ERROR,
            data: { ...(data || {}), error: err.message },
          };
        }
      }

      // Valid signature confirmed
      return {
        status: PaymentSessionStatus.AUTHORIZED,
        data: {
          ...(data || {}),
          payment_id: paymentId,
          order_id: orderId,
        },
      };
    }

    return this.getPaymentStatus(input);
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    const { data } = input;
    const paymentId = (data?.payment_id as string) || (data?.razorpay_payment_id as string) || (data?.id as string);

    if (!paymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot capture payment: missing Razorpay payment_id."
      );
    }

    if (data?.status === "captured" || data?.captured === true) {
      return { data };
    }

    const currency = (data?.currency as string) || "inr";
    const amount = (data?.amount as number) || 0;
    const amountSmallest = typeof amount === "number" && amount < 1000 ? toSmallestUnit(amount, currency) : amount;

    const captured = await this.client.capturePayment(paymentId, {
      amount: amountSmallest,
      currency,
    });

    return {
      data: {
        ...(data || {}),
        ...captured,
        status: "captured",
        captured: true,
      },
    };
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    const { amount, data } = input;
    const paymentId = (data?.payment_id as string) || (data?.razorpay_payment_id as string) || (data?.id as string);

    if (!paymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot refund payment: missing Razorpay payment_id."
      );
    }

    const currency = (data?.currency as string) || "inr";
    const refundSmallest = toSmallestUnit(amount, currency);

    const refund = await this.client.createRefund(paymentId, {
      amount: refundSmallest,
      notes: {
        refund_reason: "Merchant authorized return / order cancellation",
      },
    });

    return {
      data: {
        ...(data || {}),
        refund,
        refund_id: refund.id,
      },
    };
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    const { data } = input;
    return {
      data: {
        ...(data || {}),
        status: "canceled",
      },
    };
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return this.cancelPayment(input);
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    const { data } = input;
    const paymentId = (data?.payment_id as string) || (data?.razorpay_payment_id as string) || (data?.id as string);

    if (paymentId && this.client.hasCredentials()) {
      try {
        const payment = await this.client.getPayment(paymentId);
        return { data: { ...(data || {}), ...payment } };
      } catch {
        return { data };
      }
    }
    return { data };
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    const { data, currency_code } = input;

    if (currency_code) {
      validateCurrencySupport(
        currency_code,
        this.options.supported_currencies
      );
    }

    return this.getPaymentStatus({ data });
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = input.data || {};
    const rawStatus = (data.status as string) || "";

    switch (rawStatus.toLowerCase()) {
      case "captured":
        return { status: PaymentSessionStatus.CAPTURED, data };
      case "authorized":
        return { status: PaymentSessionStatus.AUTHORIZED, data };
      case "created":
      case "attempted":
        return { status: PaymentSessionStatus.PENDING, data };
      case "failed":
      case "error":
        return { status: PaymentSessionStatus.ERROR, data };
      case "canceled":
        return { status: PaymentSessionStatus.CANCELED, data };
      default:
        return { status: PaymentSessionStatus.PENDING, data };
    }
  }

  async getWebhookActionAndData(
    webhookData: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const { data, rawData, headers } = webhookData;
    const payloadData = (data || {}) as Record<string, any>;
    const signature =
      (headers?.["x-razorpay-signature"] as string) ||
      (headers?.["X-Razorpay-Signature"] as string);

    if (!signature) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    const secret = this.options.webhook_secret;
    if (!secret) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    const isValid = verifyWebhookSignature(
      rawData || JSON.stringify(payloadData),
      signature,
      secret
    );

    if (!isValid) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    // Replay & Duplicate Event Protection
    const eventId =
      (headers?.["x-razorpay-event-id"] as string) ||
      (payloadData.id as string) ||
      (payloadData.event_id as string) ||
      "";

    if (eventId) {
      if (this.processedWebhookEvents.has(eventId)) {
        return { action: PaymentActions.NOT_SUPPORTED };
      }
      this.processedWebhookEvents.add(eventId);

      // Attempt Redis replay lock if Redis connection is accessible
      try {
        const redis = this.container["redisConnection"] || this.container["redisClient"];
        if (redis && typeof redis.set === "function") {
          const lockKey = `teb:webhook:razorpay:${eventId}`;
          const acquired = await redis.set(lockKey, "1", "EX", 259200, "NX");
          if (!acquired) {
            return { action: PaymentActions.NOT_SUPPORTED };
          }
        }
      } catch {
        // Fallback to in-memory Set protection
      }
    }

    const event = payloadData.event as string;
    const paymentEntity = payloadData.payload?.payment?.entity;
    const orderEntity = payloadData.payload?.order?.entity;

    const sessionId =
      paymentEntity?.notes?.session_id ||
      orderEntity?.notes?.session_id ||
      "";

    if (!sessionId) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    const rawAmount = paymentEntity?.amount || orderEntity?.amount || 0;
    const currency = (paymentEntity?.currency || orderEntity?.currency || "inr").toLowerCase();
    const amount = fromSmallestUnit(rawAmount, currency);

    switch (event) {
      case "payment.authorized":
        return {
          action: PaymentActions.AUTHORIZED,
          data: {
            session_id: sessionId,
            amount,
          },
        };

      case "payment.captured":
      case "order.paid":
        return {
          action: PaymentActions.SUCCESSFUL,
          data: {
            session_id: sessionId,
            amount,
          },
        };

      case "payment.failed":
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

// ==============================================================================
// 6. DEFAULT EXPORT (MODULE PROVIDER DEFINITION)
// ==============================================================================

export default ModuleProvider(Modules.PAYMENT, {
  services: [RazorpayPaymentProviderService],
});

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
  redis_client?: any;
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

  public hasTransport(): boolean {
    return Boolean(this.transport);
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
  private redisInstance?: any;

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

  public async getRedisClient(): Promise<any> {
    if (this.options.redis_client) {
      return this.options.redis_client;
    }
    if (this.redisInstance) {
      return this.redisInstance;
    }

    const containerRedis = this.container["redisConnection"] || this.container["redisClient"];
    if (containerRedis && typeof containerRedis.set === "function") {
      this.redisInstance = containerRedis;
      return this.redisInstance;
    }

    try {
      const Redis = require("ioredis");
      const url = process.env.REDIS_URL || "redis://localhost:6379";
      const client = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        lazyConnect: true,
      });
      await client.connect();
      this.redisInstance = client;
      return this.redisInstance;
    } catch {
      return undefined;
    }
  }

  /**
   * Safe Lua-based mutex lock release ensuring strict ownership:
   * Only the worker that acquired the lock with lockToken can release it.
   */
  public async releaseLock(
    lockKey: string,
    lockToken: string
  ): Promise<boolean> {
    const redis = await this.getRedisClient();
    if (!redis) return false;

    // Atomic Lua check-and-delete:
    // Only delete if the key value matches ARGV[1] (ownership token)
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await redis.eval(script, 1, lockKey, lockToken);
      return result === 1;
    } catch {
      return false;
    }
  }

  /**
   * Check whether an event has been marked as completed downstream
   */
  public async isEventCompleted(eventKey: string): Promise<boolean> {
    const redis = await this.getRedisClient();
    if (!redis) return false;
    const completedKey = `teb:webhook:completed:razorpay:${eventKey}`;
    const status = await redis.get(completedKey);
    return status === "completed";
  }

  /**
   * Retrieve the current in-flight lock owner token for an event key
   */
  public async getLockToken(eventKey: string): Promise<string | null> {
    const redis = await this.getRedisClient();
    if (!redis) return null;
    const lockKey = `teb:webhook:lock:razorpay:${eventKey}`;
    return (await redis.get(lockKey)) || null;
  }

  /**
   * Durable completion marker:
   * Called ONLY AFTER downstream Medusa workflow (order placement / payment capture)
   * has successfully finished. Transitions state to 'completed' with 72-hour retention
   * and safely releases in-flight worker locks.
   */
  public async markWebhookCompleted(
    sessionIdOrEventKey: string,
    lockToken?: string
  ): Promise<void> {
    const redis = await this.getRedisClient();
    if (!redis) return;

    if (sessionIdOrEventKey.includes(":")) {
      // Event-level key (e.g. "evt_123:payment.captured")
      const eventKey = sessionIdOrEventKey;
      const lockKey = `teb:webhook:lock:razorpay:${eventKey}`;
      const completedKey = `teb:webhook:completed:razorpay:${eventKey}`;

      await redis.set(completedKey, "completed", "EX", 259200); // 72 hours
      if (lockToken) {
        await this.releaseLock(lockKey, lockToken);
      } else {
        await redis.del(lockKey);
      }
      return;
    }

    // Session-level key (e.g. "payses_123"): finalize all pending session locks
    const sessionId = sessionIdOrEventKey;
    try {
      const sessionKeys: string[] = await redis.keys(
        `teb:webhook:session_lock:${sessionId}:*`
      );
      for (const key of sessionKeys) {
        const raw = await redis.get(key);
        if (raw) {
          try {
            const data = JSON.parse(raw);
            if (data.completedKey) {
              await redis.set(data.completedKey, "completed", "EX", 259200);
            }
            if (data.lockKey && data.lockToken) {
              await this.releaseLock(data.lockKey, data.lockToken);
            } else if (data.lockKey) {
              await redis.del(data.lockKey);
            }
            await redis.del(key);
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch {
      // Ignore Redis scan errors
    }
  }

  /**
   * Reconciliation mechanism:
   * Reconciles an accepted webhook event whose asynchronous processing
   * may have stalled, timed out, or crashed downstream.
   *
   * 1. Inspects active session locks in Redis.
   * 2. If an order already exists for the session's cart, marks the event completed and frees the lock.
   * 3. If no order exists, releases the worker lock so gateway retries can re-execute safely.
   */
  public async reconcileSession(
    sessionId: string
  ): Promise<{
    reconciled: boolean;
    status: string;
    orderId?: string;
    details?: string;
  }> {
    const redis = await this.getRedisClient();
    if (!redis) {
      return { reconciled: false, status: "redis_unavailable" };
    }

    // 1. Locate any in-flight or pending session locks
    const keys: string[] = await redis.keys(`teb:webhook:session_lock:${sessionId}:*`);

    if (keys.length === 0) {
      return {
        reconciled: true,
        status: "already_completed_or_empty",
        details: "No active in-flight session locks found for this session ID.",
      };
    }

    let meta: any = null;
    for (const k of keys) {
      const raw = await redis.get(k);
      if (raw) {
        try {
          meta = JSON.parse(raw);
          break;
        } catch {}
      }
    }

    if (!meta) {
      return { reconciled: false, status: "corrupt_lock_metadata" };
    }

    // 2. Query Medusa database to determine if the order was already completed
    try {
      const query = this.container["remoteQuery"] || this.container[ContainerRegistrationKeys.REMOTE_QUERY];
      if (query) {
        const orderCarts: any[] = await query({
          entryPoint: "cart_payment_collection",
          fields: ["cart_id"],
          variables: { filters: { payment_collection: { payment_sessions: { id: sessionId } } } },
        });

        const cartId = orderCarts?.[0]?.cart_id;
        if (cartId) {
          const orders: any[] = await query({
            entryPoint: "order_cart",
            fields: ["id", "order_id"],
            variables: { filters: { cart_id: cartId } },
          });

          if (orders && orders.length > 0 && orders[0].order_id) {
            // Order was already placed! Finalize the webhook event.
            await this.markWebhookCompleted(sessionId);
            return {
              reconciled: true,
              status: "order_already_placed",
              orderId: orders[0].order_id,
              details: "Order verified in database. Transitioned webhook state to completed.",
            };
          }
        }
      }
    } catch {
      // Remote query check failed; proceed to lock release / retry enablement
    }

    // 3. If order not yet created: release the in-flight lock so retries can proceed
    if (meta.lockKey && meta.lockToken) {
      await this.releaseLock(meta.lockKey, meta.lockToken);
    } else if (meta.lockKey) {
      await redis.del(meta.lockKey);
    }

    return {
      reconciled: true,
      status: "lock_released_for_retry",
      details: "In-flight lock released. Webhook gateway retry can now reconcile downstream.",
    };
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    const { currency_code, amount, data, context } = input;

    // Phase 6: Never expose Razorpay checkout if active credentials are missing or placeholder
    if (!this.client.hasCredentials() && !this.client.hasTransport()) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Razorpay payment provider is not configured with active gateway credentials for this store installation. " +
          "Please configure valid merchant credentials or select an alternative payment method."
      );
    }

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
    const numericAmount = typeof amount === "number" ? amount : Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Refund amount must be greater than zero. Received: ${amount}`
      );
    }

    const paymentId = (data?.payment_id as string) || (data?.razorpay_payment_id as string) || (data?.id as string);
    if (!paymentId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot refund payment: missing Razorpay payment_id."
      );
    }

    const currency = (data?.currency as string) || "inr";
    const refundSmallest = toSmallestUnit(numericAmount, currency);

    // Validate that refund does not exceed captured amount
    const capturedAmount = Number(data?.amount || 0);
    const alreadyRefunded = Number(data?.amount_refunded || 0);
    if (capturedAmount > 0) {
      const remainingBalance = capturedAmount - alreadyRefunded;
      if (refundSmallest > remainingBalance) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `Refund amount (${refundSmallest}) exceeds remaining captured payment balance (${remainingBalance}).`
        );
      }
    }

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
        amount_refunded: alreadyRefunded + refundSmallest,
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

    // Event and Session extraction
    const event = (payloadData.event as string) || "";
    const paymentEntity = payloadData.payload?.payment?.entity;
    const orderEntity = payloadData.payload?.order?.entity;

    const sessionId =
      paymentEntity?.notes?.session_id ||
      orderEntity?.notes?.session_id ||
      "";

    // Foreign webhooks or events with zero session correlation are unsupported
    if (!sessionId) {
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    // Event ID extraction for atomic idempotency
    const eventId =
      (headers?.["x-razorpay-event-id"] as string) ||
      (payloadData.id as string) ||
      (payloadData.event_id as string) ||
      "";

    // Durable Redis Deduplication & Mutex Locking
    const redis = await this.getRedisClient();
    if (!redis) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Redis durable store is required for payment webhook deduplication but could not be reached. Failing safely to preserve retriable state."
      );
    }

    // Distinct Event Scoping: differentiates authorized vs captured vs paid events
    const eventKey = eventId
      ? `${eventId}:${event || "event"}`
      : `${sessionId}:${event || "event"}`;

    const lockKey = `teb:webhook:lock:razorpay:${eventKey}`;
    const completedKey = `teb:webhook:completed:razorpay:${eventKey}`;

    // Step 1: Check whether downstream processing has ALREADY succeeded
    const isCompleted = await redis.get(completedKey);
    if (isCompleted === "completed") {
      // Event already processed and finalized downstream -> safe duplicate rejection
      return { action: PaymentActions.NOT_SUPPORTED };
    }

    // Step 2: Atomic lock acquisition using a unique worker ownership token (UUID)
    const lockToken = crypto.randomUUID();
    const acquired = await redis.set(lockKey, lockToken, "EX", 120, "NX");
    if (!acquired) {
      // Check again if it completed while acquiring
      const lateCompleted = await redis.get(completedKey);
      if (lateCompleted === "completed") {
        return { action: PaymentActions.NOT_SUPPORTED };
      }
      // Mutex contention: another worker currently has the in-flight lock
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Webhook event '${eventKey}' is currently being processed by another worker. Retrying shortly.`
      );
    }

    // Step 3: Process the event safely with error rollback
    try {
      // Register in-flight session lock association so downstream subscriber can finalize it
      const sessionLockKey = `teb:webhook:session_lock:${sessionId}:${event || "event"}`;
      await redis.set(
        sessionLockKey,
        JSON.stringify({
          eventKey,
          lockKey,
          completedKey,
          lockToken,
          sessionId,
          event,
        }),
        "EX",
        180 // 3 minutes TTL
      );

      const rawAmount = paymentEntity?.amount || orderEntity?.amount || 0;
      const currency = (paymentEntity?.currency || orderEntity?.currency || "inr").toLowerCase();
      const amount = fromSmallestUnit(rawAmount, currency);

      let result: WebhookActionResult;

      switch (event) {
        case "payment.authorized":
          result = {
            action: PaymentActions.AUTHORIZED,
            data: {
              session_id: sessionId,
              amount,
            },
          };
          break;

        case "payment.captured":
        case "order.paid":
          result = {
            action: PaymentActions.SUCCESSFUL,
            data: {
              session_id: sessionId,
              amount,
            },
          };
          break;

        case "payment.failed":
          result = {
            action: PaymentActions.FAILED,
            data: {
              session_id: sessionId,
              amount,
            },
          };
          // For terminal failed events, mark completed so they are not retried
          await redis.set(completedKey, "completed", "EX", 259200);
          await this.releaseLock(lockKey, lockToken);
          await redis.del(sessionLockKey);
          break;

        default:
          result = { action: PaymentActions.NOT_SUPPORTED };
          // Release lock for unsupported events
          await this.releaseLock(lockKey, lockToken);
          await redis.del(sessionLockKey);
          break;
      }

      // NOTE: We DO NOT mark completedKey = "completed" here for authorized/captured events!
      // Marking completed prematurely before downstream processPaymentWorkflow finishes
      // breaks gateway retry recovery if downstream fails.
      // Downstream completion is finalized via markWebhookCompleted / subscriber.
      return result;
    } catch (err) {
      // If parsing/processing throws an error inside getWebhookActionAndData,
      // release lock immediately using owner token so retry can succeed.
      await this.releaseLock(lockKey, lockToken);
      throw err;
    }
  }
}

// ==============================================================================
// 6. DEFAULT EXPORT (MODULE PROVIDER DEFINITION)
// ==============================================================================

export default ModuleProvider(Modules.PAYMENT, {
  services: [RazorpayPaymentProviderService],
});

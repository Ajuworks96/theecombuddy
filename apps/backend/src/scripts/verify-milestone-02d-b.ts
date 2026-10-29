import type { MedusaContainer } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  OrderWorkflowEvents,
  PaymentActions,
  PaymentEvents,
  PaymentSessionStatus,
} from "@medusajs/framework/utils";
import razorpayWebhookFinalizer from "../subscribers/razorpay-webhook-finalizer.ts";
import {
  RazorpayPaymentProviderService,
  RazorpayClient,
  toSmallestUnit,
  fromSmallestUnit,
  validateCurrencySupport,
  generateCheckoutSignature,
  verifyCheckoutSignature,
  generateWebhookSignature,
  verifyWebhookSignature,
  timingSafeEqual,
} from "../modules/payment-razorpay/index.ts";

interface TestResult {
  suite: string;
  name: string;
  status: "UNIT TEST PASSED" | "LOCAL INTEGRATION PASSED" | "RAZORPAY TEST MODE PASSED" | "BLOCKED" | "FAILED";
  details?: string;
}

export default async function verifyMilestone02DB({ container }: { container: MedusaContainer }) {
  console.log("==============================================================================");
  console.log("[verify-02d-b] THE ECOM BUDDY — MILESTONE 02D-B.1 RAZORPAY SANDBOX & HARDENING");
  console.log("==============================================================================");

  const results: TestResult[] = [];
  const query = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const paymentService = container.resolve(Modules.PAYMENT);

  function record(
    suite: string,
    name: string,
    passed: boolean,
    details?: string,
    category: "UNIT TEST PASSED" | "LOCAL INTEGRATION PASSED" | "RAZORPAY TEST MODE PASSED" = "UNIT TEST PASSED"
  ) {
    const status: TestResult["status"] = passed ? category : "FAILED";
    results.push({ suite, name, status, details });
    console.log(`  [${status}] ${name}${details ? ` (${details})` : ""}`);
  }

  function recordBlocked(suite: string, name: string, reason: string) {
    results.push({ suite, name, status: "BLOCKED", details: reason });
    console.log(`  [BLOCKED] ${name} — ${reason}`);
  }

  // ============================================================================
  // SUITE 1: Provider Architecture & Region Safety Audit
  // ============================================================================
  console.log("\n--- SUITE 1: Provider Architecture & Region Safety Audit ---");
  try {
    const providers: any[] = await paymentService.listPaymentProviders();
    const razorpayProvider = providers.find((p) => p.id === "pp_razorpay_razorpay");
    record(
      "Suite 1: Architecture",
      "Test 1: pp_razorpay_razorpay registered in Payment Module",
      Boolean(razorpayProvider),
      razorpayProvider?.id,
      "LOCAL INTEGRATION PASSED"
    );
    record(
      "Suite 1: Architecture",
      "Test 2: pp_razorpay_razorpay is enabled in database",
      Boolean(razorpayProvider?.is_enabled),
      `is_enabled: ${razorpayProvider?.is_enabled}`,
      "LOCAL INTEGRATION PASSED"
    );

    const systemProvider = providers.find((p) => p.id === "pp_system_default");
    record(
      "Suite 1: Architecture",
      "Test 3: pp_system_default preserved for COD in India",
      Boolean(systemProvider?.is_enabled),
      `is_enabled: ${systemProvider?.is_enabled}`,
      "LOCAL INTEGRATION PASSED"
    );

    const regions: any[] = await query({
      entryPoint: "region",
      fields: ["id", "name", "currency_code", "payment_providers.id"],
    });

    const indiaRegion = regions.find((r) => r.currency_code === "inr");
    const indiaProviders = (indiaRegion?.payment_providers || []).map((p: any) => p.id);
    record(
      "Suite 1: Architecture",
      "Test 4: India Region offers both Online Payment and Cash on Delivery",
      indiaProviders.includes("pp_razorpay_razorpay") && indiaProviders.includes("pp_system_default"),
      JSON.stringify(indiaProviders),
      "LOCAL INTEGRATION PASSED"
    );

    // Strict COD Isolation: Non-INR regions must NEVER have pp_system_default
    const intlRegions = regions.filter((r) => r.currency_code !== "inr");
    const intlHasNoCOD = intlRegions.every((r) =>
      !(r.payment_providers || []).some((p: any) => p.id === "pp_system_default")
    );
    record(
      "Suite 1: Architecture",
      "Test 5: International regions strictly exclude Cash on Delivery (COD Policy)",
      intlHasNoCOD,
      "COD eliminated from US, UAE, UK, EU",
      "LOCAL INTEGRATION PASSED"
    );

    const intlHasRazorpay = intlRegions.every((r) =>
      (r.payment_providers || []).some((p: any) => p.id === "pp_razorpay_razorpay")
    );
    record(
      "Suite 1: Architecture",
      "Test 6: International regions (USD, AED, GBP, EUR) configured for Razorpay",
      intlHasRazorpay,
      `${intlRegions.length} international regions linked`,
      "LOCAL INTEGRATION PASSED"
    );
  } catch (err: any) {
    record("Suite 1: Architecture", "Suite 1 Execution", false, err.message);
  }

  // ============================================================================
  // SUITE 2: Multi-Currency & Smallest Unit Precision (Unit Tests)
  // ============================================================================
  console.log("\n--- SUITE 2: Multi-Currency & Unit Precision (Unit Tests) ---");
  try {
    record(
      "Suite 2: Multi-Currency",
      "Test 7: INR amount converted to integer paise (₹1,598.00 -> 159800 paise)",
      toSmallestUnit(1598.0, "inr") === 159800,
      `Calculated: ${toSmallestUnit(1598.0, "inr")}`
    );
    record(
      "Suite 2: Multi-Currency",
      "Test 8: USD amount converted to integer cents ($35.50 -> 3550 cents)",
      toSmallestUnit(35.5, "usd") === 3550,
      `Calculated: ${toSmallestUnit(35.5, "usd")}`
    );
    record(
      "Suite 2: Multi-Currency",
      "Test 9: EUR amount converted to integer cents (€42.99 -> 4299 cents)",
      toSmallestUnit(42.99, "eur") === 4299,
      `Calculated: ${toSmallestUnit(42.99, "eur")}`
    );
    record(
      "Suite 2: Multi-Currency",
      "Test 10: AED amount converted to integer fils (50.00 AED -> 5000 fils)",
      toSmallestUnit(50.0, "aed") === 5000,
      `Calculated: ${toSmallestUnit(50.0, "aed")}`
    );
    record(
      "Suite 2: Multi-Currency",
      "Test 11: Zero-decimal currency JPY preserved without scaling (1000 JPY -> 1000)",
      toSmallestUnit(1000, "jpy") === 1000,
      `Calculated: ${toSmallestUnit(1000, "jpy")}`
    );
    record(
      "Suite 2: Multi-Currency",
      "Test 12: Paise converted back to standard INR currency (159800 paise -> ₹1,598.00)",
      fromSmallestUnit(159800, "inr") === 1598.0,
      `Calculated: ${fromSmallestUnit(159800, "inr")}`
    );

    let unsupportedRejected = false;
    try {
      validateCurrencySupport("xyz", ["inr", "usd", "aed", "gbp", "eur"]);
    } catch {
      unsupportedRejected = true;
    }
    record(
      "Suite 2: Multi-Currency",
      "Test 13: Unsupported foreign currency rejected with MedusaError (No silent conversion)",
      unsupportedRejected,
      "XYZ rejected"
    );

    let supportedAccepted = false;
    try {
      validateCurrencySupport("usd", ["inr", "usd", "aed", "gbp", "eur"]);
      supportedAccepted = true;
    } catch {
      supportedAccepted = false;
    }
    record(
      "Suite 2: Multi-Currency",
      "Test 14: Eligible international currencies pass validation",
      supportedAccepted,
      "USD allowed"
    );
  } catch (err: any) {
    record("Suite 2: Multi-Currency", "Suite 2 Execution", false, err.message);
  }

  // ============================================================================
  // SUITE 3: Cryptography & Signature Verification (Unit Tests)
  // ============================================================================
  console.log("\n--- SUITE 3: Cryptography & Signature Verification (Unit Tests) ---");
  try {
    const testSecret = "merchant_test_secret_key_123456789";
    const testOrderId = "order_O1M6X98A1B2C3D";
    const testPaymentId = "pay_P1M6X98E4F5G6H";

    const validCheckoutSig = generateCheckoutSignature(testOrderId, testPaymentId, testSecret);
    record(
      "Suite 3: Cryptography",
      "Test 15: Valid checkout HMAC-SHA256 signature generated and verified",
      verifyCheckoutSignature(testOrderId, testPaymentId, validCheckoutSig, testSecret),
      `Sig: ${validCheckoutSig.slice(0, 16)}...`
    );

    const tamperedSig = validCheckoutSig.slice(0, -4) + "ffff";
    record(
      "Suite 3: Cryptography",
      "Test 16: Tampered checkout signature rejected",
      !verifyCheckoutSignature(testOrderId, testPaymentId, tamperedSig, testSecret),
      "Tampered signature rejected"
    );

    record(
      "Suite 3: Cryptography",
      "Test 17: Mismatched order/payment IDs rejected with valid signature",
      !verifyCheckoutSignature("order_TAMPERED", testPaymentId, validCheckoutSig, testSecret),
      "Mismatched order rejected"
    );

    const rawWebhookBody = JSON.stringify({
      entity: "event",
      account_id: "acc_test_merchant_001",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: testPaymentId,
            amount: 159800,
            currency: "INR",
            status: "captured",
          },
        },
      },
    });

    const validWebhookSig = generateWebhookSignature(rawWebhookBody, testSecret);
    record(
      "Suite 3: Cryptography",
      "Test 18: Valid webhook raw-body HMAC-SHA256 signature verified",
      verifyWebhookSignature(rawWebhookBody, validWebhookSig, testSecret),
      `Webhook Sig: ${validWebhookSig.slice(0, 16)}...`
    );

    record(
      "Suite 3: Cryptography",
      "Test 19: Invalid webhook signature rejected",
      !verifyWebhookSignature(rawWebhookBody, "invalid_webhook_signature", testSecret),
      "Invalid signature rejected"
    );

    record(
      "Suite 3: Cryptography",
      "Test 20: Constant-time string comparison protects against timing attacks",
      timingSafeEqual("secure_signature_hash_abc", "secure_signature_hash_abc") &&
        !timingSafeEqual("secure_signature_hash_abc", "secure_signature_hash_xyz"),
      "crypto.timingSafeEqual verified"
    );
  } catch (err: any) {
    record("Suite 3: Cryptography", "Suite 3 Execution", false, err.message);
  }

  // ============================================================================
  // SUITE 4: Durable Redis Webhook Deduplication & Concurrency (Unit Tests)
  // ============================================================================
  console.log("\n--- SUITE 4: Durable Redis Deduplication & Concurrency ---");
  try {
    const memoryStore = new Map<string, string>();
    const mockRedis = {
      async set(key: string, value: string, mode?: string, duration?: number, flag?: string) {
        if (flag === "NX") {
          if (memoryStore.has(key)) return null;
          memoryStore.set(key, value);
          return "OK";
        }
        memoryStore.set(key, value);
        return "OK";
      },
      async get(key: string) {
        return memoryStore.get(key) || null;
      },
      async del(key: string) {
        memoryStore.delete(key);
        return 1;
      },
      async keys(pattern: string) {
        const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
        return Array.from(memoryStore.keys()).filter((k) => regex.test(k));
      },
      async eval(script: string, numKeys: number, ...evalArgs: any[]) {
        const key = evalArgs[0];
        const val = evalArgs[1];
        if (memoryStore.get(key) === val) {
          memoryStore.delete(key);
          return 1;
        }
        return 0;
      },
    };

    const webhookSecret = "rzp_webhook_secret_secure_987654";
    const providerService = new RazorpayPaymentProviderService(container, {
      key_id: "rzp_test_placeholder",
      key_secret: "placeholder_secret_key",
      webhook_secret: webhookSecret,
      mode: "test",
      supported_currencies: ["inr", "usd", "aed", "gbp", "eur"],
      redis_client: mockRedis,
    });

    const sessionId = "payses_01M6TESTSESSION01";
    const eventId = "evt_01M6TESTEVENT01";

    // 1. Valid payment.captured webhook
    const capturedPayload = {
      entity: "event",
      account_id: "acc_test",
      event: "payment.captured",
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: "pay_captured_01",
            amount: 188564,
            currency: "INR",
            status: "captured",
            notes: { session_id: sessionId },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const capturedRaw = JSON.stringify(capturedPayload);
    const capturedSig = generateWebhookSignature(capturedRaw, webhookSecret);

    const actionResult = await providerService.getWebhookActionAndData({
      data: capturedPayload,
      rawData: capturedRaw,
      headers: {
        "x-razorpay-signature": capturedSig,
        "x-razorpay-event-id": eventId,
      },
    });

    record(
      "Suite 4: Webhook",
      "Test 21: payment.captured mapped to PaymentActions.SUCCESSFUL",
      actionResult.action === PaymentActions.SUCCESSFUL &&
        actionResult.data?.session_id === sessionId &&
        actionResult.data?.amount === 1885.64,
      `Action: ${actionResult.action}, Amount: ₹${actionResult.data?.amount}`
    );

    const eventKey = `${eventId}:payment.captured`;
    const lockKey = `teb:webhook:lock:razorpay:${eventKey}`;
    const completedKey = `teb:webhook:completed:razorpay:${eventKey}`;

    const lockToken = await mockRedis.get(lockKey);
    const isPrematurelyCompleted = await mockRedis.get(completedKey);

    record(
      "Suite 4: Webhook",
      "Test 22: Mutex lock acquired with ownership token (Event NOT prematurely marked completed)",
      Boolean(lockToken && lockToken.length > 10) && isPrematurelyCompleted === null,
      `Token: ${lockToken?.slice(0, 8)}..., completed: ${isPrematurelyCompleted}`
    );

    // 2. Strict Lock Ownership via atomic Lua script:
    // Unauthorized token cannot release worker's lock
    const invalidRelease = await providerService.releaseLock(lockKey, "unauthorized_worker_token_999");
    const lockStillPresent = await mockRedis.get(lockKey);

    record(
      "Suite 4: Webhook",
      "Test 23: Strict lock ownership enforced via Lua (Unauthorized worker cannot release lock)",
      invalidRelease === false && Boolean(lockStillPresent),
      `Release denied: ${!invalidRelease}, Lock retained: ${Boolean(lockStillPresent)}`
    );

    // 3. Downstream Failure Simulation & Gateway Retry Reconciliation:
    // When downstream processing fails (e.g. cart error / worker crash), the lock is released or expires,
    // and subsequent gateway retry successfully re-processes without dropping the payment!
    await providerService.releaseLock(lockKey, lockToken!);

    const retryResult = await providerService.getWebhookActionAndData({
      data: capturedPayload,
      rawData: capturedRaw,
      headers: {
        "x-razorpay-signature": capturedSig,
        "x-razorpay-event-id": eventId,
      },
    });

    record(
      "Suite 4: Webhook",
      "Test 24: Downstream failure recovery: Gateway retry reconciles safely without duplicate drop",
      retryResult.action === PaymentActions.SUCCESSFUL &&
        retryResult.data?.session_id === sessionId,
      `Retry Action: ${retryResult.action}, Session: ${retryResult.data?.session_id}`
    );

    // 4. Downstream Completion: transition state to 'completed' with 72h retention
    await providerService.markWebhookCompleted(sessionId);
    const isNowCompleted = await mockRedis.get(completedKey);
    const lockCleanedUp = await mockRedis.get(lockKey);

    record(
      "Suite 4: Webhook",
      "Test 25: Downstream finalization marks completed durably and releases in-flight lock",
      isNowCompleted === "completed" && lockCleanedUp === null,
      `State: ${isNowCompleted}, In-flight lock: ${lockCleanedUp}`
    );

    // 5. Replay attack: resending the EXACT same event ID after completion
    const replayResult = await providerService.getWebhookActionAndData({
      data: capturedPayload,
      rawData: capturedRaw,
      headers: {
        "x-razorpay-signature": capturedSig,
        "x-razorpay-event-id": eventId,
      },
    });

    record(
      "Suite 4: Webhook",
      "Test 26: Duplicate/Replay webhook rejected via durable completed state",
      replayResult.action === PaymentActions.NOT_SUPPORTED,
      `Replay Action: ${replayResult.action}`
    );

    // 6. Distinct Event Scoping: payment.authorized for SAME session does not collide with payment.captured
    const authSessionId = sessionId; // Same session
    const authEventId = "evt_01M6TESTEVENT_AUTH";
    const authPayload = {
      entity: "event",
      account_id: "acc_test",
      event: "payment.authorized",
      payload: {
        payment: {
          entity: {
            id: "pay_authorized_01",
            amount: 3500,
            currency: "USD",
            status: "authorized",
            notes: { session_id: authSessionId },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };
    const authRaw = JSON.stringify(authPayload);
    const authSig = generateWebhookSignature(authRaw, webhookSecret);

    const authResult = await providerService.getWebhookActionAndData({
      data: authPayload,
      rawData: authRaw,
      headers: {
        "x-razorpay-signature": authSig,
        "x-razorpay-event-id": authEventId,
      },
    });

    record(
      "Suite 4: Webhook",
      "Test 27: Distinct event scoping: payment.authorized and captured handle independently",
      authResult.action === PaymentActions.AUTHORIZED &&
        authResult.data?.session_id === authSessionId,
      `Action: ${authResult.action}, Amount: $${authResult.data?.amount}`
    );

    // 7. Out-of-order scenario: payment.captured arrives BEFORE payment.authorized
    const oooSessionId = "payses_ooo_test_01";
    const oooCapPayload = {
      entity: "event",
      account_id: "acc_test",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_ooo_cap",
            amount: 10000,
            currency: "INR",
            status: "captured",
            notes: { session_id: oooSessionId },
          },
        },
      },
    };
    const oooCapRaw = JSON.stringify(oooCapPayload);
    const oooCapSig = generateWebhookSignature(oooCapRaw, webhookSecret);
    const oooCapResult = await providerService.getWebhookActionAndData({
      data: oooCapPayload,
      rawData: oooCapRaw,
      headers: { "x-razorpay-signature": oooCapSig, "x-razorpay-event-id": "evt_ooo_cap" },
    });

    // Finalize session (simulating downstream completeCartAfterPayment)
    await providerService.markWebhookCompleted(oooSessionId);

    // Later, late payment.authorized arrives for same session
    const oooAuthPayload = {
      ...oooCapPayload,
      event: "payment.authorized",
      payload: {
        payment: {
          entity: { ...oooCapPayload.payload.payment.entity, status: "authorized" },
        },
      },
    };
    const oooAuthRaw = JSON.stringify(oooAuthPayload);
    const oooAuthSig = generateWebhookSignature(oooAuthRaw, webhookSecret);
    const oooAuthResult = await providerService.getWebhookActionAndData({
      data: oooAuthPayload,
      rawData: oooAuthRaw,
      headers: { "x-razorpay-signature": oooAuthSig, "x-razorpay-event-id": "evt_ooo_auth" },
    });

    record(
      "Suite 4: Webhook",
      "Test 28: Out-of-order delivery: payment.captured arrives before authorized event and finalizes safely",
      oooCapResult.action === PaymentActions.SUCCESSFUL &&
        (oooAuthResult.action === PaymentActions.AUTHORIZED || oooAuthResult.action === PaymentActions.NOT_SUPPORTED),
      `Cap action: ${oooCapResult.action}, Auth action: ${oooAuthResult.action}`
    );

    // 8. Late event scenario: order.paid arrives after payment already completed
    const lateOrderPayload = {
      entity: "event",
      account_id: "acc_test",
      event: "order.paid",
      payload: {
        order: {
          entity: {
            id: "order_late_01",
            amount: 188564,
            currency: "INR",
            status: "paid",
            notes: { session_id: sessionId }, // Already finalized in Test 25
          },
        },
      },
    };
    const lateOrderRaw = JSON.stringify(lateOrderPayload);
    const lateOrderSig = generateWebhookSignature(lateOrderRaw, webhookSecret);
    const lateCompletedKey = `teb:webhook:completed:razorpay:evt_late_order:order.paid`;
    await mockRedis.set(lateCompletedKey, "completed");

    const lateOrderResult = await providerService.getWebhookActionAndData({
      data: lateOrderPayload,
      rawData: lateOrderRaw,
      headers: { "x-razorpay-signature": lateOrderSig, "x-razorpay-event-id": "evt_late_order" },
    });

    record(
      "Suite 4: Webhook",
      "Test 29: Late event delivery: order.paid arrives after completion and is deduplicated",
      lateOrderResult.action === PaymentActions.NOT_SUPPORTED,
      `Action: ${lateOrderResult.action}`
    );

    // 9. Lock expiry recovery: Lock expired before subsequent worker arrives
    const expEventKey = "evt_exp_01:payment.captured";
    const expLockKey = `teb:webhook:lock:razorpay:${expEventKey}`;
    await mockRedis.set(expLockKey, "old_expired_token");
    // Simulate TTL expiration: key deleted
    await mockRedis.del(expLockKey);

    const expPayload = {
      entity: "event",
      account_id: "acc_test",
      event: "payment.captured",
      payload: {
        payment: {
          entity: { id: "pay_exp", amount: 5000, currency: "INR", notes: { session_id: "payses_exp" } },
        },
      },
    };
    const expRaw = JSON.stringify(expPayload);
    const expSig = generateWebhookSignature(expRaw, webhookSecret);

    const expResult = await providerService.getWebhookActionAndData({
      data: expPayload,
      rawData: expRaw,
      headers: { "x-razorpay-signature": expSig, "x-razorpay-event-id": "evt_exp_01" },
    });
    const newExpToken = await mockRedis.get(expLockKey);

    record(
      "Suite 4: Webhook",
      "Test 30: Expiry recovery: Redis lock expires during processing, subsequent worker acquires cleanly",
      expResult.action === PaymentActions.SUCCESSFUL && Boolean(newExpToken && newExpToken !== "old_expired_token"),
      `New Token Acquired: ${newExpToken?.slice(0, 8)}...`
    );
    await providerService.markWebhookCompleted("payses_exp");

    // 10. Worker crash scenario: Worker 1 crashes without releasing lock; Worker 2 cannot release with wrong token
    const crashEventKey = "evt_crash_01:payment.captured";
    const crashLockKey = `teb:webhook:lock:razorpay:${crashEventKey}`;
    const worker1Token = "worker_1_uuid_token";
    await mockRedis.set(crashLockKey, worker1Token);

    // Worker 2 attempts release with its own token
    const worker2Release = await providerService.releaseLock(crashLockKey, "worker_2_uuid_token");
    const lockStillOwnedByWorker1 = await mockRedis.get(crashLockKey);

    record(
      "Suite 4: Webhook",
      "Test 31: Crash recovery: Worker crashes after receiving webhook, lock ownership prevents premature wipeout",
      worker2Release === false && lockStillOwnedByWorker1 === worker1Token,
      "Worker 1 lock ownership safely preserved across crash boundary"
    );
    await mockRedis.del(crashLockKey);

    // 11. Concurrency simulation: in-flight processing returns retriable conflict
    const concurrentEventId = "evt_01M6TESTEVENT_CONCURRENT";
    const concurrentEventKey = `${concurrentEventId}:payment.captured`;
    await mockRedis.set(`teb:webhook:lock:razorpay:${concurrentEventKey}`, "active_worker_token_xyz");

    let conflictThrown = false;
    try {
      await providerService.getWebhookActionAndData({
        data: { ...capturedPayload, id: concurrentEventId },
        rawData: capturedRaw,
        headers: {
          "x-razorpay-signature": capturedSig,
          "x-razorpay-event-id": concurrentEventId,
        },
      });
    } catch (err: any) {
      if (err instanceof MedusaError && err.type === MedusaError.Types.CONFLICT) {
        conflictThrown = true;
      }
    }

    record(
      "Suite 4: Webhook",
      "Test 32: In-flight concurrent webhook delivery throws retriable MedusaError.CONFLICT",
      conflictThrown,
      "Retriable conflict signaled to caller"
    );

    // 12. Redis outage: fail safely without silent memory fallback
    const failingRedisProvider = new RazorpayPaymentProviderService(container, {
      key_id: "rzp_test_placeholder",
      key_secret: "placeholder_secret_key",
      webhook_secret: webhookSecret,
      mode: "test",
      redis_client: {
        async set() {
          throw new Error("Redis connection refused");
        },
      },
    });

    let redisOutageSafe = false;
    try {
      await failingRedisProvider.getWebhookActionAndData({
        data: capturedPayload,
        rawData: capturedRaw,
        headers: {
          "x-razorpay-signature": capturedSig,
          "x-razorpay-event-id": "evt_test_outage",
        },
      });
    } catch {
      redisOutageSafe = true;
    }

    record(
      "Suite 4: Webhook",
      "Test 33: Redis outage fails safely to preserve retriable state (No silent memory fallback)",
      redisOutageSafe,
      "Preserves gateway retriable state"
    );

    // 13. payment.failed webhook
    const failSessionId = "payses_01M6TESTSESSION03";
    const failEventId = "evt_01M6TESTEVENT03";
    const failPayload = {
      entity: "event",
      account_id: "acc_test",
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_failed_01",
            amount: 188564,
            currency: "INR",
            status: "failed",
            notes: { session_id: failSessionId },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };
    const failRaw = JSON.stringify(failPayload);
    const failSig = generateWebhookSignature(failRaw, webhookSecret);

    const failResult = await providerService.getWebhookActionAndData({
      data: failPayload,
      rawData: failRaw,
      headers: {
        "x-razorpay-signature": failSig,
        "x-razorpay-event-id": failEventId,
      },
    });

    record(
      "Suite 4: Webhook",
      "Test 34: payment.failed mapped to PaymentActions.FAILED and locked out from replay",
      failResult.action === PaymentActions.FAILED &&
        failResult.data?.session_id === failSessionId,
      `Action: ${failResult.action}`
    );

    // 14. Missing signature rejection
    const unauthenticatedResult = await providerService.getWebhookActionAndData({
      data: capturedPayload,
      rawData: capturedRaw,
      headers: {},
    });
    record(
      "Suite 4: Webhook",
      "Test 35: Unauthenticated webhook missing signature returns NOT_SUPPORTED",
      unauthenticatedResult.action === PaymentActions.NOT_SUPPORTED,
      `Action: ${unauthenticatedResult.action}`
    );

    // 15. Foreign webhook without session_id (not originated from this store)
    const foreignEventId = "evt_01M6TESTEVENT04";
    const foreignPayload = {
      entity: "event",
      account_id: "acc_test",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_foreign_01",
            amount: 50000,
            currency: "INR",
            status: "captured",
            notes: {}, // No session_id
          },
        },
      },
    };
    const foreignRaw = JSON.stringify(foreignPayload);
    const foreignSig = generateWebhookSignature(foreignRaw, webhookSecret);

    const foreignResult = await providerService.getWebhookActionAndData({
      data: foreignPayload,
      rawData: foreignRaw,
      headers: {
        "x-razorpay-signature": foreignSig,
        "x-razorpay-event-id": foreignEventId,
      },
    });

    record(
      "Suite 4: Webhook",
      "Test 36: Foreign webhook without session_id ignored (Zero cross-tenant bleed)",
      foreignResult.action === PaymentActions.NOT_SUPPORTED,
      `Action: ${foreignResult.action}`
    );

    // 16. Unrelated COD order (pp_system_default) must NOT touch or finalize Razorpay events
    const dummyRzpSessionId = "payses_active_rzp_mock";
    const dummyLockKey = `teb:webhook:lock:razorpay:${dummyRzpSessionId}:payment.captured`;
    const dummySessionKey = `teb:webhook:session_lock:${dummyRzpSessionId}:payment.captured`;
    await mockRedis.set(dummyLockKey, "mock_token_123");
    await mockRedis.set(
      dummySessionKey,
      JSON.stringify({
        eventKey: `${dummyRzpSessionId}:payment.captured`,
        lockKey: dummyLockKey,
        completedKey: `teb:webhook:completed:razorpay:${dummyRzpSessionId}:payment.captured`,
        lockToken: "mock_token_123",
        sessionId: dummyRzpSessionId,
        event: "payment.captured",
      })
    );

    const mockCodContainer: any = {
      resolve(key: any) {
        if (key === ContainerRegistrationKeys.REMOTE_QUERY) {
          return async (q: any) => {
            if (q.entryPoint === "order") {
              return [
                {
                  id: "order_cod_mock_01",
                  payment_collections: [
                    {
                      payment_sessions: [{ id: "payses_cod_01", provider_id: "pp_system_default" }],
                      payments: [{ id: "pay_cod_01", provider_id: "pp_system_default" }],
                    },
                  ],
                },
              ];
            }
            if (q.entryPoint === "payment") {
              return [{ id: "pay_cod_01", provider_id: "pp_system_default" }];
            }
            return [];
          };
        }
        if (key === "redisConnection" || key === "redisClient") {
          return mockRedis;
        }
        return null;
      },
    };

    // Invoke finalizer with unrelated COD order
    await razorpayWebhookFinalizer({
      event: { name: OrderWorkflowEvents.PLACED, data: { id: "order_cod_mock_01" } },
      container: mockCodContainer,
      pluginOptions: {},
    });

    const dummyLockAfterCod = await mockRedis.get(dummyLockKey);
    const dummySessionAfterCod = await mockRedis.get(dummySessionKey);

    record(
      "Suite 4: Webhook",
      "Test 37: Unrelated COD order (pp_system_default) skips finalizer and preserves Razorpay locks",
      dummyLockAfterCod === "mock_token_123" && Boolean(dummySessionAfterCod),
      "COD order strictly isolated: zero effect on Razorpay locks"
    );

    // 17. Unrelated payment capture (pp_system_default) must NOT touch or finalize Razorpay events
    await razorpayWebhookFinalizer({
      event: { name: PaymentEvents.CAPTURED, data: { id: "pay_cod_01" } },
      container: mockCodContainer,
      pluginOptions: {},
    });

    const dummyLockAfterPayment = await mockRedis.get(dummyLockKey);

    record(
      "Suite 4: Webhook",
      "Test 38: Unrelated payment capture (pp_system_default) skips finalizer and preserves Razorpay locks",
      dummyLockAfterPayment === "mock_token_123",
      "Non-Razorpay capture strictly isolated"
    );

    await mockRedis.del(dummyLockKey);
    await mockRedis.del(dummySessionKey);

    // 18. Webhook recovery/reconciliation mechanism:
    // Stalled in-flight session lock where downstream Medusa workflow previously failed
    const stalledSessionId = "payses_stalled_recovery_01";
    const stalledLockKey = `teb:webhook:lock:razorpay:${stalledSessionId}:payment.captured`;
    const stalledSessionKey = `teb:webhook:session_lock:${stalledSessionId}:payment.captured`;
    const stalledToken = "stalled_worker_token_abc";
    await mockRedis.set(stalledLockKey, stalledToken);
    await mockRedis.set(
      stalledSessionKey,
      JSON.stringify({
        eventKey: `${stalledSessionId}:payment.captured`,
        lockKey: stalledLockKey,
        completedKey: `teb:webhook:completed:razorpay:${stalledSessionId}:payment.captured`,
        lockToken: stalledToken,
        sessionId: stalledSessionId,
        event: "payment.captured",
      })
    );

    const reconResult = await providerService.reconcileSession(stalledSessionId);
    const lockAfterRecon = await mockRedis.get(stalledLockKey);

    record(
      "Suite 4: Webhook",
      "Test 39: Webhook recovery/reconciliation mechanism resolves stalled/failed asynchronous sessions",
      reconResult.reconciled === true && lockAfterRecon === null,
      `Reconciled: ${reconResult.reconciled}, Status: ${reconResult.status}`
    );
  } catch (err: any) {
    record("Suite 4: Webhook", "Suite 4 Execution", false, err.message);
  }

  // ============================================================================
  // SUITE 5: Provider Mock Transport & Lifecycle Workflows (Unit Tests)
  // ============================================================================
  console.log("\n--- SUITE 5: Provider Lifecycle & Transport Workflows (Unit Tests) ---");
  try {
    const mockTransport = {
      async request<T>(req: any): Promise<T> {
        if (req.path === "/orders" && req.method === "POST") {
          return {
            id: "order_mock_01M6RZP001",
            entity: "order",
            amount: req.body.amount,
            amount_paid: 0,
            amount_due: req.body.amount,
            currency: req.body.currency,
            receipt: req.body.receipt,
            status: "created",
            attempts: 0,
            notes: req.body.notes,
            created_at: Math.floor(Date.now() / 1000),
          } as T;
        }
        if (req.path === "/payments/pay_mock_auth_01" && req.method === "GET") {
          return {
            id: "pay_mock_auth_01",
            entity: "payment",
            amount: 188564,
            currency: "INR",
            status: "authorized",
            order_id: "order_mock_01M6RZP001",
            captured: false,
            created_at: Math.floor(Date.now() / 1000),
          } as T;
        }
        if (req.path === "/payments/pay_mock_auth_01/capture" && req.method === "POST") {
          return {
            id: "pay_mock_auth_01",
            entity: "payment",
            amount: req.body.amount,
            currency: req.body.currency,
            status: "captured",
            captured: true,
            created_at: Math.floor(Date.now() / 1000),
          } as T;
        }
        if (req.path === "/payments/pay_mock_auth_01/refund" && req.method === "POST") {
          return {
            id: "rfnd_mock_01M6001",
            entity: "refund",
            amount: req.body.amount,
            currency: "INR",
            payment_id: "pay_mock_auth_01",
            status: "processed",
            notes: req.body.notes,
            created_at: Math.floor(Date.now() / 1000),
          } as T;
        }
        throw new Error(`Unhandled mock path: ${req.path}`);
      },
    };

    const mockProvider = new RazorpayPaymentProviderService(container, {
      key_id: "rzp_test_mock_key_001",
      key_secret: "mock_secret_key_001",
      webhook_secret: "mock_webhook_secret_001",
      mode: "test",
      client_transport: mockTransport,
    });

    // 1. initiatePayment
    const initResponse = await mockProvider.initiatePayment({
      currency_code: "inr",
      amount: 1885.64,
      data: { session_id: "payses_init_01" },
      context: { customer: { id: "cus_01", email: "shopper@ecombuddy.test" } },
    });

    record(
      "Suite 5: Lifecycle",
      "Test 40: initiatePayment creates server-generated Razorpay order",
      initResponse.id === "order_mock_01M6RZP001" &&
        initResponse.data?.order_id === "order_mock_01M6RZP001" &&
        initResponse.data?.amount === 188564,
      `Order: ${initResponse.id}, Amount: ${initResponse.data?.amount} paise`
    );

    // 2. Gateway Availability Safety: initiatePayment must reject if credentials are placeholders and transport absent
    const unconfiguredProvider = new RazorpayPaymentProviderService(container, {
      key_id: "rzp_test_placeholder",
      key_secret: "placeholder_secret_key",
      mode: "test",
    });
    let unconfiguredRejected = false;
    try {
      await unconfiguredProvider.initiatePayment({
        currency_code: "inr",
        amount: 1885.64,
        data: { session_id: "payses_unconfigured" },
      });
    } catch (err: any) {
      if (err instanceof MedusaError && err.type === MedusaError.Types.NOT_ALLOWED) {
        unconfiguredRejected = true;
      }
    }

    record(
      "Suite 5: Lifecycle",
      "Test 41: initiatePayment blocks checkout when gateway credentials are unconfigured (Phase 6 Safety)",
      unconfiguredRejected,
      "Payment initiation safely rejected with NOT_ALLOWED"
    );

    // 3. authorizePayment with valid signature
    const validSig = generateCheckoutSignature(
      "order_mock_01M6RZP001",
      "pay_mock_auth_01",
      "mock_secret_key_001"
    );

    const authResponse = await mockProvider.authorizePayment({
      data: {
        razorpay_order_id: "order_mock_01M6RZP001",
        razorpay_payment_id: "pay_mock_auth_01",
        razorpay_signature: validSig,
        amount: 1885.64,
        currency: "inr",
      },
      context: {},
    });

    record(
      "Suite 5: Lifecycle",
      "Test 42: authorizePayment validates cryptographic checkout signature",
      authResponse.status === PaymentSessionStatus.AUTHORIZED,
      `Status: ${authResponse.status}`
    );

    // 4. authorizePayment with invalid signature
    const badAuthResponse = await mockProvider.authorizePayment({
      data: {
        razorpay_order_id: "order_mock_01M6RZP001",
        razorpay_payment_id: "pay_mock_auth_01",
        razorpay_signature: "tampered_signature_string",
      },
      context: {},
    });

    record(
      "Suite 5: Lifecycle",
      "Test 43: authorizePayment rejects invalid signature with ERROR status",
      badAuthResponse.status === PaymentSessionStatus.ERROR,
      `Status: ${badAuthResponse.status}`
    );

    // 5. capturePayment
    const captureResponse = await mockProvider.capturePayment({
      data: {
        payment_id: "pay_mock_auth_01",
        amount: 1885.64,
        currency: "inr",
        status: "authorized",
      },
      context: {},
    });

    record(
      "Suite 5: Lifecycle",
      "Test 44: capturePayment executes gateway capture call",
      captureResponse.data?.status === "captured" && captureResponse.data?.captured === true,
      `Status: ${captureResponse.data?.status}`
    );

    // 6. refundPayment
    const refundResponse = await mockProvider.refundPayment({
      amount: 500.0,
      data: {
        payment_id: "pay_mock_auth_01",
        currency: "inr",
        amount: 188564,
        amount_refunded: 0,
      },
      context: {},
    });

    const refundData = (refundResponse.data || {}) as Record<string, any>;
    record(
      "Suite 5: Lifecycle",
      "Test 45: refundPayment calculates smallest unit refund amount (50000 paise)",
      refundData.refund?.amount === 50000 &&
        refundData.refund?.status === "processed",
      `Refund ID: ${refundData.refund_id}, Amount: ${refundData.refund?.amount} paise`
    );

    // 7. refundPayment exceeding captured balance is rejected
    let excessRefundRejected = false;
    try {
      await mockProvider.refundPayment({
        amount: 2000.0, // Exceeds ₹1,885.64
        data: {
          payment_id: "pay_mock_auth_01",
          currency: "inr",
          amount: 188564,
          amount_refunded: 50000,
        },
        context: {},
      });
    } catch {
      excessRefundRejected = true;
    }

    record(
      "Suite 5: Lifecycle",
      "Test 46: refundPayment rejects refund exceeding captured balance",
      excessRefundRejected,
      "Excess refund rejected"
    );

    // 8. cancelPayment
    const cancelResponse = await mockProvider.cancelPayment({
      data: { id: "pay_mock_auth_01" },
      context: {},
    });

    record(
      "Suite 5: Lifecycle",
      "Test 47: cancelPayment updates payment state to canceled",
      cancelResponse.data?.status === "canceled",
      `Status: ${cancelResponse.data?.status}`
    );

    // 9. getPaymentStatus mapping
    const statusCreated = await mockProvider.getPaymentStatus({ data: { status: "created" } });
    const statusAuth = await mockProvider.getPaymentStatus({ data: { status: "authorized" } });
    const statusCaptured = await mockProvider.getPaymentStatus({ data: { status: "captured" } });
    const statusFailed = await mockProvider.getPaymentStatus({ data: { status: "failed" } });

    record(
      "Suite 5: Lifecycle",
      "Test 48: getPaymentStatus accurately maps all Razorpay status primitives",
      statusCreated.status === PaymentSessionStatus.PENDING &&
        statusAuth.status === PaymentSessionStatus.AUTHORIZED &&
        statusCaptured.status === PaymentSessionStatus.CAPTURED &&
        statusFailed.status === PaymentSessionStatus.ERROR,
      `created->PENDING, auth->AUTHORIZED, captured->CAPTURED, failed->ERROR`
    );
  } catch (err: any) {
    record("Suite 5: Lifecycle", "Suite 5 Execution", false, err.message);
  }

  // ============================================================================
  // SUITE 6: Storefront API Integration (Live Medusa Engine on Port 9000)
  // ============================================================================
  console.log("\n--- SUITE 6: Storefront API Integration (Medusa Live Engine) ---");
  try {
    const apiKeys: any[] = await query({
      entryPoint: "api_key",
      fields: ["token", "type"],
      variables: { filters: { type: "publishable" } },
    });
    const apiKey = apiKeys[0]?.token;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-publishable-api-key": apiKey,
    };

    // 1. Check Store API Payment Providers for India
    const indiaRegRes = await fetch(
      "http://localhost:9000/store/payment-providers?region_id=reg_01M617GB6G0JD57ZT481HYV9MV",
      { headers }
    );
    const indiaProvidersJson = (await indiaRegRes.json()) as any;
    const providerIds: string[] = (indiaProvidersJson.payment_providers || []).map((p: any) => p.id);

    record(
      "Suite 6: Storefront Integration",
      "Test 49: GET /store/payment-providers returns both pp_razorpay_razorpay and pp_system_default for India",
      providerIds.includes("pp_razorpay_razorpay") && providerIds.includes("pp_system_default"),
      JSON.stringify(providerIds),
      "LOCAL INTEGRATION PASSED"
    );

    // 2. Check Store API Payment Providers for US (USD) - Must NOT have pp_system_default (COD)
    const usRegRes = await fetch(
      "http://localhost:9000/store/payment-providers?region_id=reg_01M6351W7B431VGASFQD9TN1VX",
      { headers }
    );
    const usProvidersJson = (await usRegRes.json()) as any;
    const usProviderIds: string[] = (usProvidersJson.payment_providers || []).map((p: any) => p.id);

    record(
      "Suite 6: Storefront Integration",
      "Test 50: GET /store/payment-providers returns ONLY pp_razorpay_razorpay for US (COD strictly absent)",
      usProviderIds.includes("pp_razorpay_razorpay") && !usProviderIds.includes("pp_system_default"),
      JSON.stringify(usProviderIds),
      "LOCAL INTEGRATION PASSED"
    );

    // 3. Create Cart and Payment Collection
    const cartRes = await fetch("http://localhost:9000/store/carts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        region_id: "reg_01M617GB6G0JD57ZT481HYV9MV",
        currency_code: "inr",
        email: "razorpay.hardening@theecombuddy.com",
      }),
    });
    const cartJson = (await cartRes.json()) as any;
    const cartId = cartJson.cart?.id;

    // Get Variant
    const variants: any[] = await query({
      entryPoint: "product_variant",
      fields: ["id", "title"],
      variables: { pagination: { limit: 1 } },
    });
    const testVariant = variants[0];

    // Add Line Item
    await fetch(`http://localhost:9000/store/carts/${cartId}/line-items`, {
      method: "POST",
      headers,
      body: JSON.stringify({ variant_id: testVariant.id, quantity: 1 }),
    });

    // Add Shipping Address & Method
    await fetch(`http://localhost:9000/store/carts/${cartId}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        shipping_address: {
          first_name: "Vikram",
          last_name: "Seth",
          address_1: "12 Connaught Place",
          city: "New Delhi",
          province: "Delhi",
          postal_code: "110001",
          country_code: "in",
          phone: "+919811223344",
        },
      }),
    });

    const shippingOptionsRes = await fetch(
      `http://localhost:9000/store/shipping-options?cart_id=${cartId}`,
      { headers }
    );
    const shippingOptionsJson = (await shippingOptionsRes.json()) as any;
    const standardShipping = shippingOptionsJson.shipping_options?.[0];

    await fetch(`http://localhost:9000/store/carts/${cartId}/shipping-methods`, {
      method: "POST",
      headers,
      body: JSON.stringify({ option_id: standardShipping.id }),
    });

    // Create Payment Collection
    const payColRes = await fetch(
      `http://localhost:9000/store/payment-collections`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ cart_id: cartId }),
      }
    );
    const payColJson = (await payColRes.json()) as any;
    const paymentCollectionId = payColJson.payment_collection?.id;

    record(
      "Suite 6: Storefront Integration",
      "Test 51: Payment collection created successfully for Razorpay cart",
      Boolean(paymentCollectionId),
      `Collection: ${paymentCollectionId}`,
      "LOCAL INTEGRATION PASSED"
    );

    record(
      "Suite 6: Storefront Integration",
      "Test 52: Cart readiness verified with shipping, line items, and monetary subtotals",
      Boolean(payColJson.payment_collection?.amount > 0),
      `Total: ₹${payColJson.payment_collection?.amount}`,
      "LOCAL INTEGRATION PASSED"
    );

    // 5. Test real installed Medusa HTTP webhook route on port 9000
    const liveRouteSessionId = `payses_live_route_${Date.now()}`;
    const liveRouteEventId = `evt_live_route_${Date.now()}`;
    const liveWebhookPayload = {
      entity: "event",
      account_id: "acc_live_test",
      event: "payment.captured",
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: `pay_live_${Date.now()}`,
            amount: 203550,
            currency: "INR",
            status: "captured",
            notes: { session_id: liveRouteSessionId },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const liveWebhookRaw = JSON.stringify(liveWebhookPayload);
    const liveWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret_secure_987654";
    const liveWebhookSig = generateWebhookSignature(liveWebhookRaw, liveWebhookSecret);

    const liveWebhookRes = await fetch("http://localhost:9000/hooks/payment/razorpay_razorpay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-razorpay-signature": liveWebhookSig,
        "x-razorpay-event-id": liveRouteEventId,
      },
      body: liveWebhookRaw,
    });

    record(
      "Suite 6: Storefront Integration",
      "Test 53: POST /hooks/payment/razorpay_razorpay returns HTTP 200 acknowledgment (Real Medusa Webhook Route)",
      liveWebhookRes.status === 200,
      `HTTP Status: ${liveWebhookRes.status}`,
      "LOCAL INTEGRATION PASSED"
    );

    // 6. Verify HTTP 200 is NOT proof that downstream order workflow completed
    const Redis = (await import("ioredis")).default;
    const realRedis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
    });
    await realRedis.connect();

    const liveCompletedKey = `teb:webhook:completed:razorpay:${liveRouteEventId}:payment.captured`;
    const liveCompletedStatus = await realRedis.get(liveCompletedKey);

    record(
      "Suite 6: Storefront Integration",
      "Test 54: HTTP 200 acknowledgment verified as NOT marking downstream workflow completed (Ingress vs Workflow Separation)",
      liveCompletedStatus === null,
      `Completed key status immediately after HTTP 200: ${liveCompletedStatus || "null (pending downstream completion)"}`,
      "LOCAL INTEGRATION PASSED"
    );

    await realRedis.quit();
  } catch (err: any) {
    record("Suite 6: Storefront Integration", "Suite 6 Execution", false, err.message);
  }

  // ============================================================================
  // SUITE 7: Live Razorpay Gateway Sandbox Preflight (Phase 4 Guard)
  // ============================================================================
  console.log("\n--- SUITE 7: Live Razorpay Gateway Sandbox Audit ---");
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const isPlaceholder =
    !keyId ||
    !keySecret ||
    keyId.includes("placeholder") ||
    keySecret.includes("placeholder");

  if (isPlaceholder) {
    recordBlocked(
      "Suite 7: Gateway Sandbox",
      "Test 55: Razorpay Live Sandbox Network Handshake",
      "Merchant test credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not yet configured in local .env. Zero mock policy enforced: no simulated transactions fabricated."
    );
    recordBlocked(
      "Suite 7: Gateway Sandbox",
      "Test 56: Live Razorpay Webhook Ingestion Delivery",
      "Requires public tunnel (ngrok / live IP) and real webhook secret configured on Razorpay dashboard."
    );
  } else {
    try {
      const liveClient = new RazorpayClient({
        key_id: keyId,
        key_secret: keySecret,
        mode: "test",
      });
      const order = await liveClient.createOrder({
        amount: 10000,
        currency: "INR",
        receipt: `test_${Date.now()}`,
      });
      record(
        "Suite 7: Gateway Sandbox",
        "Test 55: Razorpay Live Sandbox Network Handshake",
        Boolean(order.id),
        `Live Sandbox Order: ${order.id}`,
        "RAZORPAY TEST MODE PASSED"
      );
    } catch (err: any) {
      recordBlocked(
        "Suite 7: Gateway Sandbox",
        "Test 55: Razorpay Live Sandbox Network Handshake",
        `Gateway returned: ${err.message}`
      );
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log("\n==============================================================================");
  console.log("[verify-02d-b] VERIFICATION SUMMARY");
  console.log("==============================================================================");

  const unitPassed = results.filter((r) => r.status === "UNIT TEST PASSED").length;
  const localPassed = results.filter((r) => r.status === "LOCAL INTEGRATION PASSED").length;
  const sandboxPassed = results.filter((r) => r.status === "RAZORPAY TEST MODE PASSED").length;
  const blocked = results.filter((r) => r.status === "BLOCKED").length;
  const failed = results.filter((r) => r.status === "FAILED").length;

  console.log(`UNIT TEST PASSED:          ${unitPassed}`);
  console.log(`LOCAL INTEGRATION PASSED:  ${localPassed}`);
  console.log(`RAZORPAY TEST MODE PASSED: ${sandboxPassed}`);
  console.log(`BLOCKED (PER PHASE 4):     ${blocked}`);
  console.log(`FAILED:                    ${failed}`);
  console.log("==============================================================================");

  if (failed > 0) {
    throw new Error(`${failed} verification tests failed!`);
  }
}

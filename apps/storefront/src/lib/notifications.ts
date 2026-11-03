/**
 * Self-Hosted Customer Notification Service
 * Supports per-installation SMTP credentials with fail-closed behavior.
 * When SMTP is not configured, explicitly reports service_unavailable
 * without fabricating email delivery success.
 * When configured, performs real RFC 5321/5322 SMTP delivery via Nodemailer.
 */

import Redis from "ioredis";
import nodemailer from "nodemailer";

export type NotificationType =
  | "CUSTOMER_REGISTERED"
  | "PASSWORD_RESET"
  | "GUEST_RECOVERY"
  | "ORDER_PLACED"
  | "PAYMENT_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "CONTACT_FORM";

export interface NotificationPayload {
  to: string;
  type: NotificationType;
  subject?: string;
  data: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  status: "sent" | "service_unavailable" | "failed";
  error?: string;
  auditId?: string;
  messageId?: string;
}

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redisClient: Redis | null = null;

function getRedis(): Redis | null {
  if (!redisClient) {
    try {
      redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: () => 2000,
      });
    } catch {
      redisClient = null;
    }
  }
  return redisClient;
}

/**
 * Checks if self-hosted mail credentials are configured.
 */
export function isNotificationConfigured(): boolean {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  return Boolean(host && port && user && pass);
}

/**
 * Returns public notification system health status.
 */
export function getNotificationSystemStatus(): {
  configured: boolean;
  provider: string;
  host?: string;
  from?: string;
} {
  const configured = isNotificationConfigured();
  return {
    configured,
    provider: configured ? "Self-Hosted SMTP" : "Unconfigured",
    host: configured ? process.env.SMTP_HOST : undefined,
    from: configured ? (process.env.SMTP_FROM || process.env.SMTP_USER) : undefined,
  };
}

/**
 * Builds email templates with HTML & plain text.
 */
function buildEmailTemplate(type: NotificationType, data: Record<string, any>): {
  subject: string;
  html: string;
  text: string;
} {
  const storeName = data.storeName || "The Ecom Buddy";
  switch (type) {
    case "CUSTOMER_REGISTERED": {
      const name = data.name || "Valued Customer";
      return {
        subject: `Welcome to ${storeName}`,
        text: `Hello ${name},\n\nThank you for creating an account at ${storeName}. You can now manage your delivery addresses, track shipments, and view order history.\n\nBest regards,\n${storeName} Team`,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2>Welcome to ${storeName}!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Thank you for creating an account with us. You can now manage your delivery addresses, track active shipments, and view your order history directly from your account dashboard.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">${storeName} &bull; Independent Self-Hosted E-Commerce</p>
        </div>`,
      };
    }

    case "PASSWORD_RESET": {
      const resetUrl = data.resetUrl || "#";
      return {
        subject: `Password Reset Request - ${storeName}`,
        text: `You recently requested to reset your password for ${storeName}.\n\nClick the link below to set a new password (valid for 15 minutes):\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\n${storeName} Team`,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2>Reset Your Password</h2>
          <p>You recently requested to reset your password for your <strong>${storeName}</strong> account.</p>
          <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a></p>
          <p style="font-size: 13px; color: #64748b;">This link is valid for 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">${storeName} &bull; Security & Account Protection</p>
        </div>`,
      };
    }

    case "GUEST_RECOVERY": {
      const code = data.code || "------";
      const orderId = data.orderId || "";
      return {
        subject: `Your Verification Code for Order ${orderId} - ${storeName}`,
        text: `Your one-time verification code to view order ${orderId} is: ${code}\n\nThis code is valid for 10 minutes.\n\n${storeName} Team`,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2>Order Verification Code</h2>
          <p>Use the 6-digit verification code below to access your order confirmation for <strong>${orderId}</strong>:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; background-color: #f1f5f9; padding: 14px 24px; display: inline-block; border-radius: 8px; color: #0f172a; margin: 15px 0;">
            ${code}
          </div>
          <p style="font-size: 13px; color: #64748b;">This code is valid for 10 minutes and can only be used once.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">${storeName} &bull; Post-Purchase Security</p>
        </div>`,
      };
    }

    case "ORDER_PLACED": {
      const orderId = data.orderId || "";
      const total = data.total || "";
      const isCOD = Boolean(data.isCOD);
      return {
        subject: `Order Confirmation: ${orderId} - ${storeName}`,
        text: `Thank you for your order!\n\nOrder ID: ${orderId}\nTotal: ${total}\nPayment Method: ${isCOD ? "Cash on Delivery (COD)" : "Online Payment"}\n\nWe are preparing your items for dispatch.\n\n${storeName} Team`,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2>Order Confirmed!</h2>
          <p>Thank you for shopping with <strong>${storeName}</strong>. Your order has been placed successfully.</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Order ID:</strong> ${orderId}</p>
            <p style="margin: 4px 0;"><strong>Total Amount:</strong> ${total}</p>
            <p style="margin: 4px 0;"><strong>Payment Method:</strong> ${isCOD ? "Cash on Delivery (Pending Merchant Collection)" : "Online Payment (Confirmed)"}</p>
          </div>
          <p>You will receive another update as soon as your shipment is dispatched.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">${storeName}</p>
        </div>`,
      };
    }

    case "ORDER_SHIPPED": {
      const orderId = data.orderId || "";
      const trackingNumber = data.trackingNumber || "Pending Courier Assignment";
      const carrier = data.carrier || "Standard Carrier";
      return {
        subject: `Your Order ${orderId} Has Shipped! - ${storeName}`,
        text: `Great news! Your order ${orderId} is on its way.\n\nCarrier: ${carrier}\nTracking Number: ${trackingNumber}\n\nTrack your shipment in your account dashboard.\n\n${storeName} Team`,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2>Your Order is on the Way!</h2>
          <p>Your order <strong>${orderId}</strong> has been dispatched from our fulfillment center.</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Carrier:</strong> ${carrier}</p>
            <p style="margin: 4px 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">${storeName}</p>
        </div>`,
      };
    }

    case "CONTACT_FORM": {
      const senderName = data.name || "Store Visitor";
      const senderEmail = data.email || "";
      const inquiryMessage = data.message || "";
      return {
        subject: `New Customer Inquiry from ${senderName}`,
        text: `New contact form submission:\n\nName: ${senderName}\nEmail: ${senderEmail}\n\nMessage:\n${inquiryMessage}`,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2>New Customer Inquiry</h2>
          <p><strong>From:</strong> ${senderName} (&lt;${senderEmail}&gt;)</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap;">
            ${inquiryMessage}
          </div>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">${storeName} Admin Dispatch</p>
        </div>`,
      };
    }

    default:
      return {
        subject: `Notification from ${storeName}`,
        text: `You have received a new notification from ${storeName}.`,
        html: `<p>You have received a new notification from ${storeName}.</p>`,
      };
  }
}

/**
 * Dispatches a customer notification or returns a fail-closed status.
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<NotificationResult> {
  const { to, type, data, subject: customSubject } = payload;
  const configured = isNotificationConfigured();
  const timestamp = new Date().toISOString();
  const auditId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (!configured) {
    // Record audit of blocked dispatch due to unconfigured SMTP provider
    const redis = getRedis();
    if (redis) {
      try {
        await redis.lpush(
          "audit:notifications:blocked",
          JSON.stringify({ auditId, to, type, timestamp, reason: "SMTP_UNCONFIGURED" })
        );
        await redis.ltrim("audit:notifications:blocked", 0, 99);
      } catch {
        // Non-blocking audit
      }
    }

    return {
      success: false,
      status: "service_unavailable",
      error: "Notification provider is not configured for this self-hosted store installation. Configure SMTP credentials in merchant settings.",
      auditId,
    };
  }

  // When SMTP credentials are fully provided:
  try {
    const template = buildEmailTemplate(type, data);
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
    });

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: customSubject || template.subject,
      text: template.text,
      html: template.html,
    });

    const redis = getRedis();
    if (redis) {
      try {
        await redis.lpush(
          "audit:notifications:sent",
          JSON.stringify({ auditId, to, type, messageId: info.messageId, timestamp, status: "DELIVERED" })
        );
        await redis.ltrim("audit:notifications:sent", 0, 99);
      } catch {
        // Non-blocking audit
      }
    }

    return {
      success: true,
      status: "sent",
      auditId,
      messageId: info.messageId,
    };
  } catch (err: any) {
    console.error("[notifications] SMTP transmission error:", err?.message);
    const redis = getRedis();
    if (redis) {
      try {
        await redis.lpush(
          "audit:notifications:failed",
          JSON.stringify({ auditId, to, type, error: err?.message, timestamp, status: "FAILED" })
        );
        await redis.ltrim("audit:notifications:failed", 0, 99);
      } catch {
        // Non-blocking
      }
    }

    return {
      success: false,
      status: "failed",
      error: err?.message || "Failed to dispatch email notification",
      auditId,
    };
  }
}

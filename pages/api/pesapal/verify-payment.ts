// File: pages/api/pesapal/verify-payment.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PesapalV3Helper } from "../../../lib/pesapal";

const PESAPAL_ENV = process.env.PESAPAL_ENV;
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;
const allowedOrigins = [
  "https://kalumaboy-donation-frontend.vercel.app",
  "https://kalumaboy.online",
  "http://localhost:3000",
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const orderTrackingId =
      (req.query.orderTrackingId || req.query.OrderTrackingId) as string;
    const merchantReference =
      (req.query.OrderMerchantReference || req.query.merchantReference) as string;

    if (!orderTrackingId) {
      return res.status(400).json({
        error: "Missing orderTrackingId",
        message: "Order tracking ID is required",
      });
    }

    const pesapal = new PesapalV3Helper(PESAPAL_ENV as "demo" | "live");

    const tokenResponse = await pesapal.getAccessToken(
      PESAPAL_CONSUMER_KEY as string,
      PESAPAL_CONSUMER_SECRET as string
    );

    if (!tokenResponse.token) {
      throw new Error("Failed to get access token");
    }

    // ✅ Get transaction status
    const status = await pesapal.getTransactionStatus(
      orderTrackingId,
      tokenResponse.token
    );

    // ✅ Send result to PHP backend to save
    await fetch("https://share.akisolve.com/kaluma/save-transaction.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        orderTrackingId,
        merchantReference,
        ...status,
      }),
    });

    // 👉 Redirect to frontend receipt page
    return res.redirect(
      302,
      `https://www.kalumaboy.online/receipt/${merchantReference || orderTrackingId}`
    );
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      error: "Payment verification failed",
      message: error.message || "An unexpected error occurred",
    });
  }
}

// File: pages/api/pesapal/create-order.ts

import { NextApiRequest, NextApiResponse } from "next";
import { PesapalV3Helper } from "../../../lib/pesapal"; // adjust import if needed

// Load from env
const PESAPAL_CONSUMER_KEY =
  process.env.PESAPAL_CONSUMER_KEY || "your-demo-key";
const PESAPAL_CONSUMER_SECRET =
  process.env.PESAPAL_CONSUMER_SECRET || "your-demo-secret";
const PESAPAL_ENV = (process.env.PESAPAL_ENV as "demo" | "live") || "demo";
const CALLBACK_URL = process.env.NEXT_PUBLIC_APP_URL + "/api/pesapal/verify-payment";
const IPN_URL = process.env.NEXT_PUBLIC_APP_URL + "/api/pesapal/ipn";

// Optional: set IPN_ID directly once you’ve registered it
let CACHED_IPN_ID = process.env.PESAPAL_IPN_ID || "";

const allowedOrigins = [
  "https://kalumaboy-donation-frontend.vercel.app",
  "https://another-frontend.example.com",
  "http://localhost:3000"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { amount, firstName, lastName, email, phone, description } = req.body;
    console.log("📥 Incoming order request:", req.body);

    if (!amount || !firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        error: "Missing required fields",
        message: "Please provide all required information",
      });
    }

    // Initialize helper
    const pesapal = new PesapalV3Helper(PESAPAL_ENV);

    // Step 1: Access token
    console.log("🔑 Getting access token...");
    const tokenResponse = await pesapal.getAccessToken(
      PESAPAL_CONSUMER_KEY,
      PESAPAL_CONSUMER_SECRET
    );
    console.log("✅ Token response:", tokenResponse);

    if (!tokenResponse.token) {
      throw new Error("Failed to get access token");
    }

    // Step 2: Resolve IPN ID
    let ipnId = CACHED_IPN_ID;
    if (!ipnId) {
      console.log("📡 No cached IPN. Checking existing...");
      const existingIpns = await pesapal.getRegisteredIpn(tokenResponse.token);
      console.log("📡 Existing IPNs:", existingIpns);

      const found = existingIpns.find((ipn: any) => ipn.url === IPN_URL);
      if (found) {
        ipnId = found.ipn_id;
        CACHED_IPN_ID = ipnId;
        console.log("✅ Reusing existing IPN:", ipnId);
      } else {
        console.log("📡 Registering new IPN with URL:", IPN_URL);
        const ipnResponse = await pesapal.getNotificationId(
          tokenResponse.token,
          IPN_URL
        );
        ipnId = ipnResponse.ipn_id;
        CACHED_IPN_ID = ipnId;
        console.log("✅ Registered new IPN:", ipnId);
        console.log("💾 Save this IPN_ID in .env as PESAPAL_IPN_ID=", ipnId);
      }
    }

    // Step 3: Merchant reference
    const merchantReference = `KLB-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Step 4: Build order
    const orderRequest = pesapal.createOrderRequest(
      parseFloat(amount),
      email,
      phone.replace(/\s+/g, ""),
      firstName,
      lastName,
      merchantReference,
      description || "Donation for KalumaBoy Initiative",
      CALLBACK_URL,
      ipnId,
      {
        currency: "KES",
        language: "EN",
        countryCode: "KE",
        city: "Nairobi",
      }
    );

    console.log("📤 Sending order request:", orderRequest);

    // Step 5: Send order
    const orderResponse = await pesapal.getMerchantOrderUrl(
      orderRequest,
      tokenResponse.token
    );

    console.log("✅ Order response:", orderResponse);

    if (!orderResponse.redirect_url) {
      throw new Error(orderResponse.message || "Failed to create payment order");
    }

    return res.status(200).json({
      success: true,
      redirect_url: orderResponse.redirect_url,
      order_tracking_id: orderResponse.order_tracking_id,
      merchant_reference: orderResponse.merchant_reference,
    });
  } catch (error: any) {
    console.error("💥 Create order error:", error);
    return res.status(500).json({
      error: "Payment initialization failed",
      message: error.message || "An unexpected error occurred",
    });
  }
}

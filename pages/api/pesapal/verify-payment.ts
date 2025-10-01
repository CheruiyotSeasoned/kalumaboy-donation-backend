// File: pages/api/pesapal/verify-payment.ts
import { NextApiRequest, NextApiResponse } from "next";
import { PesapalV3Helper } from "../../../lib/pesapal";
import fs from "fs";
import path from "path";

const PESAPAL_ENV = process.env.PESAPAL_ENV;
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

    // ✅ Save result into JSON file
    const filePath = path.join(process.cwd(), "transactions.json");
    let existingData: any[] = [];

    if (fs.existsSync(filePath)) {
      const fileContent = fs.readFileSync(filePath, "utf-8");
      existingData = JSON.parse(fileContent || "[]");
    }

    existingData.push({
      timestamp: new Date().toISOString(),
      orderTrackingId,
      merchantReference,
      ...status,
    });

    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

    // 👉 Redirect to frontend receipt page
    return res.redirect(
      302,
      `http://localhost:8080/receipt/${merchantReference || orderTrackingId}`
    );
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return res.status(500).json({
      error: "Payment verification failed",
      message: error.message || "An unexpected error occurred",
    });
  }
}

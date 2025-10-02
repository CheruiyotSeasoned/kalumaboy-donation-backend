import type { NextApiRequest, NextApiResponse } from "next";

const allowedOrigins = [
  "https://kalumaboy-donation-frontend.vercel.app",
  "https://kalumaboy.online",
  "https://www.kalumaboy.online",
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

  // ✅ Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing receipt id" });
  }

  try {
    const phpRes = await fetch(
      `https://share.akisolve.com/kaluma/get-receipt.php?id=${id}`
    );
    const data = await phpRes.json();

    if (!phpRes.ok) {
      return res.status(phpRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
}

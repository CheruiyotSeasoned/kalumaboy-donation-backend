import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:8080");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing receipt id" });
  }

  const filePath = path.join(process.cwd(), "transactions.json");

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "No transactions found" });
  }

  const allTransactions = JSON.parse(fs.readFileSync(filePath, "utf-8") || "[]");
  const receipt = allTransactions.find(
    (tx: any) => tx.merchantReference === id || tx.orderTrackingId === id
  );

  if (!receipt) return res.status(404).json({ error: "Receipt not found" });

  return res.status(200).json(receipt);
}

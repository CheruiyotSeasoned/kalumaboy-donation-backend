import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing receipt id" });
  }

  try {
    const phpRes = await fetch(`https://share.akisolve.com/kaluma/get-receipt.php?id=${id}`);
    const data = await phpRes.json();

    if (!phpRes.ok) {
      return res.status(phpRes.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}

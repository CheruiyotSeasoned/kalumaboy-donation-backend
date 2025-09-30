// ============================================
// File: pages/api/pesapal/ipn.ts
// IPN Callback Handler
// ============================================

import { NextApiRequest, NextApiResponse } from 'next';
import { PesapalV3Helper } from './pesapal';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Pesapal will send GET or POST request based on your IPN configuration
  try {
    const orderTrackingId = req.method === 'GET' 
      ? req.query.OrderTrackingId 
      : req.body.OrderTrackingId;

    if (!orderTrackingId) {
      return res.status(400).json({ error: 'Missing OrderTrackingId' });
    }

    const pesapal = new PesapalV3Helper(process.env.PESAPAL_ENV as 'demo' | 'live');

    // Get access token
    const tokenResponse = await pesapal.getAccessToken(
      process.env.PESAPAL_CONSUMER_KEY as string,
      process.env.PESAPAL_CONSUMER_SECRET as string
    );

    // Get transaction status
    const status = await pesapal.getTransactionStatus(
      orderTrackingId as string,
      tokenResponse.token
    );

    // TODO: Update your database with the payment status
    console.log('IPN Received:', {
      orderTrackingId,
      status: status.payment_status_description,
      amount: status.amount,
      confirmationCode: status.confirmation_code,
    });

    // Update database
    // await db.orders.update({
    //   where: { orderTrackingId: orderTrackingId as string },
    //   data: {
    //     status: status.payment_status_description,
    //     confirmationCode: status.confirmation_code,
    //     paymentMethod: status.payment_method,
    //     paymentAccount: status.payment_account,
    //     updatedAt: new Date()
    //   }
    // });

    // Send notification email if payment completed
    // if (status.payment_status_description === 'Completed') {
    //   await sendConfirmationEmail(...)
    // }

    return res.status(200).json({ 
      message: 'IPN processed successfully',
      status: status.payment_status_description 
    });

  } catch (error: any) {
    console.error('IPN handler error:', error);
    return res.status(500).json({
      error: 'IPN processing failed',
      message: error.message
    });
  }
}

// ============================================
// File: .env.local (Environment Variables)
// ============================================
/*
PESAPAL_CONSUMER_KEY=qkio1BGGYAXTu2JOfm7XSXNruoZsrqEW
PESAPAL_CONSUMER_SECRET=osGQ364R49cXKeOYSpaOnT++rHs=
PESAPAL_ENV=demo
NEXT_PUBLIC_APP_URL=http://localhost:3000
*/
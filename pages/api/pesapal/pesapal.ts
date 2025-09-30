/**
 * Pesapal V3 API Helper for React/TypeScript
 * 
 * Usage:
 * const pesapal = new PesapalV3Helper('demo'); // or 'live'
 */

interface PesapalConfig {
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
}

interface BillingAddress {
  phone_number: string;
  email_address: string;
  country_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  line_1?: string;
  line_2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  zip_code?: string;
}

interface OrderRequest {
  language: string;
  currency: string;
  amount: number;
  id: string;
  description: string;
  callback_url: string;
  notification_id: string;
  terms_and_conditions_id?: string;
  billing_address: BillingAddress;
}

interface AccessTokenResponse {
  token: string;
  expiryDate: string;
  error?: string;
  message?: string;
}

interface IpnResponse {
  ipn_id: string;
  url: string;
  created_date: string;
  ipn_notification_type: string;
  ipn_status: string;
}

interface OrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
  error?: string;
  message?: string;
}

interface TransactionStatus {
  payment_method: string;
  amount: number;
  created_date: string;
  confirmation_code: string;
  payment_status_description: string;
  description: string;
  message: string;
  payment_account: string;
  call_back_url: string;
  status_code: number;
  merchant_reference: string;
  payment_status_code: string;
  currency: string;
  error?: string;
}

export class PesapalV3Helper {
  private baseUrl: string;

  /**
   * @param api - Either 'demo' or 'live'
   */
  constructor(api: 'demo' | 'live' = 'demo') {
    this.baseUrl = api === 'demo' 
      ? 'https://cybqa.pesapal.com/pesapalv3'
      : 'https://pay.pesapal.com/v3';
  }

  /**
   * Get Access Token
   * @param consumerKey - Register business account on www.pesapal.com or demo.pesapal.com
   * @param consumerSecret - Register business account on www.pesapal.com or demo.pesapal.com
   */
  async getAccessToken(
    consumerKey: string, 
    consumerSecret: string
  ): Promise<AccessTokenResponse> {
    const endpoint = `${this.baseUrl}/api/Auth/RequestToken`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get access token');
      }

      return data;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw error;
    }
  }

  /**
   * Get list of registered IPN URLs
   * @param accessToken - Token from getAccessToken()
   */
  async getRegisteredIpn(accessToken: string): Promise<IpnResponse[]> {
    const endpoint = `${this.baseUrl}/api/URLSetup/GetIpnList`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get registered IPNs');
      }

      return data;
    } catch (error) {
      console.error('Error getting registered IPNs:', error);
      throw error;
    }
  }

  /**
   * Register IPN URL and get notification ID
   * @param accessToken - Token from getAccessToken()
   * @param callbackUrl - Your IPN callback URL
   * @param notificationType - Either 'GET' or 'POST'
   */
  async getNotificationId(
    accessToken: string, 
    callbackUrl: string,
    notificationType: 'GET' | 'POST' = 'GET'
  ): Promise<{ ipn_id: string; url: string }> {
    const endpoint = `${this.baseUrl}/api/URLSetup/RegisterIPN`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ipn_notification_type: notificationType,
          url: callbackUrl,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to register IPN');
      }

      return data;
    } catch (error) {
      console.error('Error registering IPN:', error);
      throw error;
    }
  }

  /**
   * Submit order and get payment URL
   * @param request - Order details
   * @param accessToken - Token from getAccessToken()
   */
  async getMerchantOrderUrl(
    request: OrderRequest, 
    accessToken: string
  ): Promise<OrderResponse> {
    const endpoint = `${this.baseUrl}/api/Transactions/SubmitOrderRequest`;
    
    // Sanitize state and postal codes
    const sanitizedRequest = {
      ...request,
      billing_address: {
        ...request.billing_address,
        state: request.billing_address.state && request.billing_address.state.trim().length > 3 
          ? '' 
          : request.billing_address.state?.trim() || '',
        postal_code: request.billing_address.postal_code && request.billing_address.postal_code.trim().length > 10
          ? ''
          : request.billing_address.postal_code?.trim() || '',
        zip_code: request.billing_address.zip_code && request.billing_address.zip_code.trim().length > 10
          ? ''
          : request.billing_address.zip_code?.trim() || '',
      },
    };
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(sanitizedRequest),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit order');
      }

      return data;
    } catch (error) {
      console.error('Error submitting order:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   * @param orderTrackingId - GUID from getMerchantOrderUrl()
   * @param accessToken - Token from getAccessToken()
   */
  async getTransactionStatus(
    orderTrackingId: string, 
    accessToken: string
  ): Promise<TransactionStatus> {
    const endpoint = `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`;
    
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to get transaction status');
      }

      return data;
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }

  /**
   * Helper method to create a complete order request object
   */
  createOrderRequest(
    amount: number,
    email: string,
    phone: string,
    firstName: string,
    lastName: string,
    merchantReference: string,
    description: string,
    callbackUrl: string,
    notificationId: string,
    options?: {
      middleName?: string;
      currency?: string;
      language?: string;
      countryCode?: string;
      city?: string;
      line1?: string;
      line2?: string;
    }
  ): OrderRequest {
    return {
      id: merchantReference,
      currency: options?.currency || 'KES',
      amount: amount,
      description: description,
      callback_url: callbackUrl,
      notification_id: notificationId,
      language: options?.language || 'en',
      billing_address: {
        email_address: email,
        phone_number: phone,
        country_code: options?.countryCode || 'KE',
        first_name: firstName,
        middle_name: options?.middleName || '',
        last_name: lastName,
        line_1: options?.line1 || '',
        line_2: options?.line2 || '',
        city: options?.city || '',
        state: '',
        postal_code: '',
        zip_code: '',
      },
    };
  }
}

// Example usage in a React component:
/*
const pesapal = new PesapalV3Helper('demo');

// 1. Get access token
const tokenResponse = await pesapal.getAccessToken(
  'your-consumer-key',
  'your-consumer-secret'
);

// 2. Register IPN (if not already registered)
const ipnResponse = await pesapal.getNotificationId(
  tokenResponse.token,
  'https://yoursite.com/ipn-callback'
);

// 3. Create order
const orderRequest = pesapal.createOrderRequest(
  1000, // amount
  'customer@email.com',
  '254712345678',
  'John',
  'Doe',
  'ORDER-123',
  'Donation for KalumaBoy Initiative',
  'https://yoursite.com/payment-callback',
  ipnResponse.ipn_id
);

// 4. Get payment URL
const orderResponse = await pesapal.getMerchantOrderUrl(
  orderRequest,
  tokenResponse.token
);

// 5. Redirect user to payment page
window.location.href = orderResponse.redirect_url;

// 6. Check transaction status (after payment)
const status = await pesapal.getTransactionStatus(
  orderResponse.order_tracking_id,
  tokenResponse.token
);
*/
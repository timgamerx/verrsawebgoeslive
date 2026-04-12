// Secure API client for server-side payment processing
// All secret keys are kept on the server

const API_BASE_URL = "https://www.verrsa.org/api";

// Paystack Functions
export const paystackInitializePayment = async ({
  email,
  amount,
  reference,
  metadata = {},
}: {
  email: string;
  amount: number;
  reference: string;
  metadata?: any;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/paystack-charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, amount, reference, metadata }),
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response from server:", text);
      throw new Error(
        "Server error - please check if API keys are configured in Vercel",
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Payment initialization failed");
    }

    return data;
  } catch (error) {
    console.error("Paystack initialize error:", error);
    throw error;
  }
};

export const paystackVerifyPayment = async (reference: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/paystack-verify?reference=${reference}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Payment verification failed");
    }

    return data;
  } catch (error) {
    console.error("Paystack verify error:", error);
    throw error;
  }
};

// Flutterwave Functions
export const flutterwaveInitializePayment = async ({
  email,
  amount,
  currency = "NGN",
  txRef,
  redirectUrl,
  customerName,
  customerPhone,
  metadata = {},
}: {
  email: string;
  amount: number;
  currency?: string;
  txRef: string;
  redirectUrl?: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: any;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/flutterwave-charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount,
        currency,
        txRef,
        redirectUrl,
        customerName,
        customerPhone,
        metadata,
      }),
    });

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response from server:", text);
      throw new Error(
        "Server error - please check if API keys are configured in Vercel",
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Payment initialization failed");
    }

    return data;
  } catch (error) {
    console.error("Flutterwave initialize error:", error);
    throw error;
  }
};

export const flutterwaveVerifyPayment = async (transactionId: string) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/flutterwave-verify?transactionId=${transactionId}`,
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Payment verification failed");
    }

    return data;
  } catch (error) {
    console.error("Flutterwave verify error:", error);
    throw error;
  }
};

// SendGrid Email Function - Via Supabase Edge Function
// Keeps API key secure on server-side
import { supabase } from "../components/supabase";

export const sendEmail = async ({
  to,
  subject,
  html,
  text,
  from,
}: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}) => {
  try {
    console.log("📧 Sending email via Supabase Edge Function...");
    console.log("To:", to);
    console.log("Subject:", subject);

    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { to, subject, html, text, from },
    });

    if (error) {
      console.error("Supabase function error:", error);
      throw new Error(error.message || "Email send failed");
    }

    console.log("✅ Email sent successfully!");
    return data;
  } catch (error) {
    console.error("❌ Send email error:", error);
    throw error;
  }
};

// Helper to generate payment reference
export const generatePaymentReference = (prefix: string = "VRS") => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${prefix}_${timestamp}_${random}`;
};

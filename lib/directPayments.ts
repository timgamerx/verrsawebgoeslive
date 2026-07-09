/**
 * Direct Payment Integration (Client-Side)
 * Uses payment provider SDKs directly without serverless functions
 */

// Get public keys from environment variables
const PAYSTACK_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
  process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ||
  "";
const FLUTTERWAVE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ||
  process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY ||
  "";

export interface PaymentConfig {
  email: string;
  amount: number;
  currency?: string;
  reference: string;
  metadata?: Record<string, any>;
  onSuccess: (reference: string) => void;
  onCancel: () => void;
  onError: (error: Error) => void;
}

/**
 * Wait for Paystack script to load
 */
const waitForPaystack = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not defined"));
      return;
    }

    console.log("Checking for Paystack...", (window as any).PaystackPop);

    if ((window as any).PaystackPop) {
      console.log("Paystack already loaded");
      resolve();
      return;
    }

    console.log("Loading Paystack script dynamically...");

    // Load script dynamically
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = false;

    script.onload = () => {
      console.log("Paystack script loaded successfully");
      if ((window as any).PaystackPop) {
        resolve();
      } else {
        reject(new Error("Paystack loaded but PaystackPop is undefined"));
      }
    };

    script.onerror = () => {
      console.error("Failed to load Paystack script from CDN");
      reject(
        new Error(
          "Failed to load Paystack script. Please check your internet connection."
        )
      );
    };

    document.head.appendChild(script);
  });
};

/**
 * Wait for Flutterwave script to load
 */
const waitForFlutterwave = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not defined"));
      return;
    }

    console.log(
      "Checking for Flutterwave...",
      (window as any).FlutterwaveCheckout
    );

    if ((window as any).FlutterwaveCheckout) {
      console.log("Flutterwave already loaded");
      resolve();
      return;
    }

    console.log("Loading Flutterwave script dynamically...");

    // Load script dynamically
    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = false;

    script.onload = () => {
      console.log("Flutterwave script loaded successfully");
      if ((window as any).FlutterwaveCheckout) {
        resolve();
      } else {
        reject(
          new Error("Flutterwave loaded but FlutterwaveCheckout is undefined")
        );
      }
    };

    script.onerror = () => {
      console.error("Failed to load Flutterwave script from CDN");
      reject(
        new Error(
          "Failed to load Flutterwave script. Please check your internet connection."
        )
      );
    };

    document.head.appendChild(script);
  });
};

/**
 * Initialize Paystack Payment (Web Only)
 */
export const initializePaystackPayment = async (
  config: PaymentConfig
): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("Paystack inline is only supported in the browser");
  }

  if (!PAYSTACK_PUBLIC_KEY) {
    throw new Error("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not configured");
  }

  try {
    // Wait for Paystack to load
    await waitForPaystack();

    const PaystackPop = (window as any).PaystackPop;

    if (!PaystackPop) {
      throw new Error(
        "Paystack library not loaded. Add script tag to index.html"
      );
    }

    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: config.email,
      amount: Math.round(config.amount * 100), // Convert to kobo
      currency: config.currency || "NGN",
      ref: config.reference,
      metadata: config.metadata || {},
      callback: (response: any) => {
        config.onSuccess(response.reference);
      },
      onClose: () => {
        config.onCancel();
      },
    });

    handler.openIframe();
  } catch (error) {
    config.onError(
      error instanceof Error
        ? error
        : new Error("Payment initialization failed")
    );
  }
};

/**
 * Initialize Flutterwave Payment (Web)
 */
export const initializeFlutterwavePayment = async (
  config: PaymentConfig & { customerName?: string; customerPhone?: string }
): Promise<void> => {
  if (typeof window === "undefined") {
    throw new Error("Flutterwave inline is only supported in the browser");
  }

  if (!FLUTTERWAVE_PUBLIC_KEY) {
    throw new Error(
      "NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY is not configured in environment variables"
    );
  }

  try {
    // Wait for Flutterwave to load
    await waitForFlutterwave();

    const FlutterwaveCheckout = (window as any).FlutterwaveCheckout;

    if (!FlutterwaveCheckout) {
      throw new Error(
        "Flutterwave library not loaded. Add script tag to index.html"
      );
    }

    FlutterwaveCheckout({
      public_key: FLUTTERWAVE_PUBLIC_KEY,
      tx_ref: config.reference,
      amount: config.amount,
      currency: config.currency || "USD",
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: config.email,
        name: config.customerName || config.email,
        phone_number: config.customerPhone || "",
      },
      customizations: {
        title: "Verrsa",
        description: "Payment for Verrsa services",
        logo: "https://www.verrsa.org/assets/verrsa-logo.png",
      },
      meta: config.metadata || {},
      callback: (response: any) => {
        if (response.status === "successful") {
          config.onSuccess(response.tx_ref);
        } else {
          config.onCancel();
        }
      },
      onclose: () => {
        config.onCancel();
      },
    });
  } catch (error) {
    config.onError(
      error instanceof Error
        ? error
        : new Error("Payment initialization failed")
    );
  }
};

/**
 * Verify Paystack Payment
 */
export const verifyPaystackPayment = async (
  reference: string
): Promise<boolean> => {
  try {
    // Call your backend to verify the payment
    // This should be done on the server side for security
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_PUBLIC_KEY}`,
        },
      }
    );

    const data = await response.json();
    return data.status === true && data.data.status === "success";
  } catch (error) {
    console.error("Payment verification failed:", error);
    return false;
  }
};

/**
 * Verify Flutterwave Payment
 */
export const verifyFlutterwavePayment = async (
  transactionId: string
): Promise<boolean> => {
  try {
    // Call your backend to verify the payment
    // This should be done on the server side for security
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_PUBLIC_KEY}`,
        },
      }
    );

    const data = await response.json();
    return (
      data.status === "success" &&
      data.data.status === "successful" &&
      data.data.amount >= 0
    );
  } catch (error) {
    console.error("Payment verification failed:", error);
    return false;
  }
};

/**
 * Check if payment provider is configured
 */
export const isPaystackConfigured = (): boolean => {
  return !!PAYSTACK_PUBLIC_KEY;
};

export const isFlutterwaveConfigured = (): boolean => {
  return !!FLUTTERWAVE_PUBLIC_KEY;
};

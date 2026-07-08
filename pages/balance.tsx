// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoArrowBack, IoCheckmark, IoClose, IoAddCircle, IoInformationCircle, IoArrowDownCircle, IoArrowUpCircle } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import { useTheme } from '../context/ThemeProvider';
// inAppPurchases not available on web - stub for web compatibility
const PRODUCT_IDS: any = {};
const iapService = { initialize: async () => {}, getBalanceTopupProducts: async () => [], purchaseProduct: async () => ({ success: false }) };
import { MdCreditCard, MdAccountBalance, MdHistory } from 'react-icons/md';
// directPayments stub for web - use securePaymentApi instead
const initializePaystackPayment = async (params: any) => ({ success: false, message: 'Use web payment flow' });
const initializeFlutterwavePayment = async (params: any) => ({ success: false, message: 'Use web payment flow' });
const isPaystackConfigured = () => false;
const isFlutterwaveConfigured = () => false;

export default function Balance() {
  const router = useRouter();
    const { theme, colors } = useTheme();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "paystack" | "flutterwave" | "iap" | null
  >(null);
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<{
    [key: string]: number;
  }>({ NGN: 1650 }); // Fallback rate until API loads
  const [iapProducts, setIapProducts] = useState<any[]>([]);
  const [iapLoading, setIapLoading] = useState(false);

  // Initialize IAP and fetch products
  useEffect(() => {
    const initIAP = async () => {
      if (false) {
        setIapLoading(true);
        try {
          await iapService.initialize();
          const products = await iapService.getBalanceTopupProducts();
          setIapProducts(products);
          console.log(`✅ Loaded ${products.length} balance top-up products`);
        } catch (error) {
          console.error("Failed to initialize IAP:", error);
        } finally {
          setIapLoading(false);
        }
      }
    };
    initIAP();
  }, []);

  // Fetch real-time exchange rates
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await response.json();
        if (data && data.rates) {
          setExchangeRates(data.rates);
          console.log("Exchange rates updated:", {
            USD_to_NGN: data.rates.NGN,
          });
        }
      } catch (error) {
        console.warn("Failed to fetch exchange rates, using fallback:", error);
        setExchangeRates({
          NGN: 1650, // Fallback NGN rate
          USD: 1,
        });
      }
    };
    fetchExchangeRates();
  }, []);

  useEffect(() => {
    loadUserData();
    loadBalance();
    loadTransactions();

    // Subscribe to balance updates
    const channel = supabase
      .channel("balance-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_balance",
          filter: `user_id=eq.${currentUser?.id}`,
        },
        () => {
          loadBalance();
          loadTransactions();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Convert USD to NGN for Paystack using real-time rates
  const convertToNGN = (usdAmount: number): number => {
    const rate = exchangeRates.NGN || 1650; // Fallback to 1650 if not loaded
    return Math.round(usdAmount * rate); // Round to nearest Naira
  };

  const loadUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const loadBalance = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_balance")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading balance:", error);
        return;
      }

      if (data) {
        setBalance(parseFloat(data.balance) || 0);
      } else {
        // Create initial balance record
        await supabase.from("user_balance").insert({
          user_id: user.id,
          balance: 0,
        });
        setBalance(0);
      }
    } catch (error) {
      console.error("Error loading balance:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("balance_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setTransactions(data);
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadBalance(), loadTransactions()]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 2) {
      window.alert("Please enter a valid amount (minimum $2)");
      return;
    }

    if (!selectedPaymentMethod && true) {
      window.alert("Please select a payment method (Paystack or Flutterwave)",
      );
      return;
    }

    if (!currentUser) {
      window.alert("User not authenticated");
      return;
    }

    setProcessing(true);

    try {
      if (false) {
        // Check if IAP is ready
        if (iapLoading) {
          window.alert("Loading payment options...");
          setProcessing(false);
          return;
        }

        if (iapProducts.length === 0) {
          window.alert(/* Alert: */ 
            "Error",
            "Payment options not available. Please try again.",
          );
          setProcessing(false);
          return;
        }

        // Map amount to product ID
        let productId: string | null = null;
        if (amount === 2) productId = PRODUCT_IDS.BALANCE_TOPUP_2;
        else if (amount === 5) productId = PRODUCT_IDS.BALANCE_TOPUP_5;
        else if (amount === 10) productId = PRODUCT_IDS.BALANCE_TOPUP_10;
        else if (amount === 25) productId = PRODUCT_IDS.BALANCE_TOPUP_25;
        else if (amount === 50) productId = PRODUCT_IDS.BALANCE_TOPUP_50;
        else if (amount === 100) productId = PRODUCT_IDS.BALANCE_TOPUP_100;

        if (!productId) {
          window.alert(/* Alert: */ 
            "Invalid Amount",
            "Please select a quick amount option ($2, $5, $10, $25, $50, or $100)",
          );
          setProcessing(false);
          return;
        }

        try {
          const result = await iapService.purchaseProduct(productId);
          if (result?.success) {
            // Close the modal — the purchaseUpdatedListener will show the
            // confirmation alert and update the balance once the payment is
            // actually confirmed by the store.
            setShowTopUpModal(false);
            setTopUpAmount("");
          } else if (result?.error && result.error !== "Purchase cancelled") {
            window.alert(result.error);
          }
        } catch (error: any) {
          window.alert(error.message || "Purchase failed");
        }
      } else if (selectedPaymentMethod === "paystack") {
        const email =
          currentUser.email || currentUser.user_metadata?.email || "";
        // Convert USD to NGN for Paystack
        const amountInNGN = convertToNGN(amount);
        console.log(`Converting $${amount} USD to ₦${amountInNGN} NGN`);

        const reference = `topup_${currentUser.id}_${Date.now()}`;

        try {
          await initializePaystackPayment({
            email,
            amount: amountInNGN,
            currency: "NGN",
            reference,
            metadata: {
              type: "balance_topup",
              userId: currentUser.id,
              originalAmountUSD: amount,
            },
            onSuccess: async (paymentReference) => {
              console.log("Payment successful:", paymentReference);
              // Update balance in database
              const { error } = await supabase.rpc("increment_user_balance", {
                user_id: currentUser.id,
                amount_to_add: amount,
              });

              if (!error) {
                setShowTopUpModal(false);
                setTopUpAmount("");
                loadBalance();
                loadTransactions();
                window.alert(/* Alert: */ 
                  "Success",
                  "Your balance has been topped up successfully!",
                );
              } else {
                console.error("Error updating balance:", error);
                window.alert(/* Alert: */ 
                  "Error",
                  "Payment successful but failed to update balance",
                );
              }
            },
            onCancel: () => {
              console.log("Payment cancelled");
              window.alert("Payment was cancelled");
            },
            onError: (error) => {
              console.error("Payment error:", error);
              window.alert(error.message || "Payment failed");
            },
          });
        } catch (error: any) {
          console.error("Paystack payment error:", error);
          window.alert(error.message || "Failed to initialize payment");
        }
      } else if (selectedPaymentMethod === "flutterwave") {
        const email =
          currentUser.email || currentUser.user_metadata?.email || "";
        const name =
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.username ||
          "User";

        const reference = `topup_${currentUser.id}_${Date.now()}`;

        try {
          await initializeFlutterwavePayment({
            email,
            amount,
            currency: "USD",
            reference,
            customerName: name,
            metadata: {
              type: "balance_topup",
              userId: currentUser.id,
            },
            onSuccess: async (paymentReference) => {
              console.log("Payment successful:", paymentReference);
              // Update balance in database
              const { error } = await supabase.rpc("increment_user_balance", {
                user_id: currentUser.id,
                amount_to_add: amount,
              });

              if (!error) {
                setShowTopUpModal(false);
                setTopUpAmount("");
                loadBalance();
                loadTransactions();
                window.alert(/* Alert: */ 
                  "Success",
                  "Your balance has been topped up successfully!",
                );
              } else {
                console.error("Error updating balance:", error);
                window.alert(/* Alert: */ 
                  "Error",
                  "Payment successful but failed to update balance",
                );
              }
            },
            onCancel: () => {
              console.log("Payment cancelled");
              window.alert("Payment was cancelled");
            },
            onError: (error) => {
              console.error("Payment error:", error);
              window.alert(error.message || "Payment failed");
            },
          });
        } catch (error: any) {
          console.error("Flutterwave payment error:", error);
          window.alert(error.message || "Failed to initialize payment");
        }
      }
    } catch (error) {
      console.error("Error processing top-up:", error);
      window.alert("Failed to process payment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const quickAmounts = [2, 5, 10, 25, 50, 100];

  if (loading) {
    return (
      <div
        style={{...(styles.loadingContainer || {}), backgroundColor: theme.background}}
      >
        <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
        <span style={{ marginTop: spacing.md, color: theme.text }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      {/* Header */}
      <div style={{...styles.header, display: "flex"}}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <IoArrowBack size={24} color={theme.icon || "#333"} />
        </button>
        <span style={{...(styles.headerTitle || {}), color: theme.text}}>
          My Balance
        </span>
        <div style={{ width: 24 }} />
      </div>

      <div style={{...(styles.content), overflowY: "auto"}}
      >
        {/* Balance Card */}
        <div style={styles.balanceCard}>
          {/* Background Wallet Icon */}
          <div style={styles.walletBackground}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 7H3C1.9 7 1 7.9 1 9v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 13H3V9h18v11zm-9-1c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM4 4h16v2H4z"/>
            </svg>
          </div>

          {/* Card Content — elevated above decorative background */}
          <div style={styles.balanceCardContent}>
            <span style={styles.balanceLabel}>Available Balance</span>
            <span style={styles.balanceAmount}>${balance.toFixed(2)}</span>
            <button
              style={{...styles.topUpButton, display: "flex"}}
              onClick={() => setShowTopUpModal(true)}
            >
              <IoAddCircle size={20} color="#fff" />
              <span style={styles.topUpButtonText}>Top Up</span>
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div
          style={{...styles.infoCard, display: "flex", backgroundColor: theme.cardBackground}}
        >
          <IoInformationCircle size={20} color="#00BFFF" />
          <span style={{...(styles.infoText || {}), color: theme.secondaryText}}>
            Use your balance to pay for ads, send gifts, sponsor, or donate to
            live streamers
          </span>
        </div>

        {/* Transaction History */}
        <span style={{...(styles.sectionTitle || {}), color: theme.text}}>
          Recent Transactions
        </span>
        {transactions.length === 0 ? (
          <div style={styles.emptyState}>
            <MdHistory size={60} color="#aaa" style={{ opacity: 0.3 }} />
            <span
              style={{...(styles.emptyStateText || {}), color: theme.secondaryText}}
            >
              No transactions yet
            </span>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div
              key={transaction.id}
              style={{...(styles.transactionItem || {}), borderBottomColor: theme.border}}
            >
              <div style={{...styles.transactionIcon, display: "flex"}}>
                {transaction.type === "credit"
                  ? <IoArrowDownCircle size={24} color="#4CAF50" />
                  : <IoArrowUpCircle size={24} color="#FF6B6B" />}
              </div>
              <div style={styles.transactionDetails}>
                <span style={{...(styles.transactionTitle || {}), color: theme.text}}>
                  {transaction.description || transaction.type}
                </span>
                <span
                  style={{...(styles.transactionDate || {}), color: theme.secondaryText}}
                >
                  {new Date(transaction.created_at).toLocaleDateString()} at{" "}
                  {new Date(transaction.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <span
                style={{...(styles.transactionAmount || {}), color:
                      transaction.type === "credit" ? "#4CAF50" : "#FF6B6B",}}
              >
                {transaction.type === "credit" ? "+" : "-"}$
                {parseFloat(transaction.amount).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Top Up Modal */}
      {(showTopUpModal) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setShowTopUpModal(false)}>
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>Top Up Balance</span>
              <button onClick={() => setShowTopUpModal(false)}>
                <IoClose />
              </button>
            </div>

            {/* Quick Amount Buttons */}
            <span style={styles.modalLabel}>Quick Select</span>
            {false && iapLoading && (
              <div style={{ padding: spacing.lg, alignItems: "center" }}>
                <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
                <span style={{ marginTop: spacing.sm, color: "#666", fontSize: fontSize.sm }}>
                  Loading payment options...
                </span>
              </div>
          )}
            <div style={styles.quickAmountsContainer}>
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  style={{...(styles.quickAmountButton || {}), ...(topUpAmount === amount.toString() ? styles.quickAmountButtonActive : {})}}
                  onClick={() => setTopUpAmount(amount.toString())}
                >
                  <span
                    style={{...(styles.quickAmountText || {}), ...(topUpAmount === amount.toString() ? styles.quickAmountTextActive : {})}}
                  >
                    ${amount}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Amount Input */}
            <span style={styles.modalLabel}>Or Enter Amount</span>
            <input
              style={styles.amountInput}
              placeholder="Enter amount"
              placeholderTextColor="#999"
              type="number"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
            />

            {/* Payment Method Selection */}
            {true && (
              <>
                <span style={styles.modalLabel}>Select Payment Method</span>

                <button
                  style={{...(styles.paymentMethodButton || {}), ...(selectedPaymentMethod === "paystack" ? styles.paymentMethodButtonActive : {})}}
                  onClick={() => setSelectedPaymentMethod("paystack")}
                >
                  <div style={{...styles.paymentMethodInfo, display: "flex"}}>
                    <MdCreditCard size={24} color="#00C3F7" />
                    <span style={styles.paymentMethodText}>Paystack</span>
                  </div>
                  {selectedPaymentMethod === "paystack" && (
                    <IoCheckmark size={24} color="#00BFFF" />
                  )}
                </button>

                <button
                  style={{...(styles.paymentMethodButton || {}), ...(selectedPaymentMethod === "flutterwave" ? styles.paymentMethodButtonActive : {})}}
                  onClick={() => setSelectedPaymentMethod("flutterwave")}
                >
                  <div style={{...styles.paymentMethodInfo, display: "flex"}}>
                    <MdAccountBalance size={24} color="#F5A623" />
                    <span style={styles.paymentMethodText}>Flutterwave</span>
                  </div>
                  {selectedPaymentMethod === "flutterwave" && (
                    <IoCheckmark size={24} color="#00BFFF" />
                  )}
                </button>
              </>
            )}

            {/* Confirm Button */}
            <button
              style={{...(styles.confirmButton || {}), ...((
                  !topUpAmount || processing || !selectedPaymentMethod) ?
                  styles.confirmButtonDisabled : {})}}
              onClick={handleTopUp}
              disabled={
                !topUpAmount ||
                processing ||
                (true && !selectedPaymentMethod)
              }
            >
              {processing ? (
                <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
              ) : (
                <span style={styles.confirmButtonText}>
                  Top Up ${parseFloat(topUpAmount || "0").toFixed(2)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
              )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.xl5,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
  },
  balanceCard: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.xl2,
    padding: spacing.xl2,
    alignItems: "center",
    marginBottom: spacing.lg,
    overflow: "hidden",
    position: "relative",
  },
  walletBackground: {
    position: "absolute",
    top: -20,
    right: -10,
    zIndex: 0,
  },
  balanceCardContent: {
    zIndex: 1,
    alignItems: "center",
  },
  balanceLabel: {
    color: "#fff",
    fontSize: fontSize.md,
    marginBottom: spacing.sm,
  },
  balanceAmount: {
    color: "#fff",
    fontSize: 42,
    lineHeight: 52,
    fontWeight: "bold",
    marginBottom: spacing.lg,
  },
  topUpButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  topUpButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.base,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: fontSize.xl2,
    fontWeight: "600",
    marginBottom: spacing.base,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: spacing.xl3,
    paddingBottom: spacing.xl3,
  },
  emptyStateText: {
    fontSize: fontSize.md,
    marginTop: spacing.md,
  },
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    marginRight: spacing.md,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: fontSize.md2,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  transactionDate: {
    fontSize: fontSize.sm,
  },
  transactionAmount: {
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "600",
  },
  modalLabel: {
    fontSize: fontSize.md,
    fontWeight: "500",
    color: "#666",
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  quickAmountsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  quickAmountButton: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  quickAmountButtonActive: {
    borderColor: "#00BFFF",
    backgroundColor: "#E8F8FF",
  },
  quickAmountText: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: "#666",
  },
  quickAmountTextActive: {
    color: "#00BFFF",
    fontWeight: "600",
  },
  amountInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: radius.lg,
    padding: spacing.base,
    fontSize: fontSize.base,
    marginBottom: spacing.md,
  },
  paymentMethodButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: spacing.md,
  },
  paymentMethodButtonActive: {
    borderColor: "#00BFFF",
    backgroundColor: "#E8F8FF",
  },
  paymentMethodInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  paymentMethodText: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: "#333",
  },
  confirmButton: {
    backgroundColor: "#00BFFF",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderRadius: radius.lg,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "600",
  },
};

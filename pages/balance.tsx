// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { spacing, radius, fontSize } from "../lib/theme";
import { supabase } from "../components/supabase";
import { useTheme } from "../context/ThemeProvider";
import {
  IoArrowBack,
  IoAddCircle,
  IoInformationCircle,
  IoArrowDownCircle,
  IoArrowUpCircle,
  IoClose,
  IoCheckmarkCircle,
} from "react-icons/io5";
import { MdCreditCard, MdAccountBalance, MdHistory } from "react-icons/md";

const initializePaystackPayment = async (_params: any) => {
  throw new Error("Paystack web SDK not configured");
};
const initializeFlutterwavePayment = async (_params: any) => {
  throw new Error("Flutterwave web SDK not configured");
};

export default function Balance() {
  const router = useRouter();
  const { theme } = useTheme();

  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"paystack" | "flutterwave" | null>(null);
  const [processing, setProcessing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({ NGN: 1650 });

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => { if (data?.rates) setExchangeRates(data.rates); })
      .catch(() => setExchangeRates({ NGN: 1650, USD: 1 }));
  }, []);

  useEffect(() => {
    loadUserData();
    loadBalance();
    loadTransactions();

    const channel = supabase
      .channel("balance-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_balance" }, () => {
        loadBalance();
        loadTransactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const convertToNGN = (usdAmount: number) =>
    Math.round(usdAmount * (exchangeRates.NGN || 1650));

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
    } catch (e) { console.error("Error loading user data:", e); }
  };

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_balance").select("balance").eq("user_id", user.id).single();

      if (error && error.code !== "PGRST116") { console.error(error); return; }

      if (data) {
        setBalance(parseFloat(data.balance) || 0);
      } else {
        await supabase.from("user_balance").insert({ user_id: user.id, balance: 0 });
        setBalance(0);
      }
    } catch (e) { console.error("Error loading balance:", e); }
    finally { setLoading(false); }
  };

  const loadTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("balance_transactions").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(20);

      if (!error && data) setTransactions(data);
    } catch (e) { console.error("Error loading transactions:", e); }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([loadBalance(), loadTransactions()]); }
    catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 2) { window.alert("Please enter a valid amount (minimum $2)"); return; }
    if (!selectedPaymentMethod) { window.alert("Please select a payment method (Paystack or Flutterwave)"); return; }
    if (!currentUser) { window.alert("User not authenticated"); return; }

    setProcessing(true);
    try {
      const email = currentUser.email || currentUser.user_metadata?.email || "";

      if (selectedPaymentMethod === "paystack") {
        const amountInNGN = convertToNGN(amount);
        const reference = `topup_${currentUser.id}_${Date.now()}`;
        await initializePaystackPayment({
          email, amount: amountInNGN, currency: "NGN", reference,
          metadata: { type: "balance_topup", userId: currentUser.id, originalAmountUSD: amount },
          onSuccess: async (paymentReference: string) => {
            const { error } = await supabase.rpc("increment_user_balance", { user_id: currentUser.id, amount_to_add: amount });
            if (!error) { setShowTopUpModal(false); setTopUpAmount(""); loadBalance(); loadTransactions(); window.alert("Your balance has been topped up successfully!"); }
            else { console.error(error); window.alert("Payment successful but failed to update balance"); }
          },
          onCancel: () => window.alert("Payment was cancelled"),
          onError: (err: any) => window.alert(err?.message || "Payment failed"),
        });
      } else if (selectedPaymentMethod === "flutterwave") {
        const name = currentUser.user_metadata?.full_name || currentUser.user_metadata?.username || "User";
        const reference = `topup_${currentUser.id}_${Date.now()}`;
        await initializeFlutterwavePayment({
          email, amount, currency: "USD", reference, customerName: name,
          metadata: { type: "balance_topup", userId: currentUser.id },
          onSuccess: async (paymentReference: string) => {
            const { error } = await supabase.rpc("increment_user_balance", { user_id: currentUser.id, amount_to_add: amount });
            if (!error) { setShowTopUpModal(false); setTopUpAmount(""); loadBalance(); loadTransactions(); window.alert("Your balance has been topped up successfully!"); }
            else { console.error(error); window.alert("Payment successful but failed to update balance"); }
          },
          onCancel: () => window.alert("Payment was cancelled"),
          onError: (err: any) => window.alert(err?.message || "Payment failed"),
        });
      }
    } catch (e: any) {
      console.error("Error processing top-up:", e);
      window.alert(e?.message || "Failed to process payment. Please try again.");
    } finally { setProcessing(false); }
  };

  const quickAmounts = [2, 5, 10, 25, 50, 100];

  if (loading) {
    return (
      <div style={{ ...s.loadingContainer, backgroundColor: theme.background }}>
        <style>{spinKeyframes}</style>
        <div style={s.spinner} />
        <span style={{ marginTop: spacing.md, color: theme.text }}>Loading...</span>
      </div>
    );
  }

  return (
    <div style={{ ...s.container, backgroundColor: theme.background }}>
      <style>{spinKeyframes}</style>

      {/* Header */}
      <div style={s.header}>
        <button style={s.iconBtn} onClick={() => router.back()}>
          <IoArrowBack size={24} color={theme.icon || "#333"} />
        </button>
        <span style={{ ...s.headerTitle, color: theme.text }}>My Balance</span>
        <div style={{ width: 24 }} />
      </div>

      {/* Scrollable content */}
      <div style={s.content}>

        {/* Balance Card */}
        <div style={s.balanceCard}>
          <div style={s.walletBackground}>
            <svg width="120" height="120" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)">
              <path d="M21 7H3C1.9 7 1 7.9 1 9v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm0 13H3V9h18v11zm-9-1c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM4 4h16v2H4z" />
            </svg>
          </div>
          <div style={s.balanceCardContent}>
            <span style={s.balanceLabel}>Available Balance</span>
            <span style={s.balanceAmount}>${balance.toFixed(2)}</span>
            <button style={s.topUpButton} onClick={() => setShowTopUpModal(true)}>
              <IoAddCircle size={20} color="#fff" />
              <span style={s.topUpButtonText}>Top Up</span>
            </button>
          </div>
        </div>

        {/* Refresh */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: spacing.sm }}>
          <button style={{ ...s.iconBtn, color: "#00BFFF", display: "flex", alignItems: "center", gap: 4, fontSize: fontSize.sm }} onClick={onRefresh} disabled={refreshing}>
            {refreshing ? <div style={{ ...s.spinner, width: 14, height: 14 }} /> : <span>↻</span>}
            <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
        </div>

        {/* Info Card */}
        <div style={{ ...s.infoCard, backgroundColor: theme.cardBackground || "#f0f9ff" }}>
          <IoInformationCircle size={20} color="#00BFFF" />
          <span style={{ ...s.infoText, color: theme.secondaryText || "#666" }}>
            Use your balance to pay for ads, send gifts, sponsor, or donate to live streamers
          </span>
        </div>

        {/* Transaction History */}
        <span style={{ ...s.sectionTitle, color: theme.text }}>Recent Transactions</span>

        {transactions.length === 0 ? (
          <div style={s.emptyState}>
            <MdHistory size={60} color="#aaa" style={{ opacity: 0.3 }} />
            <span style={{ ...s.emptyStateText, color: theme.secondaryText || "#888" }}>No transactions yet</span>
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} style={{ ...s.transactionItem, borderBottomColor: theme.border || "#eee" }}>
              <div style={s.transactionIcon}>
                {tx.type === "credit"
                  ? <IoArrowDownCircle size={24} color="#4CAF50" />
                  : <IoArrowUpCircle size={24} color="#FF6B6B" />}
              </div>
              <div style={s.transactionDetails}>
                <span style={{ ...s.transactionTitle, color: theme.text }}>{tx.description || tx.type}</span>
                <span style={{ ...s.transactionDate, color: theme.secondaryText || "#888" }}>
                  {new Date(tx.created_at).toLocaleDateString()} at{" "}
                  {new Date(tx.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <span style={{ ...s.transactionAmount, color: tx.type === "credit" ? "#4CAF50" : "#FF6B6B" }}>
                {tx.type === "credit" ? "+" : "-"}${parseFloat(tx.amount).toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div style={s.modalOverlay} onClick={() => setShowTopUpModal(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>

            <div style={s.modalHeader}>
              <span style={s.modalTitle}>Top Up Balance</span>
              <button style={s.iconBtn} onClick={() => setShowTopUpModal(false)}>
                <IoClose size={24} color="#333" />
              </button>
            </div>

            <span style={s.modalLabel}>Quick Select</span>
            <div style={s.quickAmountsContainer}>
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  style={{ ...s.quickAmountButton, ...(topUpAmount === String(amt) ? s.quickAmountButtonActive : {}) }}
                  onClick={() => setTopUpAmount(String(amt))}
                >
                  <span style={{ ...s.quickAmountText, ...(topUpAmount === String(amt) ? s.quickAmountTextActive : {}) }}>
                    ${amt}
                  </span>
                </button>
              ))}
            </div>

            <span style={s.modalLabel}>Or Enter Amount</span>
            <input
              style={s.amountInput}
              type="number"
              placeholder="Enter amount"
              min={2}
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
            />

            <span style={s.modalLabel}>Select Payment Method</span>

            <button
              style={{ ...s.paymentMethodButton, ...(selectedPaymentMethod === "paystack" ? s.paymentMethodButtonActive : {}) }}
              onClick={() => setSelectedPaymentMethod("paystack")}
            >
              <div style={s.paymentMethodInfo}>
                <MdCreditCard size={24} color="#00C3F7" />
                <span style={s.paymentMethodText}>Paystack</span>
              </div>
              {selectedPaymentMethod === "paystack" && <IoCheckmarkCircle size={24} color="#00BFFF" />}
            </button>

            <button
              style={{ ...s.paymentMethodButton, ...(selectedPaymentMethod === "flutterwave" ? s.paymentMethodButtonActive : {}) }}
              onClick={() => setSelectedPaymentMethod("flutterwave")}
            >
              <div style={s.paymentMethodInfo}>
                <MdAccountBalance size={24} color="#F5A623" />
                <span style={s.paymentMethodText}>Flutterwave</span>
              </div>
              {selectedPaymentMethod === "flutterwave" && <IoCheckmarkCircle size={24} color="#00BFFF" />}
            </button>

            <button
              style={{ ...s.confirmButton, ...(!topUpAmount || processing || !selectedPaymentMethod ? s.confirmButtonDisabled : {}) }}
              onClick={handleTopUp}
              disabled={!topUpAmount || processing || !selectedPaymentMethod}
            >
              {processing
                ? <div style={{ ...s.spinner, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }} />
                : <span style={s.confirmButtonText}>Top Up ${parseFloat(topUpAmount || "0").toFixed(2)}</span>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const spinKeyframes = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "'Instrument Sans', sans-serif" },
  loadingContainer: { minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: "'Instrument Sans', sans-serif" },
  spinner: { width: 28, height: 28, border: "3px solid #e0e0e0", borderTop: "3px solid #00BFFF", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  header: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: `${spacing.xl5}px ${spacing.lg}px ${spacing.lg}px` },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "600" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" },
  content: { flex: 1, overflowY: "auto", padding: `0 ${spacing.lg}px ${spacing.xl3}px` },
  balanceCard: { backgroundColor: "#00BFFF", borderRadius: radius.xl2, padding: spacing.xl2, display: "flex", flexDirection: "column", alignItems: "center", marginBottom: spacing.lg, overflow: "hidden", position: "relative" },
  walletBackground: { position: "absolute", top: -20, right: -10, transform: "rotate(15deg)", zIndex: 0, pointerEvents: "none" },
  balanceCardContent: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" },
  balanceLabel: { color: "#fff", fontSize: fontSize.md, marginBottom: spacing.sm },
  balanceAmount: { color: "#fff", fontSize: 42, lineHeight: "52px", fontWeight: "bold", marginBottom: spacing.lg },
  topUpButton: { display: "flex", flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: "rgba(255,255,255,0.2)", padding: `${spacing.md}px ${spacing.lg}px`, borderRadius: 9999, border: "none", cursor: "pointer" },
  topUpButtonText: { color: "#fff", fontSize: fontSize.base, fontWeight: "600" },
  infoCard: { display: "flex", flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.base, borderRadius: radius.lg, marginBottom: spacing.lg },
  infoText: { flex: 1, fontSize: fontSize.base, lineHeight: "18px" },
  sectionTitle: { display: "block", fontSize: fontSize.xl2, fontWeight: "600", marginBottom: spacing.base },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", padding: `${spacing.xl3}px 0` },
  emptyStateText: { fontSize: fontSize.md, marginTop: spacing.md },
  transactionItem: { display: "flex", flexDirection: "row", alignItems: "center", padding: `${spacing.base}px 0`, borderBottom: "1px solid #eee" },
  transactionIcon: { marginRight: spacing.md, display: "flex", alignItems: "center" },
  transactionDetails: { flex: 1, display: "flex", flexDirection: "column" },
  transactionTitle: { fontSize: fontSize.md2, fontWeight: "500", marginBottom: spacing.xs },
  transactionDate: { fontSize: fontSize.sm },
  transactionAmount: { fontSize: fontSize.base, fontWeight: "600" },
  modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 1000 },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, width: "100%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto" },
  modalHeader: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { fontSize: fontSize.xl, fontWeight: "600" },
  modalLabel: { display: "block", fontSize: fontSize.md, fontWeight: "500", color: "#666", margin: `${spacing.md}px 0` },
  quickAmountsContainer: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.md },
  quickAmountButton: { padding: `${spacing.md}px ${spacing.lg}px`, borderRadius: radius.lg, border: "1px solid #e0e0e0", backgroundColor: "#f8f9fa", cursor: "pointer" },
  quickAmountButtonActive: { borderColor: "#00BFFF", backgroundColor: "#E8F8FF" },
  quickAmountText: { fontSize: fontSize.base, fontWeight: "500", color: "#666" },
  quickAmountTextActive: { color: "#00BFFF", fontWeight: "600" },
  amountInput: { width: "100%", border: "1px solid #e0e0e0", borderRadius: radius.lg, padding: spacing.base, fontSize: fontSize.base, marginBottom: spacing.md, outline: "none", fontFamily: "'Instrument Sans', sans-serif", boxSizing: "border-box" },
  paymentMethodButton: { display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.base, borderRadius: radius.lg, border: "1px solid #e0e0e0", marginBottom: spacing.md, backgroundColor: "#fff", cursor: "pointer", width: "100%" },
  paymentMethodButtonActive: { borderColor: "#00BFFF", backgroundColor: "#E8F8FF" },
  paymentMethodInfo: { display: "flex", flexDirection: "row", alignItems: "center", gap: spacing.md },
  paymentMethodText: { fontSize: fontSize.base, fontWeight: "500", color: "#333" },
  confirmButton: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", backgroundColor: "#00BFFF", padding: `${spacing.base}px 0`, borderRadius: radius.lg, border: "none", cursor: "pointer", marginTop: spacing.lg },
  confirmButtonDisabled: { opacity: 0.5, cursor: "not-allowed" },
  confirmButtonText: { color: "#fff", fontSize: fontSize.base, fontWeight: "600" },
};

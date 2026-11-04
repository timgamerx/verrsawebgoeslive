// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import { supabase } from "../components/supabase";
import { useTheme } from "../context/ThemeProvider";
import TipForm, { MIN_TIP, MAX_TIP } from "../components/TipForm";
import { spacing, radius } from "../lib/theme";

/** Gift cash from your balance to the creator you are viewing. */
export default function SendTip() {
  const router = useRouter();
  const { theme } = useTheme();
  const q = router.query;
  const userId = typeof q.userId === "string" ? q.userId : "";
  const userName = typeof q.userName === "string" ? q.userName : "";
  const userAvatar = typeof q.userAvatar === "string" ? q.userAvatar : "";

  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }
      const { data } = await supabase
        .from("user_balance")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      setBalance(parseFloat(data?.balance) || 0);
    } catch (e) {
      console.error("Error loading balance:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalance();
  }, []);

  const value = parseFloat(amount);
  const validAmount = !isNaN(value) && value >= MIN_TIP && value <= MAX_TIP;

  const sendTip = async () => {
    setSending(true);
    try {
      const { error } = await supabase.rpc("send_tip", {
        p_recipient_id: userId,
        p_amount: value,
        p_message: message.trim() || null,
      });
      if (error) throw error;
      window.alert(`You gifted $${value.toFixed(2)} to ${userName || "the creator"}.`);
      router.back();
    } catch (e) {
      window.alert(e?.message || "Failed to send tip. Please try again.");
      loadBalance();
    } finally {
      setSending(false);
    }
  };

  const confirmSend = () => {
    if (!validAmount) {
      window.alert(`Enter an amount between $${MIN_TIP} and $${MAX_TIP}.`);
      return;
    }
    if (value > balance) {
      if (window.confirm(`Your balance is $${balance.toFixed(2)}. Would you like to top up?`)) {
        router.push("/balance");
      }
      return;
    }
    if (window.confirm(`Send $${value.toFixed(2)} to ${userName || "this creator"} from your balance?`)) {
      sendTip();
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.background }}>
      <div style={s.header}>
        <button onClick={() => router.back()} style={s.backBtn}>
          <IoArrowBack size={24} color={theme.text} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>Send a Tip</div>
        <div style={s.backBtn} />
      </div>

      <div style={s.content}>
        <div style={s.recipient}>
          <img src={userAvatar || "/avatar.jpg"} alt="" style={s.avatar} />
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: spacing.sm, color: theme.text }}>
            {userName || "Creator"}
          </div>
          <div style={{ fontSize: 14, marginTop: 4, color: theme.secondaryText }}>
            Gift some cash to show your support.
          </div>
        </div>

        <div style={{ ...s.balanceCard, backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <div style={{ color: theme.secondaryText }}>Your balance</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: theme.text }}>
            {loading ? "…" : `$${balance.toFixed(2)}`}
          </div>
        </div>

        <TipForm
          theme={theme}
          amount={amount}
          setAmount={setAmount}
          message={message}
          setMessage={setMessage}
          value={value}
          validAmount={validAmount}
          sending={sending}
          onSend={confirmSend}
        />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: `${spacing.lg}px ${spacing.base}px ${spacing.md}px` },
  backBtn: { width: 40, height: 40, display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: 0 },
  content: { maxWidth: 600, margin: "0 auto", padding: spacing.base, paddingBottom: 60, boxSizing: "border-box" },
  recipient: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 40, objectFit: "cover" },
  balanceCard: { display: "flex", flexDirection: "column", alignItems: "center", padding: spacing.md, borderRadius: radius.md, border: "1px solid", marginBottom: spacing.base },
};

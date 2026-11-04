// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../components/supabase";
import { twoFactorAuth } from "../lib/twoFactorAuth";
import { sendEmail } from "../lib/securePaymentApi";

export const MIN_WITHDRAWAL = 2;

/** Loads the tips the signed-in user received and handles withdrawal (+2FA). */
export const useTips = () => {
  const router = useRouter();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [code, setCode] = useState("");

  const loadTips = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }
      const { data: rows, error } = await supabase
        .from("tips")
        .select("id, sender_id, amount, message, created_at, withdrawn")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const senderIds = [...new Set((rows || []).map((r) => r.sender_id))];
      let senders = {};
      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", senderIds);
        senders = Object.fromEntries((profiles || []).map((p) => [p.id, p]));
      }
      setTips(
        (rows || []).map((r) => ({
          ...r,
          amount: Number(r.amount) || 0,
          sender: senders[r.sender_id] || null,
        })),
      );
    } catch (e) {
      console.error("Error loading tips:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTips();
  }, [loadTips]);

  const total = tips.reduce((sum, t) => sum + t.amount, 0);
  const available = tips
    .filter((t) => !t.withdrawn)
    .reduce((sum, t) => sum + t.amount, 0);

  const submitWithdrawal = async () => {
    setWithdrawing(true);
    try {
      const { data, error } = await supabase.rpc("withdraw_tips");
      if (error) throw error;
      const amount = Number(data?.amount ?? available);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await sendEmail({
          to: "hello@verrsa.org",
          subject: `New Tips Payout Request - $${amount.toFixed(2)} USD`,
          text:
            `A new tips payout request has been submitted.\n\n` +
            `Amount (USD): $${amount.toFixed(2)}\nType: tips_payment\n` +
            `User ID: ${user?.id}\nEmail: ${user?.email || "N/A"}\n` +
            `Withdrawal ID: ${data?.withdrawal_id || "N/A"}\n` +
            `Requested at: ${new Date().toISOString()}\n\n` +
            `Please review in the admin dashboard.`,
        });
      } catch (mailErr) {
        console.warn("Tips payout email failed:", mailErr);
      }
      window.alert("Your payout request has been submitted and will be reviewed shortly.");
      setShow2FA(false);
      setCode("");
      loadTips();
    } catch (e) {
      window.alert(e?.message || "Failed to submit payout request. Please try again.");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleWithdraw = async () => {
    if (available < MIN_WITHDRAWAL) {
      window.alert(
        `The minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)}. You have $${available.toFixed(2)} available.`,
      );
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (!window.confirm(`Withdraw $${available.toFixed(2)} from your tips?`)) return;
    if (await twoFactorAuth.is2FAEnabled(user.id)) setShow2FA(true);
    else submitWithdrawal();
  };

  const verify2FAAndWithdraw = async () => {
    if (code.length !== 6) return window.alert("Please enter a 6-digit code");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Web helper signature is (code, userId)
    const result = await twoFactorAuth.verify2FACode(code, user.id);
    if (!result.success) {
      window.alert(result.error || "The code you entered is incorrect");
      return;
    }
    submitWithdrawal();
  };

  return {
    tips,
    loading,
    total,
    available,
    withdrawing,
    show2FA,
    setShow2FA,
    code,
    setCode,
    handleWithdraw,
    verify2FAAndWithdraw,
  };
};

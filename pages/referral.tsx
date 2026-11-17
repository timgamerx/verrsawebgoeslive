// @ts-nocheck
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { IoArrowBack } from "react-icons/io5";
import { supabase } from "../components/supabase";
import { useTheme } from "../context/ThemeProvider";
import { spacing, radius } from "../lib/theme";

/** User's referral code and the people who signed up with it. */
export default function Referral() {
  const router = useRouter();
  const { theme } = useTheme();
  const [code, setCode] = useState("");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const { data: me } = await supabase.from("profiles").select("referral_code").eq("id", user.id).single();
      setCode(me?.referral_code || "");
      const { data: rows } = await supabase
        .from("referrals").select("referred_user_id, created_at")
        .eq("referrer_id", user.id).order("created_at", { ascending: false });
      const ids = (rows || []).map((r) => r.referred_user_id);
      let profs = {};
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, full_name, username, avatar_url").in("id", ids);
        profs = Object.fromEntries((p || []).map((x) => [x.id, x]));
      }
      setPeople((rows || []).map((r) => ({ ...r, profile: profs[r.referred_user_id] })));
      setLoading(false);
    })();
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: theme.background, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", padding: spacing.base, borderBottom: `1px solid ${theme.border}` }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer" }}>
          <IoArrowBack size={24} color={theme.text} />
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 18, fontWeight: 700 }}>Referral</div>
        <div style={{ width: 32 }} />
      </div>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: spacing.lg }}>
        {loading ? <div>Loading...</div> : (
          <>
            <div style={{ textAlign: "center", padding: spacing.lg, borderRadius: radius.md, border: `1px solid ${theme.border}`, backgroundColor: theme.cardBackground }}>
              <div style={{ color: theme.secondaryText }}>Your referral code</div>
              <div style={{ color: "#00BFFF", fontSize: 28, fontWeight: 700, letterSpacing: 2 }}>{code}</div>
              <button onClick={copy} style={{ marginTop: 12, background: "#00BFFF", color: "#fff", border: "none", borderRadius: 999, padding: "8px 24px", cursor: "pointer" }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <h3 style={{ marginTop: 24 }}>People who signed up ({people.length})</h3>
            {people.length === 0 && <div style={{ color: theme.secondaryText }}>No one has used your code yet.</div>}
            {people.map((p) => (
              <div key={p.referred_user_id} onClick={() => router.push(`/user/${p.referred_user_id}`)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", cursor: "pointer" }}>
                <img src={p.profile?.avatar_url || "/avatar.jpg"} width={40} height={40} style={{ borderRadius: 20, objectFit: "cover" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{p.profile?.full_name || p.profile?.username || "User"}</div>
                  <div style={{ color: theme.secondaryText, fontSize: 13 }}>Joined {new Date(p.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

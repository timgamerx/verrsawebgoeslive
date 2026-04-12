// @ts-nocheck
import React, { useState, useEffect } from "react";
import { IoClose } from "react-icons/io5";
import {
  MdEmail, MdWarning, MdReportProblem, MdGavel,
  MdVisibilityOff, MdCopyright, MdInfo, MdMoreHoriz,
  MdCheckCircle, MdInfoOutline,
} from "react-icons/md";
import { useTheme } from "../context/ThemeProvider";
import { supabase } from "../components/supabase";

type ContentType = "post" | "comment" | "message" | "profile" | "community";
type ViolationType =
  | "spam" | "harassment" | "hate_speech" | "violence"
  | "explicit_content" | "copyright" | "misinformation" | "other";

interface ReportContentModalProps {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  contentType: ContentType;
  reportedUserId: string;
  reporterUserId: string;
}

const VIOLATION_OPTIONS: { type: ViolationType; label: string; Icon: React.ElementType }[] = [
  { type: "spam",             label: "Spam or Misleading",    Icon: MdEmail },
  { type: "harassment",       label: "Harassment or Bullying", Icon: MdWarning },
  { type: "hate_speech",      label: "Hate Speech",            Icon: MdReportProblem },
  { type: "violence",         label: "Violence or Threats",    Icon: MdGavel },
  { type: "explicit_content", label: "Sexual Content",         Icon: MdVisibilityOff },
  { type: "copyright",        label: "Copyright Violation",    Icon: MdCopyright },
  { type: "misinformation",   label: "False Information",      Icon: MdInfo },
  { type: "other",            label: "Other",                  Icon: MdMoreHoriz },
];

async function submitReport(
  reporterUserId: string,
  contentId: string,
  contentType: ContentType,
  reportedUserId: string,
  violationType: ViolationType,
  reason: string,
): Promise<{ success: boolean; message: string }> {
  try {
    if (contentType === "comment") {
      const { data: existing } = await supabase
        .from("reported_comments")
        .select("id")
        .eq("comment_id", contentId)
        .eq("reported_by", reporterUserId)
        .maybeSingle();
      if (existing) return { success: false, message: "You have already reported this comment" };

      const { error } = await supabase.from("reported_comments").insert({
        comment_id: contentId,
        comment_scope: "regular",
        reported_by: reporterUserId,
        reported_user_id: reportedUserId,
        reason: reason || violationType,
        status: "pending",
      });
      if (error) throw error;
      return { success: true, message: "Comment reported successfully" };
    }

    const { data: existing } = await supabase
      .from("reported_posts")
      .select("id")
      .eq("post_id", contentId)
      .eq("reported_by", reporterUserId)
      .maybeSingle();
    if (existing) return { success: false, message: "You have already reported this content" };

    const { error } = await supabase.from("reported_posts").insert({
      post_id: contentId,
      reported_by: reporterUserId,
      reported_user_id: reportedUserId,
      violation_type: violationType,
      reason: reason || violationType,
      status: "pending",
    });
    if (error) throw error;
    return { success: true, message: "Report submitted. Our team will review it shortly." };
  } catch {
    return { success: false, message: "Failed to submit report. Please try again." };
  }
}

export default function ReportContentModal({
  visible,
  onClose,
  contentId,
  contentType,
  reportedUserId,
  reporterUserId,
}: ReportContentModalProps) {
  const { theme } = useTheme();
  const [selectedViolation, setSelectedViolation] = useState<ViolationType | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // slight delay so CSS transition can fire
      requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
    }
  }, [visible]);

  if (!visible) return null;

  const handleClose = () => {
    setSelectedViolation(null);
    setReason("");
    setErrorMsg("");
    setSuccessMsg("");
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedViolation) { setErrorMsg("Please select a violation type"); return; }
    setErrorMsg("");
    setLoading(true);
    const result = await submitReport(
      reporterUserId, contentId, contentType, reportedUserId,
      selectedViolation, reason.trim(),
    );
    setLoading(false);
    if (result.success) {
      setSuccessMsg(result.message);
      setTimeout(() => { handleClose(); }, 1500);
    } else {
      setErrorMsg(result.message);
    }
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        fontFamily: "'Instrument Sans', sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: theme.cardBackground,
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          width: "100%", maxWidth: 600, maxHeight: "90vh",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px", borderBottom: `1px solid ${theme.border}`,
        }}>
          <span style={{ fontSize: 20, fontWeight: "bold", color: theme.text }}>Report Content</span>
          <button
            onClick={handleClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
          >
            <IoClose size={28} color={theme.text} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: 20, overflowY: "auto", flex: 1 }}>
          <p style={{ fontSize: 16, fontWeight: "600", marginBottom: 15, color: theme.text }}>
            What's wrong with this content?
          </p>

          {VIOLATION_OPTIONS.map(({ type, label, Icon }) => {
            const selected = selectedViolation === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedViolation(type)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  width: "100%", padding: 15, borderRadius: 12,
                  border: `1px solid ${selected ? "#00BFFF" : theme.border}`,
                  backgroundColor: selected ? "rgba(0,191,255,0.08)" : "transparent",
                  marginBottom: 10, cursor: "pointer",
                  fontFamily: "'Instrument Sans', sans-serif",
                }}
              >
                <Icon size={22} color={selected ? "#00BFFF" : theme.secondaryText} />
                <span style={{ flex: 1, textAlign: "left", fontSize: 15, color: selected ? "#00BFFF" : theme.text, fontWeight: selected ? "600" : "400" }}>
                  {label}
                </span>
                {selected && <MdCheckCircle size={22} color="#00BFFF" />}
              </button>
            );
          })}

          <p style={{ fontSize: 16, fontWeight: "600", marginTop: 20, marginBottom: 10, color: theme.text }}>
            Additional Details (Optional)
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder="Provide more details about this report (optional)..."
            rows={5}
            style={{
              width: "100%", border: `1px solid ${theme.border}`,
              borderRadius: 12, padding: 15, fontSize: 15,
              color: theme.text, backgroundColor: theme.background,
              resize: "vertical", outline: "none", boxSizing: "border-box",
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          />
          <p style={{ textAlign: "right", fontSize: 12, color: theme.secondaryText, marginTop: 4 }}>
            {reason.length}/500
          </p>

          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            backgroundColor: theme.background, padding: 15, borderRadius: 12, marginTop: 15,
          }}>
            <MdInfoOutline size={20} color={theme.secondaryText} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ flex: 1, fontSize: 13, color: theme.secondaryText, lineHeight: "1.5", margin: 0 }}>
              Your report will be reviewed by our moderation team. False reports may result in action against your account.
            </p>
          </div>

          {errorMsg && (
            <p style={{ color: "#FF3B30", fontSize: 13, marginTop: 12, textAlign: "center" }}>{errorMsg}</p>
          )}
          {successMsg && (
            <p style={{ color: "#34C759", fontSize: 13, marginTop: 12, textAlign: "center" }}>{successMsg}</p>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 10, padding: 20,
          borderTop: `1px solid ${theme.border}`,
        }}>
          <button
            onClick={handleClose}
            style={{
              flex: 1, padding: "15px 0", borderRadius: 25,
              border: `1px solid ${theme.border}`, backgroundColor: "transparent",
              cursor: "pointer", fontSize: 16, color: theme.secondaryText, fontWeight: "600",
              fontFamily: "'Instrument Sans', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedViolation || loading}
            style={{
              flex: 1, padding: "15px 0", borderRadius: 25,
              border: "none", backgroundColor: "#00BFFF",
              cursor: !selectedViolation || loading ? "not-allowed" : "pointer",
              fontSize: 16, color: "#fff", fontWeight: "600",
              opacity: !selectedViolation || loading ? 0.5 : 1,
              fontFamily: "'Instrument Sans', sans-serif",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {loading
              ? <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
              : "Submit Report"
            }
          </button>
        </div>
      </div>
    </div>
  );
}

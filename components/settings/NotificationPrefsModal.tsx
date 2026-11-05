// @ts-nocheck
import React from "react";
import { IoClose } from "react-icons/io5";
import Toggle from "./Toggle";
import { NOTIFICATION_LABELS, DEFAULT_NOTIFICATION_PREFERENCES } from "../../types/notifications";

const CATEGORIES = ["followerActivity", "fomoTriggers", "monetization", "community", "smartTriggers"];

export default function NotificationPrefsModal({ visible, onClose, prefs, onChange, onSave, theme, s }) {
  if (!visible) return null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={{ ...s.sectionHeader, marginBottom: 0 }}>Notification Preferences</div>
          <button style={s.iconBtn} onClick={onClose} aria-label="Close">
            <IoClose size={24} color={theme.text} />
          </button>
        </div>

        {CATEGORIES.map((cat) => {
          const labels = NOTIFICATION_LABELS[cat];
          return (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: theme.text }}>{labels.title}</div>
              <div style={{ ...s.subText, marginBottom: 8 }}>{labels.description}</div>
              {Object.entries(labels.items).map(([key, label]) => (
                <div key={key} style={{ ...s.row, cursor: "default" }}>
                  <div>
                    <span style={s.rowText}>{label}</span>
                    {DEFAULT_NOTIFICATION_PREFERENCES[cat][key] && <span style={s.badge}>Essential</span>}
                  </div>
                  <Toggle value={prefs[cat]?.[key]} onChange={(val) => onChange(cat, key, val)} />
                </div>
              ))}
            </div>
          );
        })}

        <button style={s.primaryBtn} onClick={onSave}>Save Preferences</button>
      </div>
    </div>
  );
}

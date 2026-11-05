// @ts-nocheck
import React from "react";
import Toggle from "./Toggle";

const OPTIONS = [
  ["nearbyContent", "Show nearby content"],
  ["tagLocation", "Tag my location in posts"],
  ["recommendations", "Location-based recommendations"],
];

export default function LocationModal({ visible, options, onToggle, onCancel, onSave, theme, s }) {
  if (!visible) return null;
  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <div style={s.sectionHeader}>Location Services</div>
        <div style={{ ...s.subText, marginBottom: 12 }}>Choose how Verrsa can use your location.</div>
        {OPTIONS.map(([key, label]) => (
          <div key={key} style={{ ...s.row, cursor: "default" }}>
            <span style={s.rowText}>{label}</span>
            <Toggle value={options[key]} onChange={() => onToggle(key)} />
          </div>
        ))}
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button style={s.secondaryBtn} onClick={onCancel}>Cancel</button>
          <button style={{ ...s.primaryBtn, flex: 1 }} onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

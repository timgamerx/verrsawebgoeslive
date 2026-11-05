// @ts-nocheck
import React from "react";
import { IoTrashOutline, IoPhonePortraitOutline } from "react-icons/io5";

const ago = (ts) => {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
};

export default function DevicesSection({ devices, onRemove, theme, s }) {
  return (
    <div style={s.section}>
      <div style={s.sectionHeader}>Your Devices</div>
      <div style={{ ...s.subText, marginBottom: 8 }}>Devices that are signed in to your account</div>
      {devices.length === 0 && <div style={s.subText}>No devices found</div>}
      {devices.map((d) => (
        <div key={d.device_id} style={{ ...s.row, cursor: "default" }}>
          <div style={s.rowLeft}>
            <IoPhonePortraitOutline size={22} color="#777" />
            <div>
              <div style={s.rowText}>
                {d.device_type}
                {d.browser ? ` · ${d.browser}` : ""}
                {d.is_current && (
                  <span style={{ ...s.badge, backgroundColor: "#00BFFF22", padding: "2px 6px", borderRadius: 8 }}>Current</span>
                )}
              </div>
              <div style={s.subText}>
                {d.location || d.ip_address} · Last active {ago(d.last_active)}
              </div>
            </div>
          </div>
          {!d.is_current && (
            <button style={s.iconBtn} onClick={() => onRemove(d.device_id)} aria-label="Remove device">
              <IoTrashOutline size={20} color="#ff4757" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

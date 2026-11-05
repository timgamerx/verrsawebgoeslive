// @ts-nocheck
import React from "react";
import { IoChevronForward } from "react-icons/io5";

// A settings row. Pass `right` for a custom control (e.g. Toggle); otherwise shows a chevron.
export default function SettingRow({ icon, label, sub, value, onClick, right, danger, theme, s }) {
  const clickable = !!onClick;
  const Tag = clickable ? "button" : "div";
  return (
    <>
      <Tag
        style={{ ...s.row, cursor: clickable ? "pointer" : "default" }}
        onClick={onClick}
      >
        <div style={s.rowLeft}>
          {icon}
          <div>
            <div style={{ ...s.rowText, color: danger ? "#ff4757" : theme.text }}>{label}</div>
            {sub && <div style={s.subText}>{sub}</div>}
          </div>
        </div>
        {value && <span style={s.subText}>{value}</span>}
        {right !== undefined ? right : clickable && <IoChevronForward size={18} color="#bbb" />}
      </Tag>
      <div style={s.divider} />
    </>
  );
}

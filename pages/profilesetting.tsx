// @ts-nocheck
import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  IoChevronBack, IoPersonOutline, IoDocumentTextOutline, IoShieldCheckmarkOutline,
  IoPeopleOutline, IoLanguageOutline, IoNotificationsOutline, IoOptionsOutline,
  IoLocationOutline, IoKeyOutline, IoBanOutline, IoTrashBinOutline, IoHelpCircleOutline,
  IoChatbubbleEllipsesOutline, IoCheckmarkCircle, IoTrash,
} from "react-icons/io5";
import { useTheme } from "../context/ThemeProvider";
import { makeSettingStyles } from "../lib/profileSettingStyles";
import { useProfileSettings } from "../hooks/useProfileSettings";
import Toggle from "../components/settings/Toggle";
import SettingRow from "../components/settings/SettingRow";
import DevicesSection from "../components/settings/DevicesSection";
import LocationModal from "../components/settings/LocationModal";
import NotificationPrefsModal from "../components/settings/NotificationPrefsModal";

const ic = (C) => <C size={22} color="#777" />;

export default function ProfileSetting() {
  const router = useRouter();
  const { theme } = useTheme();
  const s = useMemo(() => makeSettingStyles(theme), [theme]);
  const st = useProfileSettings();
  const [locOpen, setLocOpen] = useState(false);
  const [locDraft, setLocDraft] = useState(st.locationOptions);
  const [notifOpen, setNotifOpen] = useState(false);
  const { profile } = st;
  const go = (path) => () => router.push(path);
  const row = (props) => <SettingRow theme={theme} s={s} {...props} />;
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || profile.username || "User";

  const onVerify = () => {
    if (profile.isVerified) return alert("Your account is already verified!");
    if (confirm("This will redirect you to the verification process. Continue?")) router.push("/monetization");
  };

  const onLocationToggle = (val) => {
    if (val) {
      setLocDraft(st.locationOptions);
      setLocOpen(true);
    } else st.disableLocation();
  };

  const saveLocation = async () => {
    if (await st.saveLocationOptions(locDraft)) setLocOpen(false);
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button style={s.iconBtn} onClick={() => router.back()} aria-label="Back">
          <IoChevronBack size={24} color={theme.text} />
        </button>
        <div style={s.title}>Profile</div>
        <div style={{ width: 32 }} />
      </div>

      <div style={s.content}>
        <img
          src={profile.avatar || "/avatar.jpg"}
          alt=""
          style={s.avatar}
          onClick={go("/editprofileinformation")}
          onError={(e) => { e.currentTarget.src = "/avatar.jpg"; }}
        />
        <div style={s.center}>
          <div style={s.name}>
            {fullName}
            {profile.isVerified && <IoCheckmarkCircle size={16} color="#00BFFF" />}
          </div>
          <div style={s.email}>{profile.email}</div>
          <button style={{ ...s.verifyBtn, backgroundColor: profile.isVerified ? "#000" : "#00BFFF" }} onClick={onVerify}>
            {profile.isVerified ? "Verified" : "Get Verified"}
            <IoCheckmarkCircle size={20} color="#fff" />
          </button>
          <div style={{ color: "green", fontSize: 12, marginTop: 12 }}>Online</div>
          {profile.memberSince && <div style={s.subText}>Member since {profile.memberSince}</div>}
        </div>

        <div style={s.section}>
          {row({ icon: ic(IoPersonOutline), label: "Edit Profile Information", onClick: go("/editprofileinformation") })}
          {row({ icon: ic(IoDocumentTextOutline), label: "Terms & Conditions", onClick: go("/terms") })}
          {row({ icon: ic(IoShieldCheckmarkOutline), label: "Privacy Policy", onClick: go("/privacy") })}
          {row({ icon: ic(IoPeopleOutline), label: "Community Guidelines", onClick: go("/community-guidelines") })}
        </div>

        <div style={s.section}>
          <div style={s.sectionHeader}>General Settings</div>
          {row({ icon: ic(IoLanguageOutline), label: "Language", value: "English", right: null })}
        </div>

        <div style={s.section}>
          <div style={s.sectionHeader}>Privacy & Security</div>
          {row({
            icon: ic(IoNotificationsOutline), label: "Push Notifications",
            right: <Toggle value={st.notifications} onChange={st.toggleNotifications} />,
          })}
          {st.notifications && row({
            icon: ic(IoOptionsOutline), label: "Manage Notifications",
            sub: "Customize what you want to be notified about", onClick: () => setNotifOpen(true),
          })}
          {row({
            icon: ic(IoLocationOutline), label: "Location Services",
            right: <Toggle value={st.locationServices} onChange={onLocationToggle} />,
          })}
          {row({ icon: ic(IoKeyOutline), label: "Change Password", onClick: st.changePassword })}
        </div>

        <div style={s.section}>
          {row({ icon: ic(IoBanOutline), label: "Blocked Users", onClick: go("/blockedusers") })}
          {row({ icon: ic(IoBanOutline), label: "Blocked Communities", onClick: go("/blockedcommunities") })}
          {row({ icon: ic(IoTrashBinOutline), label: "Recently Deleted", onClick: go("/recentlydeleted") })}
          {row({ icon: ic(IoHelpCircleOutline), label: "Help & Support", onClick: go("/customersupport") })}
          {st.isSupportAgent && row({
            icon: ic(IoChatbubbleEllipsesOutline), label: "Support Dashboard", onClick: go("/supportagentdashboard"),
          })}
        </div>

        <DevicesSection devices={st.devices} onRemove={st.handleRemoveDevice} theme={theme} s={s} />

        <div style={s.section}>
          {row({
            icon: <IoTrash size={22} color="#ff4757" />,
            label: st.deleting ? "Deleting account..." : "Delete Account",
            danger: true, onClick: st.deleting ? undefined : st.deleteAccount,
          })}
        </div>
      </div>

      <LocationModal
        visible={locOpen}
        options={locDraft}
        onToggle={(k) => setLocDraft((p) => ({ ...p, [k]: !p[k] }))}
        onCancel={() => setLocOpen(false)}
        onSave={saveLocation}
        theme={theme}
        s={s}
      />
      <NotificationPrefsModal
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        prefs={st.notificationPrefs}
        onChange={st.updatePref}
        onSave={async () => { if (await st.savePrefs()) setNotifOpen(false); }}
        theme={theme}
        s={s}
      />
    </div>
  );
}

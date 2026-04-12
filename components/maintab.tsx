// @ts-nocheck

import React from "react";
import { useRouter } from "next/router";
import { IoHomeOutline, IoHome, IoNewspaperOutline, IoNewspaper, IoMicOutline, IoMic, IoVideocamOutline, IoVideocam, IoPeopleOutline, IoPeople } from "react-icons/io5";

const Footer = ({ activeTab, setActiveTab }) => {
  const router = useRouter();
  const tabs = [
    { id: "home", route: "/home", label: "Home", iconOutline: IoHomeOutline, iconFilled: IoHome },
    { id: "articles", route: "/articles", label: "Articles", iconOutline: IoNewspaperOutline, iconFilled: IoNewspaper },
    { id: "podcasts", route: "/Podcasts", label: "Podcasts", iconOutline: IoMicOutline, iconFilled: IoMic },
    { id: "reels", route: "/Reels", label: "Reels", iconOutline: IoVideocamOutline, iconFilled: IoVideocam },
    { id: "community", route: "/Community", label: "Community", iconOutline: IoPeopleOutline, iconFilled: IoPeople },
  ];

  const currentPath = (router.pathname || "").toLowerCase();
  const currentTabFromRoute = tabs.find((tab) => tab.route.toLowerCase() === currentPath)?.id || "home";
  const resolvedActiveTab = activeTab || currentTabFromRoute;

  const handleTabClick = (tab) => {
    if (typeof setActiveTab === "function") {
      setActiveTab(tab.id);
    }
    if (router.pathname !== tab.route) {
      router.push(tab.route);
    }
  };

  const isDark = resolvedActiveTab === "reels" || resolvedActiveTab === "community";

  return (
    <footer style={{ ...styles.footer, backgroundColor: isDark ? "#000" : "#fff", borderTop: isDark ? "1px solid #222" : "1px solid #e0e0e0" }}>
      <div style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = resolvedActiveTab === tab.id;
          const IconComponent = isActive ? tab.iconFilled : tab.iconOutline;
          
          return (
            <div
              key={tab.id}
              style={styles.tabItem}
              onClick={() => handleTabClick(tab)}
            >
              <IconComponent
                size={22}
                color={isActive ? "#00BFFF" : isDark ? "#666" : "#888"}
                style={styles.tabIcon}
              />
              <span
                style={{
                  ...styles.tabLabel,
                  color: isActive ? "#00BFFF" : isDark ? "#666" : "#888",
                }}
              >
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
    </footer>
  );
};

const styles = {
  footer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTop: "1px solid #e0e0e0",
    zIndex: 1000,
    boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)",
  },
  tabBar: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    height: "70px",
    paddingTop: "5px",
    paddingBottom: "15px",
    maxWidth: "600px",
    margin: "0 auto",
  },
  tabItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flex: 1,
    transition: "all 0.2s ease",
    userSelect: "none",
  },
  tabIcon: {
    marginBottom: "4px",
  },
  tabLabel: {
    fontSize: "12px",
    fontFamily: "'Instrument Sans', sans-serif",
    fontWeight: "500",
    transition: "color 0.2s ease",
  },
};

export default Footer;

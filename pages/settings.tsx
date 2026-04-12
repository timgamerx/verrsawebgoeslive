// @ts-nocheck
import React from "react";
import AppText from "../components/AppText";

const Settings = () => {
  return (
    <div style={styles.container}>
      <AppText>Welcome to Settings</AppText>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default Settings;

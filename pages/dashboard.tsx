// @ts-nocheck
import React from "react";

const Dashboard = () => {
  return (
    <div style={styles.container}>
      <span>Welcome to Dashboard</span>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
} as any;

export default Dashboard;

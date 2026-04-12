// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useState, useEffect } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack } from 'react-icons/io5';
import {
  getUserPayments,
  getUserPaymentStats,
  getPaymentsByType,
  getUserSubscriptionPurchases,
} from '../lib/paymentsManager';
import { Payment, SubscriptionPurchase } from "../types/payments";

type CombinedItem =
  | { kind: "payment"; data: Payment; sortDate: number }
  | { kind: "subscription"; data: SubscriptionPurchase; sortDate: number };
import { useTheme } from '../context/ThemeProvider';
import { TbChevronLeft } from 'react-icons/tb'

export default function PaymentHistory() {
  const router = useRouter();
    const { theme, colors } = useTheme();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionPurchase[]>([]);
  const [allItems, setAllItems] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total_payments: 0,
    successful_payments: 0,
    failed_payments: 0,
    total_amount: 0,
    });
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [filterType]);

  const fetchPayments = async () => {
    try {
      setLoading(true);

      if (filterType === "subscription") {
        const subData = await getUserSubscriptionPurchases();
        setSubscriptions(subData);
      } else if (filterType === "all") {
        const [paymentData, subData] = await Promise.all([
          getUserPayments(undefined, 100),
          getUserSubscriptionPurchases(),
        ]);
        setPayments(paymentData);
        setSubscriptions(subData);

        const combined: CombinedItem[] = [
          ...paymentData.map((p) => ({
            kind: "payment" as const,
            data: p,
            sortDate: new Date(p.created_at).getTime(),
          })),
          ...subData.map((s) => ({
            kind: "subscription" as const,
            data: s,
            sortDate: s.purchase_time,
          })),
        ].sort((a, b) => b.sortDate - a.sortDate);

        setAllItems(combined);
      } else {
        const paymentData = await getPaymentsByType(filterType);
        setPayments(paymentData);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await getUserPaymentStats();
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching payment stats:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPayments();
    await fetchStats();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
  const router = useRouter();
    switch (status) {
      case "successful":
        return "#4CAF50";
      case "pending":
        return "#FF9800";
      case "failed":
        return "#F44336";
      case "refunded":
        return "#9C27B0";
      case "cancelled":
        return "#757575";
      default:
        return "#666";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "successful":
        return "checkmark-circle";
      case "pending":
        return "time";
      case "failed":
        return "close-circle";
      case "refunded":
        return "arrow-back-circle";
      case "cancelled":
        return "ban";
      default:
        return "help-circle";
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "subscription":
        return "Subscription";
      case "promoted_post":
        return "Ad Campaign";
      case "boost":
        return "Boost";
      case "tip":
        return "Tip";
      default:
        return "Payment";
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "paystack":
        return "card";
      case "flutterwave":
        return "card-outline";
      case "stripe":
        return "card";
      default:
        return "wallet";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPaymentItem = ({ item }: { item: Payment }) => (
    <button
      style={{...(styles.paymentCard || {}), backgroundColor: theme.cardBackground, borderColor: theme.border}}
    >
      <div style={styles.paymentHeader}>
        <div style={styles.paymentTypeContainer}>
          <IoChevronBack />
          <span style={{...(styles.paymentType || {}), color: theme.text}}>
            {getPaymentTypeLabel(item.payment_type)}
          </span>
        </div>
        <div
          style={{...(styles.statusBadge || {}), backgroundColor: getStatusColor(item.status) + "20"}}
        >
          <IoChevronBack />
          <span
            style={{...(styles.statusText || {}), color: getStatusColor(item.status)}}
          >
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </span>
        </div>
      </div>

      {item.description && (
        <span style={{...(styles.description || {}), color: theme.secondaryText}}>
          {item.description}
        </span>
    )}
      <div style={styles.paymentDetails}>
        <div style={styles.amountContainer}>
          <span style={{...(styles.amount || {}), color: theme.text}}>
            ${item.amount.toFixed(2)} {item.currency}
          </span>
          {item.original_amount && item.original_currency && (
            <span
              style={{...(styles.originalAmount || {}), color: theme.secondaryText}}
            >
              (≈ {item.original_currency}{" "}
              {item.original_amount.toLocaleString()})
            </span>
          )}
        </div>
        <span style={{...(styles.date || {}), color: theme.secondaryText}}>
          {formatDate(item.paid_at || item.created_at)}
        </span>
      </div>

      <div style={styles.referenceContainer}>
        <span style={styles.referenceLabel}>Ref:</span>
        <span style={styles.reference} >
          {item.payment_reference}
        </span>
      </div>
    </button>
  );

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#4CAF50";
      case "expired": return "#F44336";
      case "cancelled": return "#757575";
      default: return "#666";
    }
  };

  const renderSubscriptionItem = ({ item }: { item: SubscriptionPurchase }) => {
    const isActive = item.status === "active";
    const expiresDate = new Date(item.expires_at);
    const isExpired = expiresDate < new Date();
    const effectiveStatus = isActive && isExpired ? "expired" : item.status;
    const statusColor = getSubscriptionStatusColor(effectiveStatus);
    const amount = item.metadata?.amount;
    const currency = item.metadata?.currency;

    return (
      <div
        style={{...(styles.paymentCard || {}), backgroundColor: theme.cardBackground, borderColor: theme.border}}
      >
        <div style={styles.paymentHeader}>
          <div style={styles.paymentTypeContainer}>
            <IoChevronBack />
            <span style={{...(styles.paymentType || {}), color: theme.text}}>
              {item.plan_type.charAt(0).toUpperCase() + item.plan_type.slice(1)} Plan
            </span>
          </div>
          <div
            style={{...(styles.statusBadge || {}), backgroundColor: statusColor + "20"}}
          >
            <IoChevronBack />
            <span style={{...(styles.statusText || {}), color: statusColor}}>
              {effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
            </span>
          </div>
        </div>

        <div style={styles.paymentDetails}>
          <div style={styles.amountContainer}>
            {amount != null && currency ? (
              <span style={{...(styles.amount || {}), color: theme.text}}>
                {currency} {Number(amount).toFixed(2)}
              </span>
            ) : null}
            <span style={{...(styles.description || {}), color: theme.secondaryText, marginBottom: 0}}>
              {item.billing_cycle === "yearly" ? "Annual" : "Monthly"} · {item.platform}
            </span>
          </div>
          <div style={{ alignItems: "flex-end" }}>
            <span style={{...(styles.date || {}), color: theme.secondaryText}}>
              Expires
            </span>
            <span style={{...(styles.date || {}), color: isExpired ? "#F44336" : theme.secondaryText}}>
              {expiresDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>

        <div style={styles.referenceContainer}>
          <span style={styles.referenceLabel}>Order:</span>
          <span style={styles.reference} >
            {item.order_id}
          </span>
        </div>
      </div>
    );
  };

  const renderCombinedItem = ({ item }: { item: CombinedItem }) => {
    if (item.kind === "payment") {
      return renderPaymentItem({ item: item.data });
    }
    return renderSubscriptionItem({ item: item.data });
  };

  const renderEmptyState = () => (
    <div style={styles.emptyState}>
      <IoChevronBack />
      <span style={{...(styles.emptyStateText || {}), color: theme.text}}>
        No payments found
      </span>
      <span style={{...(styles.emptyStateSubtext || {}), color: theme.secondaryText}}>
        Your payment history will appear here
      </span>
    </div>
  );

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      {/* Header */}
      <div
        style={{...(styles.header || {}), backgroundColor: theme.background,
            borderBottomColor: theme.border,}}
      >
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          <TbChevronLeft />
        </button>
        <span style={{...(styles.headerTitle || {}), color: theme.text}}>
          Payment History
        </span>
        <div style={{ width: 24 }} />
      </div>

      {/* Stats Cards */}
      <div style={styles.statsContainer}>
        <div
          style={{...(styles.statCard || {}), backgroundColor: theme.cardBackground}}
        >
          <span style={{...(styles.statValue || {}), color: theme.text}}>
            {stats.total_payments}
          </span>
          <span style={{...(styles.statLabel || {}), color: theme.secondaryText}}>
            Total
          </span>
        </div>
        <div
          style={{...(styles.statCard || {}), backgroundColor: theme.cardBackground}}
        >
          <span style={{...(styles.statValue || {}), color: "#4CAF50"}}>
            {stats.successful_payments}
          </span>
          <span style={{...(styles.statLabel || {}), color: theme.secondaryText}}>
            Successful
          </span>
        </div>
        <div
          style={{...(styles.statCard || {}), backgroundColor: theme.cardBackground}}
        >
          <span style={{...(styles.statValue || {}), color: "#00BFFF"}}>
            ${stats.total_amount.toFixed(2)}
          </span>
          <span style={{...(styles.statLabel || {}), color: theme.secondaryText}}>
            Total Paid
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterContainer}>
        <button
          style={{...(styles.filterTab || {}), backgroundColor: theme.cardBackground, ...(filterType === "all" ? styles.activeTab : {})}}
          onClick={() => setFilterType("all")}
        >
          <span
            style={{...(styles.filterText || {}), color: theme.text, ...(filterType === "all" ? styles.activeFilterText : {})}}
          >
            All
          </span>
        </button>
        <button
          style={{...(styles.filterTab || {}), backgroundColor: theme.cardBackground, ...(filterType === "subscription" ? styles.activeTab : {})}}
          onClick={() => setFilterType("subscription")}
        >
          <span
            style={{...(styles.filterText || {}), color: theme.text, ...(filterType === "subscription" ? styles.activeFilterText : {})}}
          >
            Subscriptions
          </span>
        </button>
        <button
          style={{...(styles.filterTab || {}), backgroundColor: theme.cardBackground, ...(filterType === "promoted_post" ? styles.activeTab : {})}}
          onClick={() => setFilterType("promoted_post")}
        >
          <span
            style={{...(styles.filterText || {}), color: theme.text, ...(filterType === "promoted_post" ? styles.activeFilterText : {})}}
          >
            Ads
          </span>
        </button>
      </div>

      {/* Payments List */}
      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
          <span style={styles.loadingText}>Loading...</span>
        </div>
      ) : filterType === "all" ? (
        <div style={styles.listContent}>
          {allItems.length === 0 ? renderEmptyState() : allItems.map((item) =>
            <div key={item.kind === "payment" ? `pay-${item.data.id}` : `sub-${item.data.id}`}>
              {renderCombinedItem({ item })}
            </div>
          )}
        </div>
      ) : filterType === "subscription" ? (
        <div style={styles.listContent}>
          {subscriptions.length === 0 ? renderEmptyState() : subscriptions.map((item) =>
            <div key={item.id}>{renderSubscriptionItem({ item })}</div>
          )}
        </div>
      ) : (
        <div style={styles.listContent}>
          {payments.length === 0 ? renderEmptyState() : payments.map((item) =>
            <div key={item.id}>{renderPaymentItem({ item })}</div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.xl5,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: "#111",
  },
  statsContainer: {
    flexDirection: "row",
    padding: spacing.base,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.base,
    alignItems: "center",
  },
  statValue: {
    fontSize: fontSize.xl3,
    fontWeight: "700",
    color: "#333",
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: "#666",
  },
  filterContainer: {
    flexDirection: "row",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  filterTab: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    borderRadius: radius.xl2,
  },
  activeTab: {
    backgroundColor: "#00BFFF",
  },
  filterText: {
    fontSize: fontSize.md,
    fontWeight: "500",
    color: "#666",
  },
  activeFilterText: {
    color: "#fff",
  },
  listContent: {
    padding: spacing.base,
    paddingBottom: spacing.xl2,
  },
  paymentCard: {
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.md,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  paymentTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  paymentType: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  description: {
    fontSize: fontSize.md,
    color: "#666",
    marginBottom: spacing.md,
  },
  paymentDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  amountContainer: {
    flex: 1,
  },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: "#00BFFF",
  },
  originalAmount: {
    fontSize: fontSize.sm,
    color: "#999",
    marginTop: spacing.px,
  },
  date: {
    fontSize: fontSize.sm,
    color: "#999",
  },
  referenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  referenceLabel: {
    fontSize: fontSize.xs,
    color: "#999",
    fontWeight: "600",
  },
  reference: {
    fontSize: fontSize.xs,
    color: "#999",
    fontFamily: "monospace",
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.md,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: "#333",
    marginTop: spacing.base,
  },
  emptyStateSubtext: {
    fontSize: fontSize.md,
    color: "#999",
    marginTop: spacing.sm,
  },
};

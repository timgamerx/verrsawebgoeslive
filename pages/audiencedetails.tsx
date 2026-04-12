// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Entypo, Ionicons, MaterialIcons } from '../lib/reactNativeShim';
import { useRouter } from 'next/router';
import { spacing, radius, fontSize } from "../lib/theme";
import AppText from "../components/AppText";
import {
  createPromotedPost,
  getPriceForDuration,
  updatePromotedPostPayment,
} from "../components/api";
import { PaymentData } from "../types/promotedPosts";
import { supabase } from "../components/supabase";
import {
  createPaymentRecord,
  markPaymentSuccessful,
  markPaymentFailed,
} from "../lib/paymentsManager";
import { iapService, PRODUCT_IDS } from "../lib/inAppPurchases";
import Balance from "./Balance";


export default function AudienceDetails() {
  const router = useRouter();
  const postId = "";
  const postType = "";
  const boostGoal = "";
  const callToAction = "";

  const [selectedGender, setSelectedGender] = useState<string>("All");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(
    null,
  );
  const [pendingPaymentRef, setPendingPaymentRef] = useState<string | null>(
    null,
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "iap" | "balance"
  >("balance");
  const [balance, setBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // Load user balance on mount
  useEffect(() => {
    loadUserBalance();
  }, []);

  // Load user balance
  const loadUserBalance = async () => {
    try {
      setBalanceLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_balance")
        .select("balance")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setBalance(parseFloat(data.balance) || 0);
      } else if (error) {
        console.error("Error loading balance:", error);
        setBalance(0);
      }
    } catch (error) {
      console.error("Error in loadUserBalance:", error);
      setBalance(0);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Fetch price when duration changes
  useEffect(() => {
    const fetchPrice = async () => {
      if (duration && parseInt(duration) > 0) {
        setLoading(true);
        const calculatedPrice = await getPriceForDuration(parseInt(duration));
        setPrice(calculatedPrice);
        setLoading(false);
      } else {
        setPrice(0);
      }
    };

    fetchPrice();
  }, [duration]);

  const handleContinue = async () => {
    if (!duration || parseInt(duration) <= 0) {
      alert("Please enter a valid duration");
      return;
    }

    setLoading(true);

    // Create the promoted post campaign
    const campaignData = {
      post_id: postId,
      post_type: postType as any,
      boost_goal: boostGoal as any,
      call_to_action: callToAction as any,
      target_gender: selectedGender as any,
      min_age: minAge ? parseInt(minAge) : undefined,
      max_age: maxAge ? parseInt(maxAge) : undefined,
      location: location || undefined,
      duration_days: parseInt(duration),
    };

    const createdCampaign = await createPromotedPost(campaignData);

    if (createdCampaign) {
      setCreatedCampaignId(createdCampaign.id);
      setShowPaymentModal(true);
    } else {
      alert("Failed to create campaign. Please try again.");
    }

    setLoading(false);
  };

  const handleBalancePayment = async () => {
    if (!createdCampaignId) return;

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in to continue");
        setLoading(false);
        return;
      }

      // Check if user has sufficient balance
      if (balance < price) {
        setLoading(false);
        setShowPaymentModal(false);
        window.alert(`You need $${price.toFixed(2)} but only have $${balance.toFixed(
            2,
          )}. Please top up your balance.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Top Up Balance",
              onPress: () => {
                router.push('/balance');
              },
            },
          ],
        );
        return;
      }

      // Deduct from balance using the update_user_balance RPC function
      const { data: balanceResult, error: debitError } = await supabase.rpc(
        "update_user_balance",
        {
          p_user_id: user.id,
          p_amount: -price,
          p_description: `Promoted ${postType} - ${boostGoal} for ${duration} days`,
        },
      );

      console.log("Balance update result:", { balanceResult, debitError });

      if (debitError) {
        console.error("Balance debit error:", debitError);
        window.alert(/* Alert: */ 
          "Payment Failed",
          `Could not deduct from balance: ${debitError.message}. Please try again.`,
        );
        setLoading(false);
        return;
      }

      // Create balance transaction record
      const { error: transactionError } = await supabase
        .from("balance_transactions")
        .insert({
          user_id: user.id,
          amount: price,
          type: "debit",
          description: `Promoted ${postType} - ${boostGoal} for ${duration} days`,
          reference: createdCampaignId,
        });

      if (transactionError) {
        console.error("Transaction record error:", transactionError);
      }

      // Reload balance after deduction
      await loadUserBalance();

      // Update promoted post payment status
      const paymentData: PaymentData = {
        amount: price,
        currency: "USD",
        reference: `balance_${createdCampaignId}_${Date.now()}`,
      };

      const success = await updatePromotedPostPayment(
        createdCampaignId,
        paymentData,
      );

      if (success) {
        // Create payment record
        await createPaymentRecord({
          user_id: user.id,
          user_email: user.email || "",
          payment_type: "promoted_post",
          amount: price,
          currency: "USD",
          payment_method: "balance",
          payment_reference: paymentData.reference,
          status: "successful",
          related_id: createdCampaignId,
          related_type: "promoted_post",
          description: `Promoted ${postType} - ${boostGoal} for ${duration} days`,
          customer_name: user.user_metadata?.full_name || "Verrsa User",
          metadata: {
            campaign_id: createdCampaignId,
            post_id: postId,
            post_type: postType,
            boost_goal: boostGoal,
            call_to_action: callToAction,
            duration_days: parseInt(duration),
            target_gender: selectedGender,
            min_age: minAge,
            max_age: maxAge,
            location: location,
          },
        });

        setShowPaymentModal(false);
        window.alert("Your post is now being promoted.");
      } else {
        window.alert(/* Alert: */ 
          "Error",
          "Payment was successful but campaign update failed. Please contact support.",
        );
      }
    } catch (error) {
      console.error("Balance payment error:", error);
      window.alert("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={styles.container}
      behavior={false ? "padding" : "height"}
    >
      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => router.back()}
        >
          <Entypo name="chevron-with-circle-left" size={24} color="#000" />
        </button>
        <AppText style={styles.headerTitle}>Audience Details</AppText>
        <div style={{ width: 24 }} />
      </div>

      {/* Content */}
      <div
        style={styles.scrollView}
        
        keyboardShouldPersistTaps="handled"
        
      >
        <AppText style={styles.title}>Audience Details</AppText>
        <AppText style={styles.subtitle}>
          Kindly select the details of people that you want to reach with your
          ad
        </AppText>

        {/* Audience Gender */}
        <AppText style={styles.sectionTitle}>Audience Gender</AppText>
        <div style={styles.genderRow}>
          {["Male", "Female", "All"].map((gender) => (
            <button
              key={gender}
              style={[
                styles.genderButton,
                {
                  borderColor:
                    selectedGender === gender ? "#00BFFF" : "#adadadff",
                },
              ]}
              onClick={() => setSelectedGender(gender)}
            >
              <AppText
                style={[
                  styles.genderButtonText,
                  {
                    color: selectedGender === gender ? "#00BFFF" : "#484848ff",
                  },
                ]}
              >
                {gender}
              </AppText>
            </button>
          ))}
        </div>

        {/* Audience Age Range */}
        <AppText style={styles.sectionTitle}>Audience Age Range</AppText>
        <div style={styles.ageRow}>
          <input
            placeholder="Min Age"
            value={minAge}
            onChange={(e) => setMinAge(e.target.value)}
            style={styles.ageInput}
            type="number"
          />
          <input
            placeholder="Max Age"
            value={maxAge}
            onChange={(e) => setMaxAge(e.target.value)}
            style={styles.ageInput}
            type="number"
          />
        </div>

        {/* Audience Location */}
        <AppText style={styles.sectionTitle}>Enter Audience Location</AppText>
        <input
          placeholder="Location"
          value={location}
            onChange={(e) => setLocation(e.target.value)}
          style={styles.input}
        />

        {/* Duration */}
        <AppText style={styles.sectionTitle}>Duration (days)</AppText>
        <input
          placeholder="Enter duration"
          value={duration}
            onChange={(e) => setDuration(e.target.value)}
          style={styles.input}
          type="number"
        />

        {/* Price Display */}
        {duration && parseInt(duration) > 0 && (
          <div style={styles.priceContainer}>
            <AppText style={styles.priceLabel}>Campaign Cost:</AppText>
            {loading ? (
              <div style={{width:24,height:24,borderRadius:"50%",border:"3px solid #00bfff",borderTopColor:"transparent",animation:"spin 1s linear infinite"}} />
            ) : (
              <AppText style={styles.priceText}>${price.toFixed(2)}</AppText>
            )}
          </div>
        )}

        <button
          style={[
            styles.continueButton,
            (!duration || parseInt(duration) <= 0 || loading) &&
              styles.disabledButton,
          ]}
          onClick={handleContinue}
          disabled={!duration || parseInt(duration) <= 0 || loading}
        >
          {loading ? (
            <div style={{width:24,height:24,borderRadius:"50%",border:"3px solid #00bfff",borderTopColor:"transparent",animation:"spin 1s linear infinite"}} />
          ) : (
            <AppText style={styles.continueButtonText}>Continue to Payment</AppText>
          )}
        </button>
      </div>

      {/* Payment Modal */}
      <div
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <AppText style={styles.modalTitle}>Choose Payment Method</AppText>

            <div style={styles.paymentAmountContainer}>
              <AppText style={styles.paymentAmountText}>
                Amount: ${price.toFixed(2)} USD
              </AppText>
              {balanceLoading ? (
                <div style={{width:24,height:24,borderRadius:"50%",border:"3px solid #00bfff",borderTopColor:"transparent",animation:"spin 1s linear infinite"}} />
              ) : (
                <AppText style={styles.balanceText}>
                  Your Balance: ${balance.toFixed(2)}
                </AppText>
              )}
            </div>

            {/* Balance Payment Option (Primary) */}
            <button
              style={[
                styles.newCardOption,
                selectedPaymentMethod === "balance" &&
                  styles.selectedPaymentOption,
              ]}
              onClick={() => setSelectedPaymentMethod("balance")}
            >
              <div
                style={[
                  styles.newCardIcon,
                  {
                    borderColor:
                      selectedPaymentMethod === "balance"
                        ? "#00BFFF"
                        : "#adadadff",
                    backgroundColor:
                      selectedPaymentMethod === "balance"
                        ? "#E6F7FF"
                        : "transparent",
                  },
                ]}
              >
                <Ionicons
                  name="wallet"
                  size={20}
                  color={
                    selectedPaymentMethod === "balance" ? "#00BFFF" : "#666"
                  }
                />
              </div>
              <div style={styles.newCardInfo}>
                <AppText
                  style={[
                    styles.newCardTitle,
                    {
                      color:
                        selectedPaymentMethod === "balance"
                          ? "#00BFFF"
                          : "#000",
                    },
                  ]}
                >
                  Pay from Balance
                </AppText>
                <AppText style={styles.newCardSubtitle}>
                  {balance >= price
                    ? `Use your Verrsa balance ($${balance.toFixed(
                        2,
                      )} available)`
                    : `Insufficient balance - Need $${(price - balance).toFixed(
                        2,
                      )} more`}
                </AppText>
              </div>
              {selectedPaymentMethod === "balance" && (
                <Ionicons name="checkmark-circle" size={20} color="#00BFFF" />
              )}
            </button>

            {/* Continue Payment Button */}
            <button
              style={[
                styles.continuePaymentButton,
                selectedPaymentMethod === "balance" &&
                  balance < price &&
                  styles.disabledButton,
              ]}
              onClick={async () => {
                if (selectedPaymentMethod === "balance") {
                  // Handle Balance Payment
                  await handleBalancePayment();
                } else if (selectedPaymentMethod === "iap") {
                  // Handle In-App Purchase
                  setShowPaymentModal(false);
                  setLoading(true);

                  try {
                    // Map duration to product ID
                    let productId = PRODUCT_IDS.AD_BOOST_1_DAY;
                    const durationDays = parseInt(duration);

                    if (durationDays === 1)
                      productId = PRODUCT_IDS.AD_BOOST_1_DAY;
                    else if (durationDays <= 3)
                      productId = PRODUCT_IDS.AD_BOOST_3_DAYS;
                    else if (durationDays <= 7)
                      productId = PRODUCT_IDS.AD_BOOST_7_DAYS;
                    else if (durationDays <= 14)
                      productId = PRODUCT_IDS.AD_BOOST_14_DAYS;
                    else productId = PRODUCT_IDS.AD_BOOST_30_DAYS;

                    const success = await iapService.purchaseProduct(productId);

                    if (success && createdCampaignId) {
                      // Update campaign with IAP payment
                      await updatePromotedPostPayment(createdCampaignId, {
                        amount: price,
                        currency: "USD",
                        reference: `iap_${Date.now()}`,
                        payment_method:
                          false ? "apple_iap" : "google_iap",
                      });

                      window.alert(/* Alert: */ 
                        "Success",
                        "Payment successful! Your post is now being promoted.",
                      );
                      router.push('/ads-boosts-5');
                    }
                  } catch (error) {
                    console.error("IAP error:", error);
                    window.alert("Payment failed. Please try again.");
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              disabled={loading}
            >
              {loading ? (
                <div color="#fff" />
              ) : (
                <AppText style={styles.continuePaymentText}>
                  {selectedPaymentMethod === "balance"
                    ? balance >= price
                      ? "Pay from Balance"
                      : "Insufficient Balance"
                    : `Continue with ${
                        false ? "Apple Pay" : "Google Pay"
                      }`}
                </AppText>
              )}
            </button>

            <button
              onClick={() => setShowPaymentModal(false)}
              style={styles.closeButton}
            >
              <MaterialIcons name="close" size={22} color="#000" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: 70,
    paddingBottom: spacing.base,
    backgroundColor: "#fff",
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    color: "#111",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingLeft: spacing.lg,
    paddingRight: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl3,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    marginBottom: spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.base,
    color: "#666",
    marginBottom: spacing.xl2,
    textAlign: "center",
  },
  sectionTitle: {
    fontWeight: "400",
    marginBottom: spacing.md,
    marginTop: spacing.base,
    fontSize: fontSize.base,
  },
  genderRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  genderButton: {
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderRadius: radius.md,
    width: 100,
    height: 40,
  },
  genderButtonText: {
    fontSize: fontSize.md2,
    fontWeight: "400",
  },
  ageRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  ageInput: {
    borderWidth: 1,
    borderColor: "#adadadff",
    borderRadius: radius.md,
    width: 80,
    height: 45,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    fontSize: fontSize.base,
  },
  input: {
    borderWidth: 1,
    borderColor: "#adadadff",
    borderRadius: radius.md,
    width: "100%",
    height: 45,
    paddingLeft: spacing.md,
    paddingRight: spacing.md,
    marginBottom: spacing.base,
    fontSize: fontSize.base,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: spacing.base,
    borderRadius: radius.md,
    marginTop: spacing.base,
    marginBottom: spacing.md,
  },
  priceLabel: {
    fontSize: fontSize.base,
    fontWeight: "500",
    color: "#333",
  },
  priceText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: "#00BFFF",
  },
  continueButton: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    alignItems: "center",
    marginTop: spacing.xl2,
    marginBottom: spacing.lg,
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  continueButtonText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "400",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    paddingBottom: 80,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.xl2,
    marginLeft: spacing.lg,
    marginRight: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: "400",
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  cardOption: {
    marginBottom: spacing.lg,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: "#adadadff",
    borderRadius: radius.md,
  },
  cardDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardLogo: {
    width: 40,
    height: 40,
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: "#adadadff",
    borderRadius: radius.full,
  },
  cardName: {
    fontWeight: "400",
    fontSize: fontSize.base,
  },
  cardNumber: {
    color: "#666",
    fontSize: fontSize.md2,
  },
  cardAmount: {
    fontWeight: "400",
    fontSize: fontSize.base,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  dividerText: {
    fontSize: fontSize.base,
    fontWeight: "400",
    marginLeft: spacing.md,
    marginRight: spacing.md,
  },
  newCardOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  newCardIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.xl2,
    borderWidth: 1,
    borderColor: "#adadadff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  newCardInfo: {
    flex: 1,
  },
  newCardTitle: {
    fontWeight: "400",
    fontSize: fontSize.base,
  },
  newCardSubtitle: {
    color: "#666",
    fontSize: fontSize.sm2,
  },
  closeButton: {
    alignSelf: "center",
    marginTop: spacing.md,
  },
  selectedPaymentOption: {
    borderColor: "#00BFFF",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: "#f0f8ff",
  },
  continuePaymentButton: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  continuePaymentText: {
    color: "#fff",
    fontSize: fontSize.base,
    fontWeight: "500",
  },
  paymentAmountContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  paymentAmountText: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    color: "#00BFFF",
    textAlign: "center",
  },
  convertedAmountText: {
    fontSize: fontSize.md,
    color: "#666",
    textAlign: "center",
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  balanceText: {
    fontSize: fontSize.md,
    color: "#00BFFF",
    fontWeight: "500",
    marginTop: spacing.xs,
  },
};

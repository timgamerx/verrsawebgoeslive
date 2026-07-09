// @ts-nocheck
import { useRouter } from 'next/router';
import React, { useEffect, useState } from "react";
import { spacing, radius, fontSize } from '../lib/theme';
import { IoChevronBack, IoClose } from 'react-icons/io5';
import { supabase } from '../components/supabase';
import { fetchCurrentUserProfile, UserProfile } from '../lib/profileUtils';
import { useTheme } from '../context/ThemeProvider';
import { MdAdd, MdArrowBack, MdArrowForward, MdBlock, MdCheck, MdClose, MdDelete, MdEdit, MdFavorite, MdHome, MdNotifications, MdPerson, MdRemove, MdReport, MdSearch, MdSettings, MdShare, MdStar, MdVerified } from 'react-icons/md';
import { twoFactorAuth } from '../lib/twoFactorAuth';
import { sendEmail } from '../lib/securePaymentApi';
import App from "App";
import { TbChevronLeft } from 'react-icons/tb'
import { FiSearch } from 'react-icons/fi'
import { AiOutlineCheck } from 'react-icons/ai'

// Payment calculation rates per 1,000 units (updated to match earning metrics)
export const PAYMENT_RATES = {
  impressions: 1.5, // $1.50 per 1,000 verified ad impressions
  watch_time: 0.5, // $0.50 per 1,000 minutes watch time (with ads)
  listen_time: 0.6, // $0.60 per 1,000 minutes listen time (podcast with ads)
  read_time: 0.6, // $0.60 per 1,000 minutes read time (articles 60s+ with ads)
};

// Earnings metrics data

export default function PaymentDashboard() {
  const router = useRouter();
  const { theme, colors } = useTheme();
  let routeParams: any = {};
  if (typeof router.query.params === "string") {
    try {
      routeParams = JSON.parse(router.query.params);
    } catch {
      routeParams = {};
    }
  }

  const passedTotals = routeParams?.totals;
  const paymentRates = routeParams?.paymentRates || PAYMENT_RATES;

  // notifications
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = React.useState(false);
  const [show2FAModal, setShow2FAModal] = React.useState(false);
  const [password, setPassword] = React.useState<string>("");
  const [twoFACode, setTwoFACode] = React.useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = React.useState<string>("");
  const [withdrawNote, setWithdrawNote] = React.useState<string>("");
  const [pendingWithdrawal, setPendingWithdrawal] = React.useState<any>(null);

  // Live gifts earnings
  const [showGiftEarningsModal, setShowGiftEarningsModal] =
    React.useState(false);
  const [giftEarnings, setGiftEarnings] = React.useState<any>(null);
  const [recentGifts, setRecentGifts] = React.useState<any[]>([]);
  const [loadingGifts, setLoadingGifts] = React.useState(false);
  // Payment methods state
  const [showPaymentMethodModal, setShowPaymentMethodModal] =
    React.useState(false);
  const [paymentMethods, setPaymentMethods] = React.useState<any[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] =
    React.useState<string>("bank");
  const [paymentFormData, setPaymentFormData] = React.useState<any>({
    account_name: "",
    account_number: "",
    bank_name: "",
    routing_number: "",
    paypal_email: "",
    mobile_money_number: "",
    mobile_money_provider: "",
       });
  const [loadingPaymentMethods, setLoadingPaymentMethods] =
    React.useState(false);

  // Withdrawal history state
  const [showWithdrawalHistory, setShowWithdrawalHistory] =
    React.useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = React.useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = React.useState(false);

  useEffect(() => {
    // fetch latest 5 notifications for this user
    let mounted = true;
    const loadNotifications = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from("notifications")
          .select("id, title, message, created_at, meta")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5);
        if (!error && mounted) setNotifications(data || []);
      } catch (e) {
        console.warn("Failed to load notifications", e);
      }
    };
    loadNotifications();
    return () => {
      mounted = false;
    };
  }, []);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [greeting, setGreeting] = useState<string>("Good Morning");
  const [earningsTotal, setEarningsTotal] = useState<number | null>(null);

  // Pending / available balances and platform settings
  const [pendingCents, setPendingCents] = React.useState<number>(0);
  const [availableCents, setAvailableCents] = React.useState<number>(0);
  const [monetizationActive, setMonetizationActive] =
    React.useState<boolean>(false);
  const [minWithdrawalCents, setMinWithdrawalCents] =
    React.useState<number>(2500);
  const [platformTake, setPlatformTake] = React.useState<number>(0.2);

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      const p = await fetchCurrentUserProfile();
      if (mounted) setUserProfile(p);
    };
    loadProfile();
    fetchPaymentMethods();
    fetchWithdrawalHistory();
    return () => {
      mounted = false;
    };
  }, []);

  // Load user's earnings total (use passedTotals if available, otherwise call RPC for lifetime totals)
  useEffect(() => {
    let mounted = true;
    const loadEarnings = async () => {
      if (passedTotals && typeof passedTotals.earnings !== "undefined") {
        if (mounted) setEarningsTotal(Number(passedTotals.earnings || 0));
        return;
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const userId = user.id;
        // call RPC for lifetime totals using a wide date range
        const start = new Date(1970, 0, 1).toISOString();
        const end = new Date().toISOString();
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          "user_performance_sums",
          { p_user: userId, p_start: start, p_end: end },
        );
        if (!rpcErr && rpcData && rpcData.length > 0) {
          const val = Number(rpcData[0].earnings || 0);
          if (mounted) setEarningsTotal(val);
        } else {
          // fallback: try summing from earnings table
          const { data: payments } = await supabase
            .from("earnings")
            .select("amount")
            .eq("user_id", userId);
          const sum = (payments || []).reduce(
            (s: number, p: any) => s + Number(p.amount || 0),
            0,
          );
          if (mounted) setEarningsTotal(sum);
        }
      } catch (e) {
        console.warn("Failed to load earnings total", e);
      }
    };
    loadEarnings();
    // also fetch pending/available and platform settings
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const token = (await supabase.auth.getSession()).data?.session
          ?.access_token;
        const resp = await fetch("/api/get-earnings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const json = await resp.json();
        if (!mounted) return;
        setPendingCents(Number(json.pending_cents || 0));
        setAvailableCents(Number(json.available_cents || 0));
        setMonetizationActive(Boolean(json.monetization_active));
        setMinWithdrawalCents(Number(json.min_withdrawal_cents || 2500));
        setPlatformTake(Number(json.platform_take_pct || 0.2));
      } catch (err) {
        console.warn("Failed to fetch earnings status", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [passedTotals]);

  const handleRequestWithdraw = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      if (availableCents < minWithdrawalCents) {
        window.alert(`Minimum withdrawal is $${(minWithdrawalCents / 100).toFixed(2)}.`,
        );
        return;
      }
      const token = (await supabase.auth.getSession()).data?.session
        ?.access_token;
      const resp = await fetch("/api/request-withdrawal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount_cents: availableCents }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        window.alert(json?.error || "Failed to create withdrawal request");
        return;
      }
      window.alert("Withdrawal request created. Admin will process payouts.");
      // refresh balances
      setAvailableCents(0);
      setPendingCents(0);
    } catch (err) {
      console.error("withdraw error", err);
      window.alert("Failed to request withdrawal");
    }
  };

  // compute greeting based on current hour
  useEffect(() => {
    const getGreeting = (date: Date) => {
      const hour = date.getHours();
      if (hour >= 5 && hour < 12) return "Good Morning";
      if (hour >= 12 && hour < 17) return "Good Afternoon";
      if (hour >= 17 && hour < 21) return "Good Evening";
      return "Good Night";
    };

    // set initial greeting
    setGreeting(getGreeting(new Date()));

    // update greeting each minute while mounted
    const iv = setInterval(() => {
      setGreeting(getGreeting(new Date()));
    }, 60 * 1000);

    return () => clearInterval(iv);
  }, []);

  // Move exchange rates state and effect to top level
  const [exchangeRates, setExchangeRates] = React.useState<{
    [key: string]: number;
  }>({ USD: 1 });

  React.useEffect(() => {
    // Example using exchangerate-api.com or similar
    // Replace YOUR_API_KEY and endpoint as needed
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rates) {
          setExchangeRates(data.rates);
        }
      })
      .catch(() => {
        // fallback to default rates if needed
        setExchangeRates({
          USD: 1,
          EUR: 0.92,
          GBP: 0.79,
          NGN: 1500,
          // ...add more as fallback
        });
      });
  }, []);

  const currencies = [
    {
      code: "USD",
      name: "US Dollar",
      flag: { uri: "https://flagcdn.com/w40/us.png" },
    },
    {
      code: "CAD",
      name: "Canadian Dollar",
      flag: { uri: "https://flagcdn.com/w40/ca.png" },
    },
    {
      code: "AUD",
      name: "Australian Dollar",
      flag: { uri: "https://flagcdn.com/w40/au.png" },
    },
    {
      code: "JPY",
      name: "Japanese Yen",
      flag: { uri: "https://flagcdn.com/w40/jp.png" },
    },
    {
      code: "GBP",
      name: "British Pound",
      flag: { uri: "https://flagcdn.com/w40/gb.png" },
    },
    {
      code: "EUR",
      name: "Euro",
      flag: { uri: "https://flagcdn.com/w40/eu.png" },
    },
    {
      code: "NGN",
      name: "Nigerian Naira",
      flag: { uri: "https://flagcdn.com/w40/ng.png" },
    },
    {
      code: "KES",
      name: "Kenyan Shilling",
      flag: { uri: "https://flagcdn.com/w40/ke.png" },
    },
    {
      code: "GHS",
      name: "Ghanaian Cedi",
      flag: { uri: "https://flagcdn.com/w40/gh.png" },
    },
    {
      code: "ZAR",
      name: "South African Rand",
      flag: { uri: "https://flagcdn.com/w40/za.png" },
    },
    {
      code: "CNY",
      name: "Chinese Yuan",
      flag: { uri: "https://flagcdn.com/w40/cn.png" },
    },
    {
      code: "INR",
      name: "Indian Rupee",
      flag: { uri: "https://flagcdn.com/w40/in.png" },
    },
    {
      code: "BRL",
      name: "Brazilian Real",
      flag: { uri: "https://flagcdn.com/w40/br.png" },
    },
    {
      code: "MXN",
      name: "Mexican Peso",
      flag: { uri: "https://flagcdn.com/w40/mx.png" },
    },
    {
      code: "RUB",
      name: "Russian Ruble",
      flag: { uri: "https://flagcdn.com/w40/ru.png" },
    },
    {
      code: "TRY",
      name: "Turkish Lira",
      flag: { uri: "https://flagcdn.com/w40/tr.png" },
    },
    {
      code: "SAR",
      name: "Saudi Riyal",
      flag: { uri: "https://flagcdn.com/w40/sa.png" },
    },
    {
      code: "AED",
      name: "UAE Dirham",
      flag: { uri: "https://flagcdn.com/w40/ae.png" },
    },
    {
      code: "CHF",
      name: "Swiss Franc",
      flag: { uri: "https://flagcdn.com/w40/ch.png" },
    },
    {
      code: "SEK",
      name: "Swedish Krona",
      flag: { uri: "https://flagcdn.com/w40/se.png" },
    },
    {
      code: "NOK",
      name: "Norwegian Krone",
      flag: { uri: "https://flagcdn.com/w40/no.png" },
    },
    {
      code: "DKK",
      name: "Danish Krone",
      flag: { uri: "https://flagcdn.com/w40/dk.png" },
    },
    {
      code: "PLN",
      name: "Polish Zloty",
      flag: { uri: "https://flagcdn.com/w40/pl.png" },
    },
    {
      code: "NZD",
      name: "New Zealand Dollar",
      flag: { uri: "https://flagcdn.com/w40/nz.png" },
    },
    {
      code: "SGD",
      name: "Singapore Dollar",
      flag: { uri: "https://flagcdn.com/w40/sg.png" },
    },
    {
      code: "HKD",
      name: "Hong Kong Dollar",
      flag: { uri: "https://flagcdn.com/w40/hk.png" },
    },
    {
      code: "KRW",
      name: "South Korean Won",
      flag: { uri: "https://flagcdn.com/w40/kr.png" },
    },
    {
      code: "TWD",
      name: "New Taiwan Dollar",
      flag: { uri: "https://flagcdn.com/w40/tw.png" },
    },
    {
      code: "THB",
      name: "Thai Baht",
      flag: { uri: "https://flagcdn.com/w40/th.png" },
    },
    {
      code: "IDR",
      name: "Indonesian Rupiah",
      flag: { uri: "https://flagcdn.com/w40/id.png" },
    },
    {
      code: "PHP",
      name: "Philippine Peso",
      flag: { uri: "https://flagcdn.com/w40/ph.png" },
    },
    {
      code: "VND",
      name: "Vietnamese Dong",
      flag: { uri: "https://flagcdn.com/w40/vn.png" },
    },
    {
      code: "EGP",
      name: "Egyptian Pound",
      flag: { uri: "https://flagcdn.com/w40/eg.png" },
    },
    {
      code: "PKR",
      name: "Pakistani Rupee",
      flag: { uri: "https://flagcdn.com/w40/pk.png" },
    },
    {
      code: "BDT",
      name: "Bangladeshi Taka",
      flag: { uri: "https://flagcdn.com/w40/bd.png" },
    },
    {
      code: "LKR",
      name: "Sri Lankan Rupee",
      flag: { uri: "https://flagcdn.com/w40/lk.png" },
    },
    {
      code: "NPR",
      name: "Nepalese Rupee",
      flag: { uri: "https://flagcdn.com/w40/np.png" },
    },
    {
      code: "IRR",
      name: "Iranian Rial",
      flag: { uri: "https://flagcdn.com/w40/ir.png" },
    },
    {
      code: "IQD",
      name: "Iraqi Dinar",
      flag: { uri: "https://flagcdn.com/w40/iq.png" },
    },
    {
      code: "DZD",
      name: "Algerian Dinar",
      flag: { uri: "https://flagcdn.com/w40/dz.png" },
    },
    {
      code: "MAD",
      name: "Moroccan Dirham",
      flag: { uri: "https://flagcdn.com/w40/ma.png" },
    },
    {
      code: "TND",
      name: "Tunisian Dinar",
      flag: { uri: "https://flagcdn.com/w40/tn.png" },
    },
    {
      code: "JOD",
      name: "Jordanian Dinar",
      flag: { uri: "https://flagcdn.com/w40/jo.png" },
    },
    {
      code: "KWD",
      name: "Kuwaiti Dinar",
      flag: { uri: "https://flagcdn.com/w40/kw.png" },
    },
    {
      code: "BHD",
      name: "Bahraini Dinar",
      flag: { uri: "https://flagcdn.com/w40/bh.png" },
    },
    {
      code: "OMR",
      name: "Omani Rial",
      flag: { uri: "https://flagcdn.com/w40/om.png" },
    },
    {
      code: "QAR",
      name: "Qatari Riyal",
      flag: { uri: "https://flagcdn.com/w40/qa.png" },
    },
    {
      code: "UAH",
      name: "Ukrainian Hryvnia",
      flag: { uri: "https://flagcdn.com/w40/ua.png" },
    },
    {
      code: "CZK",
      name: "Czech Koruna",
      flag: { uri: "https://flagcdn.com/w40/cz.png" },
    },
    {
      code: "HUF",
      name: "Hungarian Forint",
      flag: { uri: "https://flagcdn.com/w40/hu.png" },
    },
    {
      code: "RON",
      name: "Romanian Leu",
      flag: { uri: "https://flagcdn.com/w40/ro.png" },
    },
    {
      code: "BGN",
      name: "Bulgarian Lev",
      flag: { uri: "https://flagcdn.com/w40/bg.png" },
    },
    {
      code: "HRK",
      name: "Croatian Kuna",
      flag: { uri: "https://flagcdn.com/w40/hr.png" },
    },
    {
      code: "ISK",
      name: "Icelandic Krona",
      flag: { uri: "https://flagcdn.com/w40/is.png" },
    },
    {
      code: "ARS",
      name: "Argentine Peso",
      flag: { uri: "https://flagcdn.com/w40/ar.png" },
    },
    {
      code: "CLP",
      name: "Chilean Peso",
      flag: { uri: "https://flagcdn.com/w40/cl.png" },
    },
    {
      code: "COP",
      name: "Colombian Peso",
      flag: { uri: "https://flagcdn.com/w40/co.png" },
    },
    {
      code: "PEN",
      name: "Peruvian Sol",
      flag: { uri: "https://flagcdn.com/w40/pe.png" },
    },
    {
      code: "UYU",
      name: "Uruguayan Peso",
      flag: { uri: "https://flagcdn.com/w40/uy.png" },
    },
    {
      code: "VEF",
      name: "Venezuelan Bolivar",
      flag: { uri: "https://flagcdn.com/w40/ve.png" },
    },
    {
      code: "LTL",
      name: "Lithuanian Litas",
      flag: { uri: "https://flagcdn.com/w40/lt.png" },
    },
    {
      code: "LVL",
      name: "Latvian Lats",
      flag: { uri: "https://flagcdn.com/w40/lv.png" },
    },
    {
      code: "EEK",
      name: "Estonian Kroon",
      flag: { uri: "https://flagcdn.com/w40/ee.png" },
    },
    {
      code: "MKD",
      name: "Macedonian Denar",
      flag: { uri: "https://flagcdn.com/w40/mk.png" },
    },
    {
      code: "ALL",
      name: "Albanian Lek",
      flag: { uri: "https://flagcdn.com/w40/al.png" },
    },
    {
      code: "AZN",
      name: "Azerbaijani Manat",
      flag: { uri: "https://flagcdn.com/w40/az.png" },
    },
    {
      code: "BYN",
      name: "Belarusian Ruble",
      flag: { uri: "https://flagcdn.com/w40/by.png" },
    },
    {
      code: "GEL",
      name: "Georgian Lari",
      flag: { uri: "https://flagcdn.com/w40/ge.png" },
    },
    {
      code: "MDL",
      name: "Moldovan Leu",
      flag: { uri: "https://flagcdn.com/w40/md.png" },
    },
    {
      code: "TJS",
      name: "Tajikistani Somoni",
      flag: { uri: "https://flagcdn.com/w40/tj.png" },
    },
    {
      code: "UZS",
      name: "Uzbekistani Som",
      flag: { uri: "https://flagcdn.com/w40/uz.png" },
    },
    {
      code: "AFN",
      name: "Afghan Afghani",
      flag: { uri: "https://flagcdn.com/w40/af.png" },
    },
    {
      code: "BAM",
      name: "Bosnia-Herzegovina Convertible Mark",
      flag: { uri: "https://flagcdn.com/w40/ba.png" },
    },
  ];

  const [selectedCurrency, setSelectedCurrency] = React.useState(currencies[0]);
  const [showBalance, setShowBalance] = React.useState(true);
  const [showCurrencyModal, setShowCurrencyModal] = React.useState(false);
  // We'll render real notifications from state (fetched above). The notification
  // rows from Supabase are expected to have at least: id, title or message, created_at, meta

  // Fetch payment methods
  const fetchPaymentMethods = async () => {
    setLoadingPaymentMethods(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPaymentMethods(data);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Save payment method
  const handleSavePaymentMethod = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      let paymentData: any = {
        user_id: user.id,
        payment_type: selectedPaymentType,
        is_primary: paymentMethods.length === 0, // First method is primary
      };

      // Add type-specific fields
      if (selectedPaymentType === "bank") {
        paymentData = {
          ...paymentData,
          account_name: paymentFormData.account_name,
          account_number: paymentFormData.account_number,
          bank_name: paymentFormData.bank_name,
          routing_number: paymentFormData.routing_number,
        };
      } else if (selectedPaymentType === "paypal") {
        paymentData = {
          ...paymentData,
          paypal_email: paymentFormData.paypal_email,
        };
      } else if (selectedPaymentType === "mobile_money") {
        paymentData = {
          ...paymentData,
          mobile_money_number: paymentFormData.mobile_money_number,
          mobile_money_provider: paymentFormData.mobile_money_provider,
        };
      }

      const { error } = await supabase
        .from("payment_methods")
        .insert([paymentData]);

      if (error) {
        console.error("Error saving payment method:", error);
        window.alert("Failed to save payment method. Please try again.");
        return;
      }

      window.alert("Payment method added successfully!");
      setShowPaymentMethodModal(false);
      // Reset form
      setPaymentFormData({
        account_name: "",
        account_number: "",
        bank_name: "",
        routing_number: "",
        paypal_email: "",
        mobile_money_number: "",
        mobile_money_provider: "",
      });
      fetchPaymentMethods();
    } catch (error) {
      console.error("Error saving payment method:", error);
      window.alert("Failed to save payment method.");
    }
  };

  // Delete payment method
  const handleDeletePaymentMethod = async (methodId: string) => {
    if (window.confirm("Are you sure you want to delete this payment method?")) {
      try {
        const { error } = await supabase
          .from("payment_methods")
          .delete()
          .eq("id", methodId);
        if (error) throw error;
        window.alert("Payment method deleted.");
        fetchPaymentMethods();
      } catch (error) {
        console.error("Error deleting payment method:", error);
        window.alert("Failed to delete payment method.");
      }
    }
  };

  // Fetch withdrawal history
  const fetchWithdrawalHistory = async () => {
    setLoadingHistory(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        setWithdrawalHistory(data);
      }
    } catch (error) {
      console.error("Error fetching withdrawal history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch live gift earnings
  const fetchGiftEarnings = async () => {
    setLoadingGifts(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Get earnings summary
      const { data: earnings } = await supabase.rpc("get_live_gift_earnings", {
        p_user_id: user.id,
      });

      if (earnings && earnings.length > 0) {
        setGiftEarnings(earnings[0]);
      }

      // Get recent gifts
      const { data: gifts } = await supabase.rpc("get_recent_live_gifts", {
        p_recipient_id: user.id,
        p_limit: 50,
      });

      if (gifts) {
        setRecentGifts(gifts);
      }
    } catch (error) {
      console.error("Error fetching gift earnings:", error);
    } finally {
      setLoadingGifts(false);
    }
  };

  const handleWithdrawGiftEarnings = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !giftEarnings) return;

      const availableBalance = parseFloat(giftEarnings.available_balance || 0);
      if (availableBalance <= 0) {
        window.alert("You have no available balance to withdraw.");
        return;
      }

      // Check minimum withdrawal amount for live gifts
      if (availableBalance < 10) {
        window.alert("Minimum withdrawal for live gifts is $10.00. Your current balance will be available once you reach the minimum.");
        return;
      }

      window.alert(`Withdraw $${availableBalance.toFixed(2)} from live gifts to your account?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Withdraw",
            onPress: async () => {
              try {
                // Step 1: Create withdrawal request in withdrawals table
                const { data: withdrawalData, error: withdrawalError } =
                  await supabase
                    .from("withdrawals")
                    .insert([
                      {
                        user_id: user.id,
                        amount: availableBalance,
                        metric: "live_gifts",
                        note: "Live gift earnings withdrawal",
                        status: "pending",
                      },
                    ])
                    .select();

                if (withdrawalError) {
                  console.error("Withdrawal request error:", withdrawalError);
                  window.alert("Failed to create withdrawal request. Please try again.");
                  return;
                }

                // Step 2: Mark all unwithdrawn gifts as withdrawn
                const { error: updateError } = await supabase
                  .from("live_gifts")
                  .update({
                    withdrawn: true,
                    withdrawn_at: new Date().toISOString(),
                  })
                  .eq("recipient_id", user.id)
                  .eq("withdrawn", false);

                if (updateError) {
                  console.error(
                    "Error marking gifts as withdrawn:",
                    updateError,
                  );
                  // Note: withdrawal request was created but gifts not marked
                  // Admin should handle this edge case
                }

                // Step 3: Send email notification to admin
                try {
                  console.log("Sending withdrawal email notification...");

                  await sendEmail({
                    to: "hello@verrsa.org",
                    subject: "New Live Gift Earnings Withdrawal",
                    text: `A new live gift earnings withdrawal has been requested:\n\nUser ID: ${user.id}\nAmount: $${availableBalance.toFixed(
                      2,
                    )}\nType: Live Gift Earnings\n\nPlease review and process this payout in the admin dashboard.`,
                  });

                  console.log("Email notification sent successfully!");
                } catch (emailError) {
                  console.error(
                    "Failed to send email notification - ERROR:",
                    emailError,
                  );
                  // Don't block withdrawal on email failure
                }

                window.alert("Your withdrawal request has been submitted and will be processed within 3-5 business days.");
                setShowGiftEarningsModal(false);
                // Refresh earnings
                fetchGiftEarnings();
              } catch (error) {
                console.error("Withdrawal processing error:", error);
                window.alert("Failed to process withdrawal. Please try again.");
              }
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error withdrawing:", error);
      window.alert("Failed to process withdrawal.");
    }
  };

  return (
    <div style={{...(styles.container || {}), backgroundColor: theme.background}}>
      {/* Fixed Header Section */}
      <button style={styles.backButton} onClick={() => router.back()}>
        <TbChevronLeft />
      </button>
      <span style={{...(styles.title || {}), color: theme.text}}>My Earnings</span>

      {/* User Info Section */}
      {/* Scrollable Content Section */}
      <div style={{...(styles.scrollView), overflowY: "auto"}}
        
        
      >
        <div style={{...(styles.userInfoContainer || {}), borderColor: theme.border}}>
          <img
            src={
              userProfile && (userProfile.avatar_url || userProfile.avatar)
                ? { uri: userProfile.avatar_url || userProfile.avatar }
                : "/assets/../assets/avatar.jpg"
            }
            style={{...(styles.userAvatar || {}), borderColor: theme.border}}
          />
          <div style={{ flex: 1 }}>
            <span style={{...(styles.infoText || {}), color: theme.text}}>
              {`Hello, ${
                userProfile?.full_name || userProfile?.firstName || "User"
              }`}
            </span>
            <span style={{...(styles.infoSubText || {}), color: theme.secondaryText}}>
              {greeting}
            </span>
          </div>
          <button
            onClick={() => router.push("/balance")}
            style={{ marginRight: spacing.sm }}
          >
            <IoChevronBack />
          </button>
          <button
            onClick={() => {
              setShowGiftEarningsModal(true);
              fetchGiftEarnings();
            }}
            style={{ marginRight: spacing.sm }}
          >
            <IoChevronBack />
          </button>
          <button
            onClick={() => router.push("/notifications")}
            style={{ marginRight: spacing.sm }}
          >
            <IoChevronBack />
          </button>
        </div>
        {/* Currency Selector */}
        <button
          style={{...(styles.currencySelector || {}), borderColor: theme.border}}
          onClick={() => setShowCurrencyModal(true)}
        >
          <img src={selectedCurrency.flag} style={styles.currencyFlag} />
          <div>
            <span style={{...(styles.selectCurrency || {}), color: theme.text}}>
              {selectedCurrency.code}
            </span>
          </div>
          <FiSearch />
        </button>
        {/* Earnings summary (Pending vs Available) */}
        {/* Pending Earnings Section */}
        <div style={styles.statsContainer}>
          <div style={styles.statBox}>
            <div style={{ position: "relative", paddingRight: 120 }}>
              <MdVerified />
              <div style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.xs }}>
                <span style={styles.statTitle}>Earnings</span>
                <button
                  onClick={() => setShowBalance((prev) => !prev)}
                  style={{ marginLeft: 3, marginTop: spacing.sm }}
                >
                  <MdVerified />
                </button>
              </div>
              <span variant="h1" style={{...(styles.statValue || {}), color: "#000"}}>
                {showBalance
                  ? (() => {
                      // Use the computed earningsTotal if available, otherwise fallback to 0
                      const base = Number(earningsTotal || 0);
                      const rate = exchangeRates[selectedCurrency.code] || 1;
                      const converted = base * rate;

                      const currencySymbols: { [key: string]: string } = {
                        USD: "$",
                        EUR: "€",
                        GBP: "£",
                        NGN: "₦",
                        CAD: "C$",
                        AUD: "A$",
                        JPY: "¥",
                        KES: "KSh",
                        GHS: "₵",
                        ZAR: "R",
                        CNY: "¥",
                        INR: "₹",
                        BRL: "R$",
                        MXN: "$",
                        RUB: "₽",
                        TRY: "₺",
                        SAR: "﷼",
                        AED: "د.إ",
                        CHF: "Fr.",
                      };
                      const symbol = currencySymbols[selectedCurrency.code] || "";
                      const formatted =
                        converted % 1 === 0
                          ? converted.toLocaleString()
                          : converted.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            });
                      return `${symbol}${formatted}`;
                    })()
                  : "••••"}
              </span>

              <span style={{ color: "#666", marginTop: spacing.xs }}>
                {selectedCurrency.code} Balance
              </span>

              {/* Available Balance Display */}

              <button
                style={{...(styles.withdrawButton || {}), marginTop: spacing.md, ...(availableCents < minWithdrawalCents ? {
                    opacity: 0.45,
                    backgroundColor: "#f2f2f2",
                    borderColor: "#ccc",
                  } : {})}}
                onClick={() => availableCents >= minWithdrawalCents && setShowPasswordModal(true)}
                disabled={availableCents < minWithdrawalCents}
              >
                <span style={styles.withdrawButtonText}>Withdraw</span>
              </button>
              {availableCents < minWithdrawalCents && (
                <span
                  style={{ fontSize: 11, color: "#999", marginTop: spacing.xs }}
                >
                  Minimum $10 required to withdraw
                </span>
              )}
            </div>

            <div
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginRight: spacing.md,
                marginTop: spacing.lg,
                padding: spacing.md,
                backgroundColor: "#f9f9f9",
                borderRadius: 8,
                borderColor: "#ccc",
                borderWidth: 1,
              }}
            >
              <IoChevronBack />
              <span
                style={{
                  flex: 1,
                  color: "#666",
                  fontSize: fontSize.md2,
                  lineHeight: 26,
                }}
              >
                <span style={{ fontWeight: "bold", color: "#000" }}>
                  Estimated payout notice
                </span>
                {"\n\n"}
                Your dashboard balance is an estimate based on qualifying
                engagement on your content.
                {"\n\n"}
                Final monthly payouts come from the creator revenue pool
                allocated for that cycle, so your actual payout depends on your
                share of qualifying engagement compared with other eligible
                creators.
                {"\n\n"}
                If $5,000 is allocated this month, creators receive a share based
                on qualifying engagement. Approved withdrawals are processed
                within 3-5 business days.
              </span>
            </div>
            
          </div>
        </div>
        {/* Currency Selection Modal */}
        {(showCurrencyModal) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setShowCurrencyModal(false)}>
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <span style={styles.modalTitle}>Select Currency</span>
              <div style={{overflowY: "auto", flex: 1}}>
                {currencies.map((currency) => (
                  <button
                    key={currency.code}
                    style={styles.currencyOption}
                    onClick={() => {
                      setSelectedCurrency(currency);
                      setShowCurrencyModal(false);
                    }}
                  >
                    <img src={currency.flag} style={styles.currencyFlag} />
                    <span style={styles.currencyCode}>{currency.code}</span>
                    <span style={styles.currencyName}>{currency.name}</span>
                  </button>
                ))}
              </div>
              <button
                style={styles.closeModalButton}
                onClick={() => setShowCurrencyModal(false)}
              >
                <span style={styles.closeModalText}>Close</span>
              </button>
            </div>
          </div>
        </div>
    )}
        <span style={{...(styles.scrollTitle || {}), color: theme.text}}>
          Engagements
        </span>
        {/* Render latest notifications fetched from Supabase */}
        {notifications.length === 0 ? (
          <span style={{ color: "#666", marginTop: spacing.sm, marginBottom: spacing.sm }}>
            No notifications yet
          </span>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() =>
                router.push("/notifications")
              }
            >
              <div
                style={{...(styles.engagementItem || {}), borderBottomColor: theme.border}}
              >
                <img
                  src={
                    n.meta && n.meta.avatar
                      ? { uri: n.meta.avatar }
                      : "/assets/../assets/engagement.png"
                  }
                  style={styles.engagementAvatar}
                />
                <div style={styles.engagementTextContainer}>
                  <span style={{...(styles.engagementName || {}), color: theme.text}}>
                    {n.title || n.message || "Update"}
                  </span>
                  <span
                    style={{...(styles.engagementMessage || {}), color: theme.secondaryText}}
                  >
                    {n.message || n.body || ""}
                  </span>
                  <span style={{ color: "#666", marginTop: spacing.xs }}>
                    {n.created_at
                      ? new Date(n.created_at).toLocaleString()
                      : ""}
                  </span>
                </div>
                <AiOutlineCheck />
              </div>
            </button>
          ))
        )}
        <div
          style={{...(styles.earningsMetricsSection || {}), backgroundColor: theme.cardBackground,
              borderColor: theme.border,}}
        >
          <div style={styles.earningsHeaderLeft}>
            <MdCheck />
            <span style={{...(styles.earningsMetricsTitle || {}), color: theme.text}}>
              Creator payment policy
            </span>
          </div>
          <span
            style={{...(styles.earningsDescription || {}), color: theme.secondaryText, marginTop: spacing.sm}}
          >
            Review creator eligibility, payout timing, and platform fees in the
            Monetization screen.
          </span>
          <button
            style={styles.policyLinkButton}
            onClick={() => router.push("/monetization")}
          >
            <span style={styles.policyLinkButtonText}>Open Monetization</span>
            <IoChevronBack />
          </button>
        </div>
        {/* Payment Methods Section */}
        <div style={{ marginTop: spacing.xl2, marginBottom: spacing.lg }}>
          <div
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.base,
            }}
          >
            <span style={{...(styles.scrollTitle || {}), color: theme.text}}>
              Payment Methods
            </span>
            <button
              onClick={() => {
                setShowPaymentMethodModal(true);
                fetchPaymentMethods();
              }}
              style={{
                backgroundColor: "#00BFFF",
                paddingLeft: spacing.base,
    paddingRight: spacing.base,
                paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
                borderRadius: radius.md,
              }}
            >
              <span style={{ color: "#fff", fontSize: fontSize.md, fontWeight: "600" }}>
                + Add Method
              </span>
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <div
              style={{
                padding: spacing.lg,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: radius.lg,
                alignItems: "center",
              }}
            >
              <IoChevronBack />
              <span
                style={{ color: "#666", marginTop: spacing.md, textAlign: "center" }}
              >
                No payment methods added yet.{"\n"}Add one to receive payouts.
              </span>
            </div>
          ) : (
            paymentMethods.map((method) => (
              <div
                key={method.id}
                style={{
                  padding: spacing.base,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: radius.lg,
                  marginBottom: spacing.md,
                  backgroundColor: theme.cardBackground,
                }}
              >
                <div
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: spacing.xs,
                      }}
                    >
                      <IoChevronBack />
                      <span
                        style={{
                          fontSize: fontSize.base,
                          fontWeight: "600",
                          color: theme.text,
                          textTransform: "capitalize",
                        }}
                      >
                        {method.payment_type === "mobile_money"
                          ? "Mobile Money"
                          : method.payment_type}
                      </span>
                      {method.is_primary && (
                        <div
                          style={{
                            backgroundColor: "#00BFFF",
                            paddingLeft: spacing.sm,
    paddingRight: spacing.sm,
                            paddingTop: spacing.px,
    paddingBottom: spacing.px,
                            borderRadius: radius.xs,
                            marginLeft: spacing.sm,
                          }}
                        >
                          <span style={{ color: "#fff", fontSize: fontSize.xs }}>
                            PRIMARY
                          </span>
                        </div>
                          )}
                    </div>
                    {method.payment_type === "bank" && (
                      <span
                        style={{ color: theme.secondaryText, fontSize: fontSize.md }}
                      >
                        {method.bank_name} - {method.account_number?.slice(-4)}
                      </span>
                  )}
                    {method.payment_type === "paypal" && (
                      <span
                        style={{ color: theme.secondaryText, fontSize: fontSize.md }}
                      >
                        {method.paypal_email}
                      </span>
                  )}
                    {method.payment_type === "mobile_money" && (
                      <span
                        style={{ color: theme.secondaryText, fontSize: fontSize.md }}
                      >
                        {method.mobile_money_provider} -{" "}
                        {method.mobile_money_number}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    style={{ padding: spacing.xs }}
                  >
                    <IoChevronBack />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Withdrawal History Section */}
        <div style={{ marginTop: spacing.lg, marginBottom: spacing.lg }}>
          <div
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: spacing.base,
            }}
          >
            <span style={{...(styles.scrollTitle || {}), color: theme.text}}>
              Withdrawal History
            </span>
            <button
              onClick={() => {
                setShowWithdrawalHistory(true);
                fetchWithdrawalHistory();
              }}
            >
              <span style={{ color: "#00BFFF", fontSize: fontSize.base }}>View All</span>
            </button>
          </div>

          {withdrawalHistory.length === 0 ? (
            <div
              style={{
                padding: spacing.lg,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: radius.lg,
                alignItems: "center",
              }}
            >
              <IoChevronBack />
              <span style={{ color: "#666", marginTop: spacing.md }}>
                No withdrawal history yet.
              </span>
            </div>
          ) : (
            withdrawalHistory.slice(0, 3).map((withdrawal) => (
              <div
                key={withdrawal.id}
                style={{
                  padding: spacing.base,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: radius.lg,
                  marginBottom: spacing.md,
                  backgroundColor: theme.cardBackground,
                }}
              >
                <div
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <span
                      style={{
                        fontSize: fontSize.lg,
                        fontWeight: "600",
                        color: theme.text,
                      }}
                    >
                      ${Number(withdrawal.amount || 0).toFixed(2)}
                    </span>
                    <span
                      style={{
                        color: theme.secondaryText,
                        fontSize: fontSize.md,
                        marginTop: spacing.xs,
                      }}
                    >
                      {withdrawal.metric || "General"} •{" "}
                      {new Date(withdrawal.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div
                    style={{
                      backgroundColor:
                        withdrawal.status === "completed"
                          ? "#34C759"
                          : withdrawal.status === "pending"
                            ? "#FF9500"
                            : "#FF3B30",
                      paddingLeft: spacing.md,
    paddingRight: spacing.md,
                      paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
                      borderRadius: radius.sm,
                    }}
                  >
                    <span
                      style={{
                        color: "#fff",
                        fontSize: fontSize.sm,
                        fontWeight: "600",
                        textTransform: "capitalize",
                      }}
                    >
                      {withdrawal.status || "pending"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* View All Feedbacks Button */}
        <div style={styles.viewAllContainer}>
          <button
            onClick={() => router.push("/notifications")}
            style={styles.viewAllButton}
          >
            <span style={styles.viewAllButtonText}>View All Notifications</span>
          </button>
        </div>
        {/* Password Verification Modal */}
        {(showPasswordModal) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => {
            setShowPasswordModal(false);
            setPassword("");
          }}>
          <div style={styles.modalOverlay}>
            <div style={{...(styles.modalContent || {}), width: "90%"}}>
              <span style={styles.modalTitle}>Verify Your Identity</span>
              <span style={{ fontSize: fontSize.md, color: "#666", marginBottom: spacing.base }}>
                Please enter your password to continue
              </span>
              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                
                style={{
                  borderWidth: 1,
                  borderColor: "#eee",
                  padding: spacing.md,
                  fontSize: fontSize.base,
                  marginBottom: spacing.base,
                  borderRadius: radius.md,
                }}
              />
              <div
                style={{ flexDirection: "row", justifyContent: "flex-end" }}
              >
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword("");
                  }}
                  style={{...(styles.closeModalButton || {}), marginRight: spacing.sm}}
                >
                  <span style={styles.closeModalText}>Cancel</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { data: userData } = await supabase.auth.getUser();
                      const userEmail = userData?.user?.email;
                      if (!userEmail || !password) {
                        window.alert("Please enter your password");
                        return;
                      }

                      // Verify password by attempting sign in
                      const { error } = await supabase.auth.signInWithPassword({
                        email: userEmail,
                        password: password,
                      });

                      if (error) {
                        window.alert("The password you entered is incorrect");
                        return;
                      }

                      // Password verified, clear it and show withdraw modal
                      setPassword("");
                      setShowPasswordModal(false);
                      setShowWithdrawModal(true);
                    } catch (e) {
                      console.warn("Password verification error", e);
                      window.alert("Failed to verify password");
                    }
                  }}
                  style={{...(styles.withdrawButton || {}), marginLeft: 0}}
                >
                  <span style={styles.withdrawButtonText}>Verify</span>
                </button>
              </div>
            </div>
          </div>
        </div>
    )}
        {/* Withdraw Modal */}
        {(showWithdrawModal) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => {
            setShowWithdrawModal(false);
            setWithdrawAmount("");
            setWithdrawNote("");
          }}>
          <div style={styles.modalOverlay}>
            <div style={{...(styles.modalContent || {}), width: "90%"}}>
              <span style={styles.modalTitle}>Request Payout</span>
              <div style={{ marginBottom: spacing.md }}>
                <span style={{ fontSize: fontSize.base, color: "#666", marginBottom: spacing.xs }}>
                  Amount ({selectedCurrency.code})
                </span>
                <div style={{ flexDirection: "row", alignItems: "center" }}>
                  <span style={{ fontSize: fontSize.xl, color: "#333", marginRight: spacing.sm }}>
                    {(() => {
                      const currencySymbols: { [key: string]: string } = {
                        USD: "$",
                        EUR: "€",
                        GBP: "£",
                        NGN: "₦",
                        CAD: "C$",
                        AUD: "A$",
                        JPY: "¥",
                        KES: "KSh",
                        GHS: "₵",
                        ZAR: "R",
                        CNY: "¥",
                        INR: "₹",
                        BRL: "R$",
                        MXN: "$",
                        RUB: "₽",
                        TRY: "₺",
                        SAR: "﷼",
                        AED: "د.إ",
                        CHF: "Fr.",
                      };
                      return currencySymbols[selectedCurrency.code] || "$";
                    })()}
                  </span>
                  <input
                    placeholder="0.00"
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    style={{
                      flex: 1,
                      borderWidth: 1,
                      fontSize: fontSize.xl,
                      borderColor: "#eee",
                      padding: spacing.md,
                      borderRadius: radius.md,
                    }}
                  />
                </div>
              </div>
              <input
                placeholder="Note (optional)"
                value={withdrawNote}
                onChange={(e) => setWithdrawNote(e.target.value)}
                style={{
                  borderWidth: 1,
                  borderColor: "#eee",
                  padding: spacing.md,
                  fontSize: fontSize.base,
                  marginBottom: spacing.md,
                  borderRadius: radius.md,
                }}
              />
              <div
                style={{ flexDirection: "row", justifyContent: "flex-end" }}
              >
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  style={{...(styles.closeModalButton || {}), marginRight: spacing.sm}}
                >
                  <span style={styles.closeModalText}>Cancel</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { data: userData } = await supabase.auth.getUser();
                      const userId = userData?.user?.id;
                      if (!userId) return;

                      const amt = Number(withdrawAmount) || 0;

                      // Validate minimum amount
                      if (amt < 1) {
                        window.alert("The minimum payout request is $1.00");
                        return;
                      }

                      // Validate amount doesn't exceed balance
                      const currentBalance = Math.max(
                        Number(earningsTotal || 0),
                        Number(availableCents || 0) / 100,
                      );
                      if (amt > currentBalance) {
                        window.alert(`You cannot request more than your current balance of $${currentBalance.toFixed(
                            2,
                          )}`);
                        return;
                      }

                      // Check if user has 2FA enabled
                      const has2FA = await twoFactorAuth.is2FAEnabled(userId);
                      if (has2FA) {
                        // Store withdrawal details and show 2FA modal
                        setPendingWithdrawal({ amt, userId });
                        setShowWithdrawModal(false);
                        setShow2FAModal(true);
                        return;
                      }

                      const { data, error } = await supabase
                        .from("withdrawals")
                        .insert([
                          {
                            user_id: userId,
                            amount: amt,
                            metric: "manual",
                            note: withdrawNote || null,
                            status: "pending",
                          },
                        ])
                        .select();

                      if (error) {
                        console.warn("Withdraw request failed", error);
                        window.alert("Failed to submit payout request. Please try again.");
                      } else {
                        console.log("Withdraw created", data);

                        // Send email notification to admin
                        try {
                          const currencySymbols: { [key: string]: string } = {
                            USD: "$",
                            EUR: "€",
                            GBP: "£",
                            NGN: "₦",
                            CAD: "C$",
                            AUD: "A$",
                            JPY: "¥",
                            KES: "KSh",
                            GHS: "₵",
                            ZAR: "R",
                            CNY: "¥",
                            INR: "₹",
                            BRL: "R$",
                            MXN: "$",
                            RUB: "₽",
                            TRY: "₺",
                            SAR: "﷼",
                            AED: "د.إ",
                            CHF: "Fr.",
                          };
                          const symbol =
                            currencySymbols[selectedCurrency.code] || "$";

                          await sendEmail({
                            to: "hello@verrsa.org",
                            subject: "New Payout Request",
                            text: `A new payout request has been submitted:\n\nUser ID: ${userId}\nAmount: ${symbol}${amt.toFixed(
                              2,
                            )} ${selectedCurrency.code}\nNote: ${
                              withdrawNote || "N/A"
                            }\n\nPlease review in the admin dashboard.`,
                          });
                        } catch (emailError) {
                          console.warn(
                            "Failed to send email notification",
                            emailError,
                          );
                        }

                        window.alert("Your payout request has been submitted and will be reviewed shortly.");
                        setShowWithdrawModal(false);
                        setWithdrawAmount("");
                        setWithdrawNote("");
                      }
                    } catch (e) {
                      console.warn("Withdraw error", e);
                      window.alert("An error occurred. Please try again.");
                    }
                  }}
                  style={{...(styles.withdrawButton || {}), marginLeft: 0}}
                >
                  <span style={styles.withdrawButtonText}>Request Payout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
    )}
        {/* 2FA Verification Modal */}
        {(show2FAModal) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => {
            setShow2FAModal(false);
            setTwoFACode("");
            setPendingWithdrawal(null);
          }}>
          <div style={styles.modalOverlay}>
            <div style={{...(styles.modalContent || {}), width: "90%"}}>
              <span style={styles.modalTitle}>Two-Factor Authentication</span>
              <span style={{ fontSize: fontSize.md, color: "#666", marginBottom: spacing.base }}>
                Enter the 6-digit code from your authenticator app
              </span>
              <input
                placeholder="000000"
                
                maxLength={6}
                value={twoFACode}
                onChange={(e) => setTwoFACode(e.target.value)}
                style={{
                  borderWidth: 1,
                  borderColor: "#eee",
                  padding: spacing.md,
                  fontSize: fontSize.xl,
                  marginBottom: spacing.base,
                  borderRadius: radius.md,
                  textAlign: "center",
                  letterSpacing: 8,
                }}
              />
              <div
                style={{ flexDirection: "row", justifyContent: "flex-end" }}
              >
                <button
                  onClick={() => {
                    setShow2FAModal(false);
                    setTwoFACode("");
                    setPendingWithdrawal(null);
                    setShowWithdrawModal(true);
                  }}
                  style={{...(styles.closeModalButton || {}), marginRight: spacing.sm}}
                >
                  <span style={styles.closeModalText}>Cancel</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (!twoFACode || twoFACode.length !== 6) {
                        window.alert("Please enter a 6-digit code");
                        return;
                      }

                      if (!pendingWithdrawal) return;

                      const { userId, amt } = pendingWithdrawal;

                      // Verify 2FA code
                      const result = await twoFactorAuth.verify2FACode(
                        userId,
                        twoFACode,
                      );

                      if (!result.success) {
                        window.alert(result.message || "The code you entered is incorrect");
                        return;
                      }

                      // 2FA verified, proceed with withdrawal
                      const { data, error } = await supabase
                        .from("withdrawals")
                        .insert([
                          {
                            user_id: userId,
                            amount: amt,
                            metric: "manual",
                            note: withdrawNote || null,
                            status: "pending",
                          },
                        ])
                        .select();

                      if (error) {
                        console.warn("Withdraw request failed", error);
                        window.alert("Failed to submit payout request. Please try again.");
                      } else {
                        console.log("Withdraw created", data);

                        // Send email notification to admin
                        try {
                          const currencySymbols: { [key: string]: string } = {
                            USD: "$",
                            EUR: "€",
                            GBP: "£",
                            NGN: "₦",
                            CAD: "C$",
                            AUD: "A$",
                            JPY: "¥",
                            KES: "KSh",
                            GHS: "₵",
                            ZAR: "R",
                            CNY: "¥",
                            INR: "₹",
                            BRL: "R$",
                            MXN: "$",
                            RUB: "₽",
                            TRY: "₺",
                            SAR: "﷼",
                            AED: "د.إ",
                            CHF: "Fr.",
                          };
                          const symbol =
                            currencySymbols[selectedCurrency.code] || "$";

                          await sendEmail({
                            to: "hello@verrsa.org",
                            subject: "New Payout Request",
                            text: `A new payout request has been submitted:\n\nUser ID: ${userId}\nAmount: ${symbol}${amt.toFixed(
                              2,
                            )} ${selectedCurrency.code}\nNote: ${
                              withdrawNote || "N/A"
                            }\n\nPlease review in the admin dashboard.`,
                          });
                        } catch (emailError) {
                          console.warn(
                            "Failed to send email notification",
                            emailError,
                          );
                        }

                        window.alert("Your payout request has been submitted and will be reviewed shortly.");
                        setShow2FAModal(false);
                        setTwoFACode("");
                        setPendingWithdrawal(null);
                        setWithdrawAmount("");
                        setWithdrawNote("");
                      }
                    } catch (e) {
                      console.warn("2FA verification error", e);
                      window.alert("An error occurred. Please try again.");
                    }
                  }}
                  style={{...(styles.withdrawButton || {}), marginLeft: 0}}
                >
                  <span style={styles.withdrawButtonText}>Verify & Submit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
    )}
        {/* Payment Method Modal */}
        {(showPaymentMethodModal) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setShowPaymentMethodModal(false)}>
          <div style={styles.modalOverlay}>
            <div
              style={{...(styles.modalContent || {}), width: "95%", maxHeight: "85%"}}
            >
              <div
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: spacing.lg,
                }}
              >
                <span style={styles.modalTitle}>Add Payment Method</span>
                <button
                  onClick={() => setShowPaymentMethodModal(false)}
                >
                  <IoClose />
                </button>
              </div>

              <div style={{overflowY: "auto", flex: 1}}>
                {/* Payment Type Selection */}
                <span
                  style={{ fontSize: fontSize.base, fontWeight: "600", marginBottom: spacing.md }}
                >
                  Payment Type
                </span>
                <div
                  style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg }}
                >
                  <button
                    style={{...(styles.paymentTypeButton || {}), ...(selectedPaymentType === "bank" ? styles.paymentTypeButtonActive : {})}}
                    onClick={() => setSelectedPaymentType("bank")}
                  >
                    <IoChevronBack />
                    <span
                      style={
                        selectedPaymentType === "bank"
                          ? styles.paymentTypeTextActive
                          : styles.paymentTypeText
                      }
                    >
                      Bank
                    </span>
                  </button>
                  <button
                    style={{...(styles.paymentTypeButton || {}), ...(selectedPaymentType === "paypal" ? styles.paymentTypeButtonActive : {})}}
                    onClick={() => setSelectedPaymentType("paypal")}
                  >
                    <IoChevronBack />
                    <span
                      style={
                        selectedPaymentType === "paypal"
                          ? styles.paymentTypeTextActive
                          : styles.paymentTypeText
                      }
                    >
                      PayPal
                    </span>
                  </button>
                  <button
                    style={{...(styles.paymentTypeButton || {}), ...(selectedPaymentType === "mobile_money" ? styles.paymentTypeButtonActive : {})}}
                    onClick={() => setSelectedPaymentType("mobile_money")}
                  >
                    <IoChevronBack />
                    <span
                      style={
                        selectedPaymentType === "mobile_money"
                          ? styles.paymentTypeTextActive
                          : styles.paymentTypeText
                      }
                    >
                      Mobile
                    </span>
                  </button>
                </div>

                {/* Bank Account Fields */}
                {selectedPaymentType === "bank" && (
                  <>
                    <span
                      style={{ fontSize: fontSize.md, color: "#666", marginBottom: spacing.xs }}
                    >
                      Account Name
                    </span>
                    <input
                      placeholder="John Doe"
                      value={paymentFormData.account_name}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, account_name: e.target.value })}
                      style={styles.paymentInput}
                    />
                    <span
                      style={{
                        fontSize: fontSize.md,
                        color: "#666",
                        marginBottom: spacing.xs,
                        marginTop: spacing.base,
                      }}
                    >
                      Account Number
                    </span>
                    <input
                      placeholder="1234567890"
                      type="number"
                      value={paymentFormData.account_number}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, account_number: e.target.value })}
                      style={styles.paymentInput}
                    />
                    <span
                      style={{
                        fontSize: fontSize.md,
                        color: "#666",
                        marginBottom: spacing.xs,
                        marginTop: spacing.base,
                      }}
                    >
                      Bank Name
                    </span>
                    <input
                      placeholder="Bank of America"
                      value={paymentFormData.bank_name}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, bank_name: e.target.value })}
                      style={styles.paymentInput}
                    />
                    <span
                      style={{
                        fontSize: fontSize.md,
                        color: "#666",
                        marginBottom: spacing.xs,
                        marginTop: spacing.base,
                      }}
                    >
                      Routing Number (Optional)
                    </span>
                    <input
                      placeholder="123456789"
                      type="number"
                      value={paymentFormData.routing_number}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, routing_number: e.target.value })}
                      style={styles.paymentInput}
                    />
                  </>
                )}

                {/* PayPal Fields */}
                {selectedPaymentType === "paypal" && (
                  <>
                    <span
                      style={{ fontSize: fontSize.md, color: "#666", marginBottom: spacing.xs }}
                    >
                      PayPal Email
                    </span>
                    <input
                      placeholder="your@email.com"
                      type="email"
                      
                      value={paymentFormData.paypal_email}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paypal_email: e.target.value })}
                      style={styles.paymentInput}
                    />
                  </>
                )}

                {/* Mobile Money Fields */}
                {selectedPaymentType === "mobile_money" && (
                  <>
                    <span
                      style={{ fontSize: fontSize.md, color: "#666", marginBottom: spacing.xs }}
                    >
                      Provider
                    </span>
                    <input
                      placeholder="M-Pesa, MTN, Airtel, etc."
                      value={paymentFormData.mobile_money_provider}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, mobile_money_provider: e.target.value })}
                      style={styles.paymentInput}
                    />
                    <span
                      style={{
                        fontSize: fontSize.md,
                        color: "#666",
                        marginBottom: spacing.xs,
                        marginTop: spacing.base,
                      }}
                    >
                      Phone Number
                    </span>
                    <input
                      placeholder="+254712345678"
                      type="tel"
                      value={paymentFormData.mobile_money_number}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, mobile_money_number: e.target.value })}
                      style={styles.paymentInput}
                    />
                  </>
                )}

                <button
                  style={{
                    backgroundColor: "#00BFFF",
                    padding: spacing.base,
                    borderRadius: radius.md,
                    alignItems: "center",
                    marginTop: spacing.xl2,
                    marginBottom: spacing.lg,
                  }}
                  onClick={handleSavePaymentMethod}
                >
                  <span
                    style={{ color: "#fff", fontSize: fontSize.base, fontWeight: "600" }}
                  >
                    Save Payment Method
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
    )}
        {/* Withdrawal History Modal */}
        {(showWithdrawalHistory) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setShowWithdrawalHistory(false)}>
          <div style={styles.modalOverlay}>
            <div
              style={{...(styles.modalContent || {}), width: "95%", maxHeight: "80%"}}
            >
              <div
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: spacing.base,
                }}
              >
                <span style={styles.modalTitle}>Withdrawal History</span>
                <button
                  onClick={() => setShowWithdrawalHistory(false)}
                >
                  <IoClose />
                </button>
              </div>

              {loadingHistory ? (
                <div style={{display: "flex", justifyContent: "center", alignItems: "center"}}><div style={{width: 24, height: 24, borderRadius: "50%", border: "3px solid #00bfff", borderTopColor: "transparent", animation: "spin 1s linear infinite"}} /></div>
              ) : withdrawalHistory.length === 0 ? (
                <div style={{ alignItems: "center", paddingTop: spacing.xl3, paddingBottom: spacing.xl3 }}>
                  <IoChevronBack />
                  <span style={{ color: "#666", marginTop: spacing.base, fontSize: fontSize.base }}>
                    No withdrawal history yet.
                  </span>
                </div>
              ) : (
                <div style={{overflowY: "auto", flex: 1}}>
                  {withdrawalHistory.map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      style={{
                        padding: spacing.base,
                        borderWidth: 1,
                        borderColor: "#eee",
                        borderRadius: radius.lg,
                        marginBottom: spacing.md,
                        backgroundColor: "#f9f9f9",
                      }}
                    >
                      <div
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: spacing.md,
                        }}
                      >
                        <span style={{ fontSize: fontSize.xl, fontWeight: "600" }}>
                          ${Number(withdrawal.amount || 0).toFixed(2)}
                        </span>
                        <div
                          style={{
                            backgroundColor:
                              withdrawal.status === "completed"
                                ? "#34C759"
                                : withdrawal.status === "pending"
                                  ? "#FF9500"
                                  : "#FF3B30",
                            paddingLeft: spacing.md,
    paddingRight: spacing.md,
                            paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
                            borderRadius: radius.sm,
                          }}
                        >
                          <span
                            style={{
                              color: "#fff",
                              fontSize: fontSize.sm,
                              fontWeight: "600",
                              textTransform: "capitalize",
                            }}
                          >
                            {withdrawal.status || "pending"}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{ color: "#666", fontSize: fontSize.md, marginBottom: spacing.xs }}
                      >
                        Type: {withdrawal.metric || "General Earnings"}
                      </span>
                      <span
                        style={{ color: "#666", fontSize: fontSize.md, marginBottom: spacing.xs }}
                      >
                        Date:{" "}
                        {new Date(withdrawal.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )}
                      </span>
                      {withdrawal.note && (
                        <span
                          style={{
                            color: "#666",
                            fontSize: fontSize.sm2,
                            marginTop: spacing.sm,
                            fontStyle: "italic",
                          }}
                        >
                          Note: {withdrawal.note}
                        </span>
                          )}
                    </div>
                  ))}
                </div>
                          )}
            </div>
          </div>
        </div>
    )}
        {/* Gift Earnings Modal */}
        {(showGiftEarningsModal) && (<div style={{position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)"}} onClick={() => setShowGiftEarningsModal(false)}>
          <div style={styles.modalOverlay}>
            <div
              style={{...(styles.modalContent || {}), width: "95%", maxHeight: "80%"}}
            >
              <div
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: spacing.base,
                }}
              >
                <span style={styles.modalTitle}>Live Gift Earnings 🎁</span>
                <button
                  onClick={() => setShowGiftEarningsModal(false)}
                >
                  <AiOutlineCheck />
                </button>
              </div>

              {loadingGifts ? (
                <div style={{ padding: spacing.xl3, alignItems: "center" }}>
                  <span style={{ color: "#666" }}>Loading earnings...</span>
                </div>
              ) : (
                <>
                  {/* Earnings Summary */}
                  {giftEarnings && (
                    <div
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderRadius: radius.lg,
                        padding: spacing.base,
                        marginBottom: spacing.lg,
                      }}
                    >
                      <div
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: spacing.md,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span
                            style={{
                              fontSize: fontSize.base,
                              color: "#666",
                              marginBottom: spacing.xs,
                            }}
                          >
                            Total Earnings
                          </span>
                          <span
                            style={{
                              fontSize: fontSize.xl3,
                              fontWeight: "600",
                              color: "#000",
                            }}
                          >
                            $
                            {parseFloat(
                              giftEarnings.total_earnings || 0,
                            ).toFixed(2)}
                          </span>
                        </div>
                        <div style={{ flex: 1, alignItems: "flex-end" }}>
                          <span
                            style={{
                              fontSize: fontSize.sm,
                              color: "#666",
                              marginBottom: spacing.xs,
                            }}
                          >
                            Available
                          </span>
                          <span
                            style={{
                              fontSize: fontSize.xl3,
                              fontWeight: "600",
                              color: "#00BFFF",
                            }}
                          >
                            $
                            {parseFloat(
                              giftEarnings.available_balance || 0,
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          paddingTop: spacing.md,
                          borderTopWidth: 1,
                          borderTopColor: "#e0e0e0",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: fontSize.sm, color: "#666" }}>
                            Gifts: {giftEarnings.gift_count || 0}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: fontSize.sm, color: "#666" }}>
                            Sponsors: {giftEarnings.sponsor_count || 0}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize: fontSize.sm, color: "#666" }}>
                            Donations: {giftEarnings.donate_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                )}
                  {/* Recent Gifts List */}
                  <span
                    style={{
                      fontSize: fontSize.base,
                      fontWeight: "600",
                      marginBottom: spacing.md,
                    }}
                  >
                    Recent Gifts
                  </span>
                  <div style={{ maxHeight: 350, overflowY: "auto" }}>
                    {recentGifts.length === 0 ? (
                      <div style={{ padding: spacing.lg, alignItems: "center" }}>
                        <span style={{ color: "#999", fontSize: fontSize.md }}>
                          No gifts received yet
                        </span>
                        <span
                          style={{ color: "#999", fontSize: fontSize.sm, marginTop: spacing.xs }}
                        >
                          Start a live stream to receive gifts from viewers!
                        </span>
                      </div>
                    ) : (
                      recentGifts.map((gift) => (
                        <div
                          key={gift.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingTop: spacing.md,
    paddingBottom: spacing.md,
                            borderBottomWidth: 1,
                            borderBottomColor: "#f0f0f0",
                          }}
                        >
                          <img
                            src={
                              gift.sender_avatar
                                ? { uri: gift.sender_avatar }
                                : "/assets/../assets/avatar.jpg"
                            }
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: radius.xl2,
                              marginRight: spacing.md,
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: fontSize.md, fontWeight: "500" }}>
                              {gift.sender_full_name ||
                                gift.sender_username ||
                                "Anonymous"}
                            </span>
                            <span
                              style={{
                                fontSize: fontSize.sm,
                                color: "#666",
                                marginTop: spacing.px,
                              }}
                            >
                              {gift.gift_type === "gift"
                                ? `Sent ${gift.gift_name}`
                                : gift.gift_type === "sponsor"
                                  ? "Sponsored you"
                                  : "Donated"}
                            </span>
                            <span
                              style={{
                                fontSize: fontSize.xs,
                                color: "#999",
                                marginTop: spacing.px,
                              }}
                            >
                              {new Date(gift.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ alignItems: "flex-end" }}>
                            <span
                              style={{
                                fontSize: fontSize.base,
                                fontWeight: "600",
                                color: "#00BFFF",
                              }}
                            >
                              ${parseFloat(gift.recipient_amount).toFixed(2)}
                            </span>
                            <span
                              style={{
                                fontSize: fontSize.xs,
                                color: "#999",
                                marginTop: spacing.px,
                              }}
                            >
                              ${parseFloat(gift.total_amount).toFixed(2)} total
                            </span>
                            {gift.withdrawn && (
                              <span
                                style={{
                                  fontSize: fontSize.xs,
                                  color: "#666",
                                  marginTop: spacing.px,
                                  fontStyle: "italic",
                                }}
                              >
                                ✓ Withdrawn
                              </span>
                                )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Withdraw Button */}
                  {giftEarnings &&
                    parseFloat(giftEarnings.available_balance || 0) > 0 && (
                      <button
                        onClick={handleWithdrawGiftEarnings}
                        style={{
                          backgroundColor: "#00BFFF",
                          paddingTop: spacing.base,
    paddingBottom: spacing.base,
                          borderRadius: radius.md,
                          alignItems: "center",
                          marginTop: spacing.base,
                        }}
                      >
                        <span
                          style={{
                            color: "#fff",
                            fontSize: fontSize.base,
                            fontWeight: "600",
                          }}
                        >
                          Withdraw $
                          {parseFloat(giftEarnings.available_balance).toFixed(
                            2,
                          )}
                        </span>
                      </button>
                          )}
                </>
              )}
            </div>
          </div>
        </div>
                          )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  backButton: {
    position: "absolute",
    top: 67,
    left: 20,
    zIndex: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 50,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: 50,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 3,
    marginRight: spacing.md,
  },
  infoText: {
    fontSize: fontSize.lg,
    fontWeight: "400",
  },
  infoSubText: {
    fontSize: fontSize.md,
    color: "#666",
    marginTop: spacing.xs,
  },
  currencySelector: {
    flexDirection: "row",
    width: 120,
    height: 50,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.full,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    marginTop: spacing.px,
  },
  currencyFlag: {
    width: 30,
    height: 30,
    borderRadius: radius.lg,
    marginRight: spacing.md,
  },
  selectCurrency: {
    fontSize: fontSize.base,
    fontWeight: "400",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    width: "90%",
    maxHeight: "60%",
    padding: spacing.lg,
  },
  modalTitle: {
    fontWeight: "400",
    fontSize: fontSize.xl,
    marginBottom: spacing.base,
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#eee", // Note: This is in a modal with white background
  },
  currencyCode: {
    fontSize: fontSize.xl,
    fontWeight: "400",
  },
  currencyName: {
    marginLeft: spacing.sm,
    color: "#666",
  },
  closeModalButton: {
    marginTop: spacing.base,
    alignSelf: "flex-end",
    padding: spacing.sm,
    borderRadius: radius.xs,
    backgroundColor: "#eee",
  },
  closeModalText: {
    fontSize: fontSize.xl,
    color: "#00BFFF",
    fontWeight: "400",
  },
  statsContainer: {
    position: "relative",
    borderColor: "#8ce2ffff",
    backgroundColor: "#E8FBFE",
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.base,
    marginBottom: spacing.lg,
    overflow: "hidden",
  },
  statBox: {
    alignItems: "flex-start",
    zIndex: 1,
  },
  statTitle: {
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    color: "#000",
  },
  statValue: {
    fontSize: fontSize.xl5,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  withdrawButton: {
    borderColor: "#00BFFF",
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    alignItems: "center",
    marginTop: 25,
  },
  withdrawButtonText: {
    color: "#00BFFF",
    fontSize: fontSize.xl2,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: spacing.xl2,
  },
  scrollTitle: {
    fontSize: fontSize.lg,
    fontWeight: "400",
    marginBottom: spacing.px,
  },
  engagementItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.base,
    paddingBottom: spacing.base,

    borderBottomWidth: 1,
    borderBottomColor: "transparent", // Will use dynamic border via inline style
  },
  engagementAvatar: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    marginRight: spacing.base,
  },
  engagementTextContainer: {
    flex: 1,
  },
  engagementName: {
    fontSize: fontSize.base,
    fontWeight: "400",
  },
  engagementInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  engagementMessage: {
    fontSize: fontSize.md,
    color: "#666",
    marginTop: spacing.px,
  },
  engagementTime: {
    fontSize: fontSize.sm,
    color: "#aaa",
    marginTop: spacing.px,
  },
  viewAllContainer: {
    alignItems: "center",
    marginTop: spacing.lg,
  },
  viewAllButton: {
    borderColor: "#909090ff",
    borderWidth: 1,
    borderRadius: radius.full,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: 25,
    paddingRight: 25,
    alignItems: "center",
  },
  viewAllButtonText: {
    color: "#909090ff",
    fontSize: fontSize.sm2,
    fontWeight: "400",
  },
  earningsMetricsSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  earningsMetricsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  earningsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  earningsMetricsTitle: {
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  earningsMetricsContent: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  earningsDescription: {
    fontSize: fontSize.md,
    lineHeight: 20,
    marginBottom: spacing.base,
  },
  policyLinkButton: {
    backgroundColor: "#00BFFF",
    borderRadius: radius.md,
    paddingLeft: spacing.base,
    paddingRight: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  policyLinkButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  metricsTable: {
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tableHeaderRow: {
    backgroundColor: "#f7f7f7",
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    padding: spacing.md,
    textAlign: "center",
    fontSize: fontSize.sm2,
  },
  tableHeaderCell: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  paymentTypeButton: {
    flex: 1,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: radius.lg,
    alignItems: "center",
    gap: spacing.xs,
  },
  paymentTypeButtonActive: {
    backgroundColor: "#00BFFF",
    borderColor: "#00BFFF",
  },
  paymentTypeText: {
    fontSize: fontSize.sm,
    color: "#666",
  },
  paymentTypeTextActive: {
    fontSize: fontSize.sm,
    color: "#fff",
    fontWeight: "600",
  },
  paymentInput: {
    borderWidth: 1,
    borderColor: "#eee",
    padding: spacing.md,
    fontSize: fontSize.base,
    borderRadius: radius.md,
    backgroundColor: "#f9f9f9",
  },
};

// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  IoChevronBack,
  IoCheckmarkCircle,
  IoWalletOutline,
  IoShareSocialOutline,
  IoPeopleOutline,
  IoTimeOutline,
  IoAlertCircleOutline,
  IoCloseOutline,
  IoArrowDownOutline,
  IoAddCircleOutline,
} from 'react-icons/io5';
import { supabase } from '../../components/supabase';
import { useTheme } from '../../context/ThemeProvider';

const MINIMUM_WITHDRAWAL = 2000; // naira

const TASKS = [
  {
    id: 'share_post_status',
    title: 'Share Verrsa on Your Status',
    description:
      'Share any Verrsa post or content on your WhatsApp status, Instagram story, or any social media story/status.',
    reward: 200,
    icon: 'share',
    instructions: [
      'Go to any Verrsa post or content.',
      'Tap the share button and share it to your WhatsApp status, Instagram story, or similar.',
      'Once shared, come back here and click Completed.',
    ],
  },
  {
    id: 'friend_referral_active',
    title: 'Refer Friends Who Create Content',
    description:
      'Tell your friends about Verrsa. Once they sign up, go live or create a post/content on Verrsa, you earn this reward.',
    reward: 500,
    icon: 'people',
    instructions: [
      'Tell your friends about Verrsa and encourage them to sign up.',
      'Ask them to go live, create a post, or upload content on Verrsa.',
      'Once at least one friend does this, come back here and click Completed.',
    ],
  },
];

export default function AmbassadorDashboard() {
  const router = useRouter();
  const { theme, colors, isDarkMode } = useTheme();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [completions, setCompletions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // Task completion state
  const [completing, setCompleting] = useState<string | null>(null);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  // Withdraw modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [bankForm, setBankForm] = useState({
    account_name: '',
    account_number: '',
    bank_name: '',
  });
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Confirmation modal
  const [confirmTask, setConfirmTask] = useState<any>(null);

  // History drawer
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;

      if (!authUser) {
        router.replace('/auth');
        return;
      }
      setUser(authUser);

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', authUser.id)
        .single();
      setProfile(profileData);

      // Load task completions
      const { data: completionData } = await supabase
        .from('ambassador_task_completions')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      const comps = completionData || [];
      setCompletions(comps);

      // Load withdrawals
      const { data: withdrawalData } = await supabase
        .from('ambassador_withdrawals')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      const wds = withdrawalData || [];
      setWithdrawals(wds);

      // Calculate balance: sum of approved completions minus paid withdrawals
      const earned = comps
        .filter((c) => c.status === 'approved')
        .reduce((sum, c) => sum + (c.amount || 0), 0);

      const withdrawn = wds
        .filter((w) => w.status === 'paid')
        .reduce((sum, w) => sum + (w.amount || 0), 0);

      setBalance(earned - withdrawn);
    } catch (err) {
      console.error('Error loading ambassador data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = async (task: any) => {
    if (!user) return;

    // Check if there's already a pending/approved completion for this task today
    const today = new Date().toISOString().split('T')[0];
    const existing = completions.find(
      (c) =>
        c.task_id === task.id &&
        (c.status === 'pending' || c.status === 'approved') &&
        c.created_at?.startsWith(today)
    );

    if (existing) {
      alert(
        existing.status === 'pending'
          ? 'You already submitted this task today. Please wait for approval.'
          : 'You already completed this task today.'
      );
      return;
    }

    setConfirmTask(task);
  };

  const confirmCompletion = async () => {
    if (!confirmTask || !user) return;
    setCompleting(confirmTask.id);
    setConfirmTask(null);

    try {
      const { error } = await supabase
        .from('ambassador_task_completions')
        .insert([
          {
            user_id: user.id,
            task_id: confirmTask.id,
            task_title: confirmTask.title,
            amount: confirmTask.reward,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      await loadData();
    } catch (err) {
      console.error('Error submitting completion:', err);
      alert('Failed to submit. Please try again.');
    } finally {
      setCompleting(null);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawError('');

    if (!bankForm.account_name.trim()) {
      setWithdrawError('Please enter your account name.');
      return;
    }
    if (!bankForm.account_number.trim() || !/^\d{10}$/.test(bankForm.account_number.trim())) {
      setWithdrawError('Please enter a valid 10-digit account number.');
      return;
    }
    if (!bankForm.bank_name.trim()) {
      setWithdrawError('Please enter your bank name.');
      return;
    }
    if (balance < MINIMUM_WITHDRAWAL) {
      setWithdrawError(`Your balance must be at least ₦${MINIMUM_WITHDRAWAL.toLocaleString()} to withdraw.`);
      return;
    }

    setWithdrawing(true);
    try {
      const { error } = await supabase
        .from('ambassador_withdrawals')
        .insert([
          {
            user_id: user.id,
            amount: balance,
            bank_details: bankForm,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      setWithdrawSuccess(true);
      await loadData();
    } catch (err) {
      console.error('Withdrawal error:', err);
      setWithdrawError('Failed to submit withdrawal. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  };

  const getTaskStatus = (taskId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const todayCompletion = completions.find(
      (c) => c.task_id === taskId && c.created_at?.startsWith(today)
    );
    if (todayCompletion) return todayCompletion.status;
    return null;
  };

  const totalEarned = completions
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const pendingEarned = completions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  const bg = isDarkMode ? '#0f0f0f' : '#f5f5f5';
  const card = isDarkMode ? '#1a1a1a' : '#ffffff';
  const text = isDarkMode ? '#ffffff' : '#111111';
  const subtext = isDarkMode ? '#aaaaaa' : '#666666';
  const border = isDarkMode ? '#2a2a2a' : '#e5e5e5';
  const accent = '#00bfff';
  const green = '#22c55e';
  const orange = '#f59e0b';

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: subtext, fontSize: 16 }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Ambassador Dashboard – Verrsa</title>
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
      </Head>

      <div style={{ minHeight: '100vh', backgroundColor: bg, paddingBottom: 60 }}>

        {/* Header */}
        <div style={{
          backgroundColor: card,
          borderBottom: `1px solid ${border}`,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
          >
            <IoChevronBack size={22} color={text} />
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: text }}>Verrsa Ambassador Dashboard</h1>
          </div>
          <button
            onClick={() => setShowHistoryDrawer(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="avatar"
                style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: '50%', backgroundColor: `${accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: accent, flexShrink: 0,
              }}>
                {(profile?.full_name || profile?.username || 'A')[0].toUpperCase()}
              </div>
            )}
          </button>
        </div>

        <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>

          {/* Balance Card */}
          <div style={{
            backgroundColor: accent,
            borderRadius: 16,
            padding: '24px 20px',
            marginBottom: 20,
            backgroundColor: "#00bfff",
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IoWalletOutline size={20} color="rgba(255,255,255,0.8)" />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Available Balance</span>
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              ₦{balance.toLocaleString()}
            </div>
            {pendingEarned > 0 && (
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginBottom: 12 }}>
                + ₦{pendingEarned.toLocaleString()} pending approval
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Total Earned</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>₦{totalEarned.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>Min. Withdrawal</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>₦{MINIMUM_WITHDRAWAL.toLocaleString()}</div>
              </div>
            </div>

            {/* Withdraw Button */}
            <button
              onClick={() => {
                if (balance < MINIMUM_WITHDRAWAL) {
                  alert(`You need at least ₦${MINIMUM_WITHDRAWAL.toLocaleString()} to withdraw. Keep completing tasks!`);
                } else {
                  setWithdrawSuccess(false);
                  setBankForm({ account_name: '', account_number: '', bank_name: '' });
                  setWithdrawError('');
                  setShowWithdrawModal(true);
                }
              }}
              style={{
                marginTop: 16,
                backgroundColor: balance >= MINIMUM_WITHDRAWAL ? '#fff' : 'rgba(255,255,255,0.3)',
                color: balance >= MINIMUM_WITHDRAWAL ? accent : 'rgba(255,255,255,0.6)',
                border: 'none',
                borderRadius: 10,
                padding: '10px 20px',
                fontSize: 15,
                fontWeight: 700,
                cursor: balance >= MINIMUM_WITHDRAWAL ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <IoArrowDownOutline size={18} />
              Withdraw to Bank
            </button>

            {balance < MINIMUM_WITHDRAWAL && (
              <p style={{ margin: '8px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                ₦{(MINIMUM_WITHDRAWAL - balance).toLocaleString()} more needed to withdraw
              </p>
            )}
          </div>

          {/* Tasks Section */}
          <div style={{ marginBottom: 8 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 17, fontWeight: 700, color: text }}>Your Tasks</h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: subtext }}>
              Complete tasks to earn naira. Tasks reset daily — you can complete each task once per day.
            </p>
          </div>

          {TASKS.map((task) => {
            const taskStatus = getTaskStatus(task.id);
            const isCompleting = completing === task.id;
            const isExpanded = expandedTask === task.id;

            return (
              <div
                key={task.id}
                style={{
                  backgroundColor: card,
                  border: `1px solid ${border}`,
                  borderRadius: 14,
                  marginBottom: 14,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{ padding: '16px 16px 12px', cursor: 'pointer' }}
                  onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: `${accent}18`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {task.icon === 'share'
                        ? <IoShareSocialOutline size={22} color={accent} />
                        : <IoPeopleOutline size={22} color={accent} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: text }}>{task.title}</span>
                        <span style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: green,
                          flexShrink: 0,
                        }}>+₦{task.reward}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 13, color: subtext, lineHeight: 1.4 }}>
                        {task.description}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  {taskStatus && (
                    <div style={{
                      marginTop: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px',
                      borderRadius: 20,
                      backgroundColor: taskStatus === 'approved' ? `${green}18` : `${orange}18`,
                      fontSize: 12,
                      fontWeight: 600,
                      color: taskStatus === 'approved' ? green : orange,
                    }}>
                      {taskStatus === 'approved'
                        ? <IoCheckmarkCircle size={13} />
                        : <IoTimeOutline size={13} />}
                      {taskStatus === 'approved' ? 'Approved today' : 'Pending review'}
                    </div>
                  )}
                </div>

                {/* Expanded instructions */}
                {isExpanded && (
                  <div style={{
                    padding: '0 16px 12px',
                    borderTop: `1px solid ${border}`,
                    marginTop: 4,
                    paddingTop: 12,
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: subtext }}>How to complete:</p>
                    {task.instructions.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                        <span style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: `${accent}20`,
                          color: accent,
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: text, lineHeight: 1.5 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Complete button */}
                <div style={{ padding: '0 16px 14px' }}>
                  <button
                    disabled={!!taskStatus || isCompleting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkCompleted(task);
                    }}
                    style={{
                      width: '100%',
                      padding: '11px 0',
                      borderRadius: 10,
                      border: taskStatus ? 'none' : `1.5px solid ${accent}`,
                      backgroundColor: taskStatus ? `${border}` : isCompleting ? `${accent}80` : 'transparent',
                      color: taskStatus ? subtext : accent,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: taskStatus || isCompleting ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'background 0.2s',
                    }}
                  >
                    {isCompleting ? (
                      'Submitting...'
                    ) : taskStatus === 'approved' ? (
                      <><IoCheckmarkCircle size={16} color={green} /> Completed</>
                    ) : taskStatus === 'pending' ? (
                      <><IoTimeOutline size={16} color={orange} /> Awaiting Approval</>
                    ) : (
                      <><IoAddCircleOutline size={16} /> Mark as Completed</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* History Section — side by side */}
          <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>

            {/* Earnings History */}
            {completions.length > 0 && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: text }}>Earnings History</h2>
                {completions.map((c, i) => (
                  <div
                    key={c.id || i}
                    style={{
                      backgroundColor: card,
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: '10px 12px',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 2 }}>{c.task_title}</div>
                    <div style={{ fontSize: 11, color: subtext, marginBottom: 4 }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      }) : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: c.status === 'approved' ? green : c.status === 'rejected' ? '#ef4444' : orange,
                        textTransform: 'capitalize',
                      }}>
                        {c.status}
                      </div>
                      <div style={{
                        fontSize: 14, fontWeight: 700,
                        color: c.status === 'approved' ? green : c.status === 'rejected' ? '#ef4444' : orange,
                      }}>
                        {c.status === 'approved' ? '+' : ''}₦{(c.amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Withdrawals — always visible */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: text }}>Withdrawals</h2>
              {withdrawals.length === 0 ? (
                <div style={{
                  backgroundColor: card,
                  border: `1px dashed ${border}`,
                  borderRadius: 12,
                  padding: '20px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <IoWalletOutline size={28} color={border} />
                  <p style={{ margin: 0, fontSize: 12, color: subtext, textAlign: 'center', lineHeight: 1.5 }}>
                    No withdrawals yet.{'\n'}Reach ₦{MINIMUM_WITHDRAWAL.toLocaleString()} to withdraw.
                  </p>
                </div>
              ) : (
                withdrawals.map((w, i) => (
                  <div
                    key={w.id || i}
                    style={{
                      backgroundColor: card,
                      border: `1px solid ${border}`,
                      borderRadius: 12,
                      padding: '10px 12px',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 2 }}>
                      {w.bank_details?.bank_name || 'Bank Transfer'}
                    </div>
                    <div style={{ fontSize: 11, color: subtext, marginBottom: 4 }}>
                      {w.bank_details?.account_number ? `···${w.bank_details.account_number.slice(-4)}` : ''}
                      {w.created_at ? ` · ${new Date(w.created_at).toLocaleDateString('en-NG', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}` : ''}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        fontSize: 11, fontWeight: 600,
                        color: w.status === 'paid' ? green : w.status === 'rejected' ? '#ef4444' : orange,
                        textTransform: 'capitalize',
                      }}>
                        {w.status}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: text }}>
                        ₦{(w.amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Info note */}
          <div style={{
            marginTop: 20,
            backgroundColor: `${accent}10`,
            border: `1px solid ${accent}30`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            gap: 10,
          }}>
            <IoAlertCircleOutline size={20} color={accent} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 13, color: text, lineHeight: 1.5 }}>
              Task completions are reviewed by the Verrsa team before your balance is updated. Approved completions
              are credited within 24–48 hours. Minimum withdrawal is ₦{MINIMUM_WITHDRAWAL.toLocaleString()}. More
              tasks will be added over time.
            </p>
          </div>
        </div>
      </div>

      {/* Confirm Completion Modal */}
      {confirmTask && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
        }}
          onClick={() => setConfirmTask(null)}
        >
          <div
            style={{
              backgroundColor: card, borderRadius: '20px 20px 0 0', padding: '24px 20px 36px',
              width: '100%', maxWidth: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: text }}>Confirm Completion</h3>
              <button onClick={() => setConfirmTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <IoCloseOutline size={24} color={subtext} />
              </button>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 14, color: subtext, lineHeight: 1.5 }}>
              You're marking <strong style={{ color: text }}>{confirmTask.title}</strong> as completed.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: subtext, lineHeight: 1.5 }}>
              You'll earn <strong style={{ color: green }}>₦{confirmTask.reward}</strong> once the Verrsa team approves your submission.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: orange, lineHeight: 1.4 }}>
              By clicking confirm, you confirm that you have genuinely completed this task. False claims may lead to suspension.
            </p>
            <button
              onClick={confirmCompletion}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                backgroundColor: accent, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Yes, I Completed This
            </button>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {showHistoryDrawer && (
        <div
          style={{
            position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 200, display: 'flex', justifyContent: 'flex-end',
          }}
          onClick={() => setShowHistoryDrawer(false)}
        >
          <div
            style={{
              backgroundColor: card,
              width: '85%',
              maxWidth: 360,
              height: '100%',
              overflowY: 'auto',
              padding: '24px 16px',
              boxSizing: 'border-box',
              boxShadow: '-4px 0 24px rgba(0,0,0,0.25)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: text }}>Task History</h3>
              <button onClick={() => setShowHistoryDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <IoCloseOutline size={24} color={subtext} />
              </button>
            </div>

            {/* Profile summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', backgroundColor: `${accent}10`, borderRadius: 12 }}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: `${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: accent }}>
                  {(profile?.full_name || profile?.username || 'A')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: text }}>{profile?.full_name || profile?.username || 'Ambassador'}</div>
                <div style={{ fontSize: 12, color: subtext }}>Total earned: <strong style={{ color: green }}>₦{totalEarned.toLocaleString()}</strong></div>
              </div>
            </div>

            {completions.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, paddingTop: 40 }}>
                <IoTimeOutline size={40} color={border} />
                <p style={{ margin: 0, fontSize: 14, color: subtext, textAlign: 'center' }}>No completed tasks yet.
Start completing tasks to see your history here.</p>
              </div>
            ) : (
              completions.map((c, i) => (
                <div
                  key={c.id || i}
                  style={{
                    backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
                    border: `1px solid ${border}`,
                    borderRadius: 12,
                    padding: '12px 14px',
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: text, marginBottom: 3 }}>{c.task_title}</div>
                  <div style={{ fontSize: 11, color: subtext, marginBottom: 8 }}>
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      backgroundColor: c.status === 'approved' ? `${green}18` : c.status === 'rejected' ? '#fef2f2' : `${orange}18`,
                      color: c.status === 'approved' ? green : c.status === 'rejected' ? '#ef4444' : orange,
                    }}>
                      {c.status === 'approved' ? <IoCheckmarkCircle size={12} /> : <IoTimeOutline size={12} />}
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: c.status === 'approved' ? green : c.status === 'rejected' ? '#ef4444' : orange }}>
                      {c.status === 'approved' ? '+' : ''}₦{(c.amount || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100,
        }}
          onClick={() => !withdrawing && setShowWithdrawModal(false)}
        >
          <div
            style={{
              backgroundColor: card, borderRadius: '20px 20px 0 0', padding: '24px 20px 36px',
              width: '100%', maxWidth: 500,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: text }}>Withdraw to Bank</h3>
              {!withdrawing && (
                <button onClick={() => setShowWithdrawModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <IoCloseOutline size={24} color={subtext} />
                </button>
              )}
            </div>

            {withdrawSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <IoCheckmarkCircle size={56} color={green} style={{ marginBottom: 12 }} />
                <h4 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: text }}>Withdrawal Requested!</h4>
                <p style={{ margin: '0 0 24px', fontSize: 14, color: subtext, lineHeight: 1.5 }}>
                  Your withdrawal of <strong style={{ color: text }}>₦{balance.toLocaleString()}</strong> has been submitted.
                  The Verrsa team will process it within 2–5 business days.
                </p>
                <button
                  onClick={() => setShowWithdrawModal(false)}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                    backgroundColor: accent, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{
                  backgroundColor: `${green}15`, border: `1px solid ${green}30`,
                  borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 13, color: subtext }}>Amount to withdraw</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: green }}>₦{balance.toLocaleString()}</span>
                </div>

                {/* Bank Name */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: subtext, display: 'block', marginBottom: 6 }}>
                    Bank Name *
                  </label>
                  <input
                    value={bankForm.bank_name}
                    onChange={(e) => setBankForm((p) => ({ ...p, bank_name: e.target.value }))}
                    placeholder="e.g. GTBank, Access Bank, Zenith..."
                    style={{
                      width: '100%', padding: '11px 12px', borderRadius: 10,
                      border: `1.5px solid ${border}`, backgroundColor: isDarkMode ? '#111' : '#fafafa',
                      color: text, fontSize: 14, boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Account Number */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: subtext, display: 'block', marginBottom: 6 }}>
                    Account Number *
                  </label>
                  <input
                    value={bankForm.account_number}
                    onChange={(e) => setBankForm((p) => ({ ...p, account_number: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="10-digit account number"
                    inputMode="numeric"
                    maxLength={10}
                    style={{
                      width: '100%', padding: '11px 12px', borderRadius: 10,
                      border: `1.5px solid ${border}`, backgroundColor: isDarkMode ? '#111' : '#fafafa',
                      color: text, fontSize: 14, boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Account Name */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: subtext, display: 'block', marginBottom: 6 }}>
                    Account Name *
                  </label>
                  <input
                    value={bankForm.account_name}
                    onChange={(e) => setBankForm((p) => ({ ...p, account_name: e.target.value }))}
                    placeholder="Name on your bank account"
                    style={{
                      width: '100%', padding: '11px 12px', borderRadius: 10,
                      border: `1.5px solid ${border}`, backgroundColor: isDarkMode ? '#111' : '#fafafa',
                      color: text, fontSize: 14, boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>

                {withdrawError && (
                  <div style={{
                    backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
                    padding: '10px 12px', marginBottom: 14,
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                  }}>
                    <IoAlertCircleOutline size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 13, color: '#ef4444' }}>{withdrawError}</span>
                  </div>
                )}

                <button
                  disabled={withdrawing}
                  onClick={handleWithdraw}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                    backgroundColor: withdrawing ? `${accent}80` : accent,
                    color: '#fff', fontSize: 16, fontWeight: 700,
                    cursor: withdrawing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {withdrawing ? 'Submitting...' : 'Request Withdrawal'}
                </button>

                <p style={{ margin: '10px 0 0', fontSize: 12, color: subtext, textAlign: 'center' }}>
                  Processed within 2–5 business days. Only Nigerian bank accounts supported.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

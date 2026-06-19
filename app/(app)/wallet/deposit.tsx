import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Text, Field, Button, Pressable, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi, type BankDetails, type PaymentMethods } from '@/lib/api/wallet';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/authStore';
import { apiConfig } from '@/lib/api/config';
import { loadTokens } from '@/lib/storage/tokens';
import { ApiError, ApiNetworkError, formatApiDetail } from '@/lib/api/errors';
import { usePlatformStatusStore } from '@/stores/platformStatusStore';
import type { PlatformStatus } from '@/types/auth';
import { ProfileHeader } from '../profile';

// Mirror the web trader's deposit flow (frontend/trader/src/app/wallet/page.tsx).
// Two admin-gated rails: 'crypto' (NOWPayments hosted checkout) and 'manual'
// (bank/UPI + payment proof upload). The backend deposit method string for the
// crypto rail is 'nowpayments' — the same wire value the web sends. The mobile
// DepositMethod union doesn't list it, so we cast at the call site (the wire
// value MUST match the web).
const CRYPTO_DEPOSIT_METHOD = 'nowpayments';

// Default minimum if /auth/platform-status doesn't carry the tunable. Matches
// the web's `useState(50)` fallback.
const DEFAULT_MIN_DEPOSIT = 50;

type Channel = 'crypto' | 'manual' | 'rm';

// Payment methods offered inside the "Request to RM" section. Each is sent to
// the relationship manager so they coordinate the right rail. UPI / bank show
// the admin's payout details inline so the user can pay immediately.
type RmMethod = 'crypto' | 'binancepay' | 'upi' | 'usdt' | 'bank';
const RM_METHODS: { key: RmMethod; label: string; hint: string }[] = [
  { key: 'crypto', label: 'Cryptocurrency', hint: 'RM shares a wallet address for your coin/network' },
  { key: 'binancepay', label: 'BinancePay', hint: 'RM shares a Binance Pay ID to send to' },
  { key: 'upi', label: 'UPI', hint: 'Pay to the UPI ID below, then submit' },
  { key: 'usdt', label: 'USDT', hint: 'RM shares a USDT address (TRC-20 / BEP-20)' },
  { key: 'bank', label: 'Local bank transfer', hint: 'Pay to the bank account below, then submit' },
];

// /auth/platform-status carries admin-tunable minimums the typed PlatformStatus
// doesn't model yet. Read them off a widened view rather than guessing.
type PlatformStatusWithMins = PlatformStatus & {
  min_deposit_amount_usd?: number;
};

interface ProofFile {
  uri: string;
  name: string;
  mimeType: string;
}

export default function DepositScreen() {
  const theme = useTheme();
  const status = usePlatformStatusStore((s) => s.status) as PlatformStatusWithMins | null;
  const user = useAuthStore((s) => s.user);
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.email || '—';

  // "Request to RM" form state.
  const [rmPhone, setRmPhone] = useState(user?.phone ?? '');
  const [rmNote, setRmNote] = useState('');
  const [rmMethod, setRmMethod] = useState<RmMethod | null>(null);

  // Admin-gated rails. Defaults match the backend's get_bool_setting defaults
  // (crypto on, manual on) so the UI behaves sanely while the call is in flight.
  const [methodFlags, setMethodFlags] = useState<PaymentMethods>({ crypto: true, manual: true, p2p: false });
  const [channel, setChannel] = useState<Channel>('crypto');

  const [minDeposit, setMinDeposit] = useState(DEFAULT_MIN_DEPOSIT);

  const [amount, setAmount] = useState('');
  const [bonusCode, setBonusCode] = useState('');

  // Manual-only state.
  const [txnId, setTxnId] = useState('');
  const [proof, setProof] = useState<ProofFile | null>(null);
  const [bankInfo, setBankInfo] = useState<BankDetails | null>(null);
  const [bankLoading, setBankLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Fetch admin-enabled rails. Keep defaults on failure (web does the same).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const r = await walletApi.paymentMethods();
        if (!cancelled && r) setMethodFlags({ crypto: r.crypto ?? true, manual: r.manual ?? true, p2p: r.p2p ?? false });
      } catch {
        /* keep defaults if the endpoint is briefly unavailable */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Min deposit from platform status (public endpoint). Falls back to 50.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = (await authApi.platformStatus()) as PlatformStatusWithMins;
        if (!cancelled && typeof s.min_deposit_amount_usd === 'number') setMinDeposit(s.min_deposit_amount_usd);
      } catch {
        /* keep default */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If the current rail is disabled by the admin, snap to the first enabled
  // one so the user isn't staring at a hidden tab.
  useEffect(() => {
    const enabled: Record<Channel, boolean> = {
      crypto: methodFlags.crypto !== false,
      manual: methodFlags.manual !== false,
      rm: methodFlags.p2p === true,
    };
    if (!enabled[channel]) {
      const first = (['crypto', 'manual', 'rm'] as Channel[]).find((c) => enabled[c]);
      if (first) setChannel(first);
    }
  }, [methodFlags, channel]);

  const loadBankDetails = useCallback(async () => {
    setBankLoading(true);
    try {
      const amt = parseFloat(amount);
      const d = await walletApi.bankDetails(!Number.isNaN(amt) && amt > 0 ? amt : undefined);
      setBankInfo(d && Object.keys(d).length > 0 ? d : null);
    } catch {
      setBankInfo(null);
    } finally {
      setBankLoading(false);
    }
  }, [amount]);

  // Auto-load bank details when the manual rail opens (web mirrors this).
  useEffect(() => {
    if (channel !== 'manual') return;
    void loadBankDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when the rail opens
  }, [channel]);

  // Request-to-RM: when the user picks a UPI / bank method, fetch the admin's
  // payout details so they can pay right away.
  useEffect(() => {
    if (channel === 'rm' && (rmMethod === 'upi' || rmMethod === 'bank') && !bankInfo) {
      void loadBankDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- triggered by method pick
  }, [channel, rmMethod]);

  const resetForm = () => {
    setAmount('');
    setBonusCode('');
    setTxnId('');
    setProof(null);
    setBankInfo(null);
  };

  const copy = async (label: string, value?: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    setCopied(label);
    setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
  };

  const pickProof = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setProof({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream' });
  };

  const validateAmount = (): number | null => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return null;
    }
    if (minDeposit > 0 && amt < minDeposit) {
      setError(`Minimum deposit is $${minDeposit.toLocaleString()}.`);
      return null;
    }
    return amt;
  };

  // Crypto: create a NOWPayments invoice and open payment_url in the browser.
  // Payload mirrors the web exactly: { amount, method: 'nowpayments', bonus_code? }.
  const submitCrypto = async () => {
    setError(null);
    setSuccess(null);
    const amt = validateAmount();
    if (amt == null) return;
    setSubmitting(true);
    try {
      const code = bonusCode.trim().toUpperCase();
      const deposit = await walletApi.createDeposit({
        amount: amt,
        // Wire value must match the web's CRYPTO_DEPOSIT_METHOD. The typed
        // DepositMethod union doesn't include it, so cast the literal.
        method: CRYPTO_DEPOSIT_METHOD as never,
        ...(code ? { promo_code: code } : {}),
      });
      // Backend returns a hosted-checkout URL (payment_url on the web; the
      // mobile Deposit type calls it invoice_url). Accept either.
      const url = (deposit as { payment_url?: string; invoice_url?: string }).payment_url
        ?? deposit.invoice_url
        ?? undefined;
      if (url) {
        setSuccess('Complete your payment in the page that just opened. Your balance is credited automatically once the transaction confirms on-chain.');
        resetForm();
        await WebBrowser.openBrowserAsync(url);
        return;
      }
      setError('Could not start the payment — no checkout URL returned. Try again.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start the payment.');
    } finally {
      setSubmitting(false);
    }
  };

  // Manual: multipart POST to /wallet/deposit/manual. Mirrors profile.ts
  // submitKyc (raw fetch + FormData + Bearer token) since createManualDeposit
  // posts JSON, not multipart. Fields: amount, transaction_id, bonus_code?, file.
  const submitManual = async () => {
    setError(null);
    setSuccess(null);
    const amt = validateAmount();
    if (amt == null) return;
    if (!txnId.trim()) {
      setError('Enter your bank / UPI transaction or reference ID.');
      return;
    }
    if (!proof) {
      setError('Upload a screenshot or PDF of your payment.');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('amount', String(amt));
      form.append('transaction_id', txnId.trim());
      const code = bonusCode.trim().toUpperCase();
      if (code) form.append('bonus_code', code);
      // RN's typed FormData differs from web's — cast through unknown to keep
      // TS happy without touching the runtime shape (see profile.ts submitKyc).
      form.append('file', {
        uri: proof.uri,
        name: proof.name,
        type: proof.mimeType,
      } as unknown as Blob);

      const tokens = await loadTokens();
      const headers: Record<string, string> = {};
      if (tokens) headers['Authorization'] = `Bearer ${tokens.access}`;

      const path = '/wallet/deposit/manual';
      let res: Response;
      try {
        res = await fetch(`${apiConfig.apiBase}${path}`, { method: 'POST', headers, body: form });
      } catch (e) {
        throw new ApiNetworkError('Could not reach the gateway to submit your deposit.', path, e);
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const detail = (errBody as { detail?: unknown }).detail;
        throw new ApiError(formatApiDetail(detail, `HTTP ${res.status}`), res.status, path, detail);
      }
      setSuccess(`Manual deposit of $${amt.toLocaleString()} submitted — pending approval.`);
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Deposit failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Request to RM: emails the relationship manager to coordinate a manual
  // deposit. Mirrors the web P2PMarketplace (mode='buy') → /wallet/deposit/rm-request.
  const submitRm = async () => {
    setError(null);
    setSuccess(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!rmMethod) {
      setError('Select a payment method.');
      return;
    }
    if (!rmPhone.trim() || rmPhone.trim().length < 7) {
      setError('Enter a valid phone number so your RM can reach you.');
      return;
    }
    setSubmitting(true);
    try {
      const label = RM_METHODS.find((m) => m.key === rmMethod)?.label ?? rmMethod;
      // Backend rm-request has no method field — carry it in the note so the
      // RM knows which rail to coordinate.
      const note = [`Preferred method: ${label}`, rmNote.trim()].filter(Boolean).join(' — ');
      await walletApi.rmRequest({
        amount: amt,
        phone: rmPhone.trim(),
        side: 'deposit',
        payout_details: label,
        note,
      });
      setSuccess(`Request sent via ${label} — your relationship manager has been emailed and will contact you within 24 hours to coordinate the payment.`);
      setAmount('');
      setRmNote('');
      setRmMethod(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not submit your request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Deposits paused by the broker (allow_deposits === false).
  if (status && status.allow_deposits === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title: 'Deposit' }} />
        <ProfileHeader title="Deposit" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="warning">Deposits are temporarily paused by the broker.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabs: { value: Channel; label: string; sub: string; enabled: boolean }[] = [
    { value: 'crypto', label: 'Crypto (NOWPayments)', sub: 'USDT / USDC / BNB — hosted checkout', enabled: methodFlags.crypto !== false },
    { value: 'manual', label: 'Manual (Bank/UPI)', sub: 'Bank wire or UPI, upload payment proof', enabled: methodFlags.manual !== false },
    { value: 'rm', label: 'Request to RM', sub: 'Email your relationship manager to arrange it', enabled: methodFlags.p2p === true },
  ];
  const visibleTabs = tabs.filter((t) => t.enabled);

  const fieldRow = (label: string, value?: string, copyable?: boolean) => {
    if (!value) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: theme.spacing[2] }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="label" tone="tertiary">{label}</Text>
          <Text variant="bodyMd" weight="medium" style={{ fontVariant: ['tabular-nums'] }}>{value}</Text>
        </View>
        {copyable ? (
          <Pressable
            onPress={() => copy(label, value)}
            haptic="light"
            style={({ pressed }) => ({
              paddingHorizontal: theme.spacing[2],
              paddingVertical: theme.spacing[1],
              borderRadius: theme.radius.sm,
              backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.chip,
            })}
          >
            <Text variant="body" tone="accent" weight="semibold">{copied === label ? 'Copied' : 'Copy'}</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Deposit' }} />
      <ProfileHeader title="Deposit" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[16] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Method tabs — only admin-enabled rails are shown. */}
          <Text variant="label" tone="secondary" style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
            METHOD
          </Text>
          <Divider />
          {visibleTabs.length === 0 ? (
            <View style={{ padding: theme.spacing[4] }}>
              <Text variant="bodyMd" tone="warning">No deposit methods are currently enabled. Please contact support.</Text>
            </View>
          ) : (
            visibleTabs.map((t) => {
              const selected = channel === t.value;
              return (
                <View key={t.value}>
                  <Pressable
                    onPress={() => { setChannel(t.value); setError(null); setSuccess(null); }}
                    haptic="light"
                    style={({ pressed }) => ({
                      paddingHorizontal: theme.spacing[4],
                      paddingVertical: theme.spacing[3],
                      backgroundColor: selected ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : 'transparent',
                      borderLeftWidth: selected ? 3 : 0,
                      borderLeftColor: theme.colors.buy,
                    })}
                  >
                    <Text variant="bodyMd" weight={selected ? 'bold' : 'medium'}>{t.label}</Text>
                    <Text variant="body" tone="tertiary">{t.sub}</Text>
                  </Pressable>
                  <Divider />
                </View>
              );
            })
          )}

          <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
            <Field
              label="Amount (USD)"
              hint={minDeposit > 0 ? `Minimum $${minDeposit.toLocaleString()}` : undefined}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              editable={!submitting}
            />

            {channel === 'crypto' ? (
              <>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.accent,
                    backgroundColor: theme.colors.buyBg,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing[3],
                  }}
                >
                  <Text variant="body" tone="secondary">
                    You&apos;ll be redirected to NOWPayments. Choose the coin and network you want to pay with there
                    (USDT on BSC / TRC-20, USDC, BNB, etc.), then send the amount from your wallet. Once the transaction
                    confirms on-chain, your wallet balance is credited automatically.
                  </Text>
                </View>

                <Field
                  label="Bonus / promo code"
                  hint="Optional. Admin reviews + credits the bonus separately once the deposit confirms."
                  value={bonusCode}
                  onChangeText={(t) => setBonusCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={40}
                  placeholder="e.g. SD100"
                  editable={!submitting}
                />

                {error ? <Text variant="body" tone="sell">{error}</Text> : null}
                {success ? <Text variant="body" tone="buy">{success}</Text> : null}

                <Button variant="buy" size="xl" onPress={submitCrypto} loading={submitting} disabled={!amount}>
                  Pay with Crypto
                </Button>
              </>
            ) : channel === 'manual' ? (
              <>
                {/* Bank details card */}
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                    backgroundColor: theme.colors.bg.secondary,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing[3],
                    gap: theme.spacing[3],
                  }}
                >
                  <Text variant="bodyMd" weight="bold">Pay to this account (from admin)</Text>
                  {bankLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.buy} />
                  ) : bankInfo && (bankInfo.bank_name || bankInfo.account_number || bankInfo.upi_id) ? (
                    <>
                      {fieldRow('Bank', bankInfo.bank_name)}
                      {fieldRow('Holder', bankInfo.account_holder)}
                      {fieldRow('Account number', bankInfo.account_number, true)}
                      {fieldRow('IFSC', bankInfo.ifsc_code)}
                      {fieldRow('UPI', bankInfo.upi_id, true)}
                      {bankInfo.qr_code_url ? (
                        <View style={{ alignItems: 'center', paddingTop: theme.spacing[2] }}>
                          <Image
                            source={{ uri: bankInfo.qr_code_url }}
                            style={{ width: 200, height: 200, borderRadius: theme.radius.md, backgroundColor: '#FFFFFF' }}
                            resizeMode="contain"
                          />
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text variant="body" tone="warning">
                      No bank details configured yet. Enter an amount and refresh, or contact support.
                    </Text>
                  )}
                  <Pressable onPress={loadBankDetails} haptic="light" disabled={bankLoading}>
                    <Text variant="body" tone="accent" weight="semibold">Refresh bank details</Text>
                  </Pressable>
                </View>

                <Field
                  label="Transaction / reference ID *"
                  hint="UTR or reference from your bank / UPI app. Required."
                  value={txnId}
                  onChangeText={setTxnId}
                  autoCapitalize="characters"
                  placeholder="UTR / reference"
                  editable={!submitting}
                />

                {/* Payment proof picker */}
                <View>
                  <Text variant="label" tone="secondary">Payment proof *</Text>
                  <View style={{ height: theme.spacing[1] }} />
                  <Pressable
                    onPress={pickProof}
                    haptic="light"
                    disabled={submitting}
                    style={({ pressed }) => ({
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: proof ? theme.colors.border.accent : theme.colors.border.primary,
                      backgroundColor: proof ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.input,
                      borderRadius: theme.radius.md,
                      paddingVertical: theme.spacing[5],
                      paddingHorizontal: theme.spacing[3],
                      alignItems: 'center',
                    })}
                  >
                    {proof ? (
                      <Text variant="bodyMd" tone="accent" weight="medium" numberOfLines={1}>{proof.name}</Text>
                    ) : (
                      <Text variant="body" tone="tertiary">Tap to attach an image or PDF (JPG, PNG, PDF, WEBP)</Text>
                    )}
                  </Pressable>
                </View>

                <Field
                  label="Bonus / promo code"
                  hint="Optional. Admin reviews + credits the bonus separately to your main wallet."
                  value={bonusCode}
                  onChangeText={(t) => setBonusCode(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={40}
                  placeholder="e.g. SD100"
                  editable={!submitting}
                />

                {error ? <Text variant="body" tone="sell">{error}</Text> : null}
                {success ? <Text variant="body" tone="buy">{success}</Text> : null}

                <Button
                  variant="buy"
                  size="xl"
                  onPress={submitManual}
                  loading={submitting}
                  disabled={!amount || !txnId.trim() || !proof}
                >
                  {amount ? `Deposit — $${(parseFloat(amount) || 0).toLocaleString()}` : 'Deposit'}
                </Button>
              </>
            ) : (
              <>
                {/* Request to RM — pick a payment method; the choice is emailed
                    to the relationship manager who coordinates that rail. */}
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.accent,
                    backgroundColor: theme.colors.buyBg,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing[3],
                  }}
                >
                  <Text variant="body" tone="secondary">
                    <Text variant="body" weight="bold">Request via your RM. </Text>
                    Choose how you want to pay. Your name, amount, phone and chosen method are emailed to your
                    relationship manager, who confirms the payment details and credits your wallet.
                  </Text>
                </View>

                <Field label="Name" value={fullName} editable={false} />

                {/* Available methods */}
                <View>
                  <Text variant="label" tone="secondary">PAYMENT METHOD</Text>
                  <View style={{ height: theme.spacing[1] }} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
                    {RM_METHODS.map((m) => {
                      const sel = rmMethod === m.key;
                      return (
                        <Pressable
                          key={m.key}
                          onPress={() => { setRmMethod(m.key); setError(null); setSuccess(null); }}
                          haptic="light"
                          disabled={submitting}
                          style={({ pressed }) => ({
                            paddingHorizontal: theme.spacing[3],
                            paddingVertical: theme.spacing[2],
                            borderRadius: theme.radius.pill,
                            borderWidth: 1,
                            borderColor: sel ? theme.colors.buy : theme.colors.border.primary,
                            backgroundColor: sel ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                          })}
                        >
                          <Text variant="bodyMd" weight={sel ? 'bold' : 'medium'} tone={sel ? 'accent' : 'primary'}>{m.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Per-method panel */}
                {rmMethod ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border.primary,
                      backgroundColor: theme.colors.bg.secondary,
                      borderRadius: theme.radius.md,
                      padding: theme.spacing[3],
                      gap: theme.spacing[3],
                    }}
                  >
                    <Text variant="body" tone="secondary">{RM_METHODS.find((m) => m.key === rmMethod)?.hint}</Text>
                    {rmMethod === 'upi' || rmMethod === 'bank' ? (
                      bankLoading ? (
                        <ActivityIndicator size="small" color={theme.colors.buy} />
                      ) : bankInfo && (bankInfo.upi_id || bankInfo.account_number) ? (
                        rmMethod === 'upi' ? (
                          <>
                            {fieldRow('UPI ID', bankInfo.upi_id, true)}
                            {bankInfo.qr_code_url ? (
                              <View style={{ alignItems: 'center', paddingTop: theme.spacing[1] }}>
                                <Image
                                  source={{ uri: bankInfo.qr_code_url }}
                                  style={{ width: 180, height: 180, borderRadius: theme.radius.md, backgroundColor: '#FFFFFF' }}
                                  resizeMode="contain"
                                />
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {fieldRow('Bank', bankInfo.bank_name)}
                            {fieldRow('Holder', bankInfo.account_holder)}
                            {fieldRow('Account number', bankInfo.account_number, true)}
                            {fieldRow('IFSC', bankInfo.ifsc_code)}
                          </>
                        )
                      ) : (
                        <Text variant="body" tone="warning">
                          No {rmMethod === 'upi' ? 'UPI' : 'bank'} details configured yet — your RM will share them when they contact you.
                        </Text>
                      )
                    ) : null}
                  </View>
                ) : null}

                <Field
                  label="Phone number"
                  value={rmPhone}
                  onChangeText={setRmPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 98765 43210"
                  editable={!submitting}
                />

                <Field
                  label="Note (optional)"
                  value={rmNote}
                  onChangeText={setRmNote}
                  placeholder="Coin/network, your UPI ref, anything the RM should know"
                  maxLength={240}
                  editable={!submitting}
                />

                {error ? <Text variant="body" tone="sell">{error}</Text> : null}
                {success ? <Text variant="body" tone="buy">{success}</Text> : null}

                {!amount ? (
                  <Text variant="body" tone="tertiary">Enter the deposit amount at the top to continue.</Text>
                ) : null}
                <Button
                  variant="buy"
                  size="xl"
                  onPress={submitRm}
                  loading={submitting}
                  disabled={submitting}
                >
                  {rmMethod ? `Send request via ${RM_METHODS.find((m) => m.key === rmMethod)?.label}` : 'Select a payment method'}
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Text, Field, Button, Pressable, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi, type PaymentMethods, type WalletSummary } from '@/lib/api/wallet';
import { authApi } from '@/lib/api/auth';
import { apiConfig } from '@/lib/api/config';
import { loadTokens } from '@/lib/storage/tokens';
import { ApiError, ApiNetworkError, formatApiDetail } from '@/lib/api/errors';
import { useAuthStore } from '@/stores/authStore';
import { usePlatformStatusStore } from '@/stores/platformStatusStore';
import type { PlatformStatus } from '@/types/auth';
import { ProfileHeader } from '../profile';

// Mirror the web trader's withdraw flow (frontend/trader/src/app/wallet/page.tsx).
// Two admin-gated rails: 'crypto' (OxaPay payout) and 'manual' (bank/UPI + QR).
// The crypto rail's wire method string is 'oxapay' — the exact value the web
// sends. The mobile WithdrawalMethod union doesn't list it, so we cast at the
// call site (the wire value MUST match the web).
const CRYPTO_WITHDRAW_METHOD = 'oxapay';

// Default minimum if /auth/platform-status doesn't carry the tunable. Matches
// the web's `useState(70)` fallback.
const DEFAULT_MIN_WITHDRAW = 70;

// OxaPay payout assets — the asset tag is sent in brackets prefixed to the
// payout address so finance/OxaPay can route on the right chain. Restricted to
// BSC (BEP-20) + Tron (TRC-20) chains, mirroring the web's CRYPTO_ASSETS grid.
const CRYPTO_ASSETS = [
  { id: 'USDT_BSC', label: 'USDT', sub: 'BSC (BEP-20)' },
  { id: 'USDT_TRC', label: 'USDT', sub: 'Tron (TRC-20)' },
  { id: 'USDC_BSC', label: 'USDC', sub: 'BSC (BEP-20)' },
  { id: 'BNB_BSC', label: 'BNB', sub: 'BSC' },
  { id: 'TRX', label: 'TRX', sub: 'Tron' },
] as const;

type Channel = 'crypto' | 'manual';

// /auth/platform-status carries admin-tunable minimums the typed PlatformStatus
// doesn't model yet. Read them off a widened view rather than guessing.
type PlatformStatusWithMins = PlatformStatus & {
  min_withdrawal_amount_usd?: number;
};

interface QrFile {
  uri: string;
  name: string;
  mimeType: string;
}

export default function WithdrawScreen() {
  const theme = useTheme();
  const status = usePlatformStatusStore((s) => s.status) as PlatformStatusWithMins | null;
  const refreshMe = useAuthStore((s) => s.refreshMe);

  // Admin-gated rails. Defaults match the backend's get_bool_setting defaults
  // (crypto on, manual on) so the UI behaves sanely while the call is in flight.
  const [methodFlags, setMethodFlags] = useState<PaymentMethods>({ crypto: true, manual: true, p2p: false });
  const [channel, setChannel] = useState<Channel>('crypto');

  const [minWithdraw, setMinWithdraw] = useState(DEFAULT_MIN_WITHDRAW);
  const [summary, setSummary] = useState<WalletSummary | null>(null);

  const [amount, setAmount] = useState('');

  // Crypto-only state.
  const [asset, setAsset] = useState<string>(CRYPTO_ASSETS[0].id);
  const [address, setAddress] = useState('');

  // Manual-only state.
  const [upiId, setUpiId] = useState('');
  const [notes, setNotes] = useState('');
  const [qr, setQr] = useState<QrFile | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mainBalance = Number(summary?.main_wallet_balance) || 0;

  // Wallet balance + bonus state for the forfeiture warning.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await walletApi.summary();
        if (!cancelled && s) setSummary(s);
      } catch {
        /* leave summary null — balance shows $0.00 until it loads */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Admin-enabled rails. Keep defaults on failure (web does the same).
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

  // Min withdrawal from platform status (public endpoint). Falls back to 70.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = (await authApi.platformStatus()) as PlatformStatusWithMins;
        if (!cancelled && typeof s.min_withdrawal_amount_usd === 'number') setMinWithdraw(s.min_withdrawal_amount_usd);
      } catch {
        /* keep default */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // If admin disabled crypto, snap to manual (and vice-versa) so the user
  // isn't staring at a hidden rail.
  useEffect(() => {
    if (channel === 'crypto' && methodFlags.crypto === false && methodFlags.manual) setChannel('manual');
    if (channel === 'manual' && methodFlags.manual === false && methodFlags.crypto) setChannel('crypto');
  }, [methodFlags, channel]);

  const resetForm = () => {
    setAmount('');
    setAddress('');
    setUpiId('');
    setNotes('');
    setQr(null);
  };

  // QR picker — accept an image from the gallery or a document (image/PDF).
  // expo-image-picker for photos, expo-document-picker as a fallback for files.
  const pickQr = async () => {
    setError(null);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    setQr({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream' });
  };

  const pickQrFromGallery = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is required to attach a QR image.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    const name = a.fileName ?? a.uri.split('/').pop() ?? 'qr.jpg';
    setQr({ uri: a.uri, name, mimeType: a.mimeType ?? 'image/jpeg' });
  };

  // Shared amount validation: positive, >= min, <= main wallet balance.
  const validateAmount = (): number | null => {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount.');
      return null;
    }
    if (minWithdraw > 0 && amt < minWithdraw) {
      setError(`Minimum withdrawal is $${minWithdraw.toLocaleString()}.`);
      return null;
    }
    if (amt > mainBalance) {
      setError(`Amount exceeds your main wallet balance ($${mainBalance.toLocaleString()}).`);
      return null;
    }
    return amt;
  };

  // Crypto: JSON POST to /wallet/withdraw. Payload mirrors the web exactly:
  // { amount, method: 'oxapay', bank_details: { oxapay_payout: '[ASSET] address' } }.
  const submitCrypto = async () => {
    setError(null);
    setSuccess(null);
    const amt = validateAmount();
    if (amt == null) return;
    const detail = address.trim();
    if (!detail) {
      setError('Enter your crypto wallet address.');
      return;
    }
    setSubmitting(true);
    try {
      const payout = `[${asset}] ${detail}`.trim();
      await walletApi.createWithdrawal({
        amount: amt,
        // Wire value must match the web's CRYPTO_WITHDRAW_METHOD. The typed
        // WithdrawalMethod union doesn't include it, so cast the literal.
        method: CRYPTO_WITHDRAW_METHOD as never,
        bank_details: { oxapay_payout: payout },
      });
      await refreshMe();
      const s = await walletApi.summary().catch(() => null);
      if (s) setSummary(s);
      setSuccess(`Withdrawal of $${amt.toLocaleString()} submitted — pending approval.`);
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Manual: multipart POST to /wallet/withdraw/manual. Mirrors profile.ts
  // submitKyc (raw fetch + FormData + Bearer token) since createManualWithdrawal
  // posts JSON, not multipart. Fields: amount, upi_id, payout_notes?, file?.
  const submitManual = async () => {
    setError(null);
    setSuccess(null);
    const amt = validateAmount();
    if (amt == null) return;
    const upi = upiId.trim();
    if (!upi && !qr) {
      setError('Enter your UPI ID and/or upload a QR code for manual payout.');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('amount', String(amt));
      form.append('upi_id', upi);
      form.append('payout_notes', notes.trim());
      if (qr) {
        // RN's typed FormData differs from web's — cast through unknown to keep
        // TS happy without touching the runtime shape (see profile.ts submitKyc).
        form.append('file', {
          uri: qr.uri,
          name: qr.name,
          type: qr.mimeType,
        } as unknown as Blob);
      }

      const tokens = await loadTokens();
      const headers: Record<string, string> = {};
      if (tokens) headers['Authorization'] = `Bearer ${tokens.access}`;

      const path = '/wallet/withdraw/manual';
      let res: Response;
      try {
        res = await fetch(`${apiConfig.apiBase}${path}`, { method: 'POST', headers, body: form });
      } catch (e) {
        throw new ApiNetworkError('Could not reach the gateway to submit your withdrawal.', path, e);
      }
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const detail = (errBody as { detail?: unknown }).detail;
        throw new ApiError(formatApiDetail(detail, `HTTP ${res.status}`), res.status, path, detail);
      }
      await refreshMe();
      const s = await walletApi.summary().catch(() => null);
      if (s) setSummary(s);
      setSuccess(`Manual withdrawal of $${amt.toLocaleString()} submitted — pending approval.`);
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Withdrawals paused by the broker (allow_withdrawals === false).
  if (status && status.allow_withdrawals === false) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title: 'Withdraw' }} />
        <ProfileHeader title="Withdraw" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="warning">Withdrawals are temporarily paused by the broker.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tabs: { value: Channel; label: string; enabled: boolean }[] = [
    { value: 'crypto', label: 'Crypto (OxaPay)', enabled: methodFlags.crypto !== false },
    { value: 'manual', label: 'Bank / UPI', enabled: methodFlags.manual !== false },
  ];
  const visibleTabs = tabs.filter((t) => t.enabled);

  // Bonus forfeiture warning: shown when the user has an unredeemed main-wallet
  // bonus and hasn't already forfeited it (mirrors the web's wording).
  const showBonusWarning = !summary?.bonus_forfeited_at && (Number(summary?.main_wallet_bonus) || 0) > 0;

  const selectedAsset = CRYPTO_ASSETS.find((c) => c.id === asset) ?? CRYPTO_ASSETS[0];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Withdraw' }} />
      <ProfileHeader title="Withdraw" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: theme.spacing[16] }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Wallet balance — withdrawals come from the main wallet only. */}
          <View
            style={{
              margin: theme.spacing[4],
              marginBottom: theme.spacing[2],
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
              backgroundColor: theme.colors.bg.secondary,
              borderRadius: theme.radius.md,
              padding: theme.spacing[4],
            }}
          >
            <Text variant="label" tone="tertiary">AVAILABLE (MAIN WALLET)</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="h2" weight="bold" style={{ fontVariant: ['tabular-nums'] }}>{fmt(mainBalance)}</Text>
            <View style={{ height: theme.spacing[2] }} />
            <Text variant="body" tone="tertiary">
              Withdrawals are sent from your main wallet only. Ensure the amount you need is available before requesting a payout.
            </Text>
          </View>

          {/* Bonus forfeiture warning — amber to mirror the web (theme has no
              amber token, so these are intentional literals). */}
          {showBonusWarning ? (
            <View
              style={{
                marginHorizontal: theme.spacing[4],
                marginBottom: theme.spacing[2],
                borderWidth: 1,
                borderColor: 'rgba(245,158,11,0.40)',
                backgroundColor: 'rgba(245,158,11,0.07)',
                borderRadius: theme.radius.md,
                padding: theme.spacing[3],
              }}
            >
              <Text variant="body" style={{ color: '#fcd34d', lineHeight: 18 }}>
                <Text variant="body" weight="bold" style={{ color: '#fbbf24' }}>Heads-up — bonus forfeiture. </Text>
                You currently have a welcome bonus credit. Submitting your first withdrawal clears it immediately (both
                main-wallet bonus and any bonus credit currently on a trading account). Trading profits already in your
                account balance are unaffected.
              </Text>
            </View>
          ) : null}

          {/* Method tabs — only admin-enabled rails are shown. */}
          <Text variant="label" tone="secondary" style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[2] }}>
            METHOD
          </Text>
          <Divider />
          {visibleTabs.length === 0 ? (
            <View style={{ padding: theme.spacing[4] }}>
              <Text variant="bodyMd" tone="warning">No withdrawal methods are currently enabled. Please contact support.</Text>
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
                    <Text variant="body" tone="tertiary">
                      {t.value === 'crypto' ? 'USDT / USDC / BNB / TRX payout to your wallet' : 'Bank or UPI payout, optional QR code'}
                    </Text>
                  </Pressable>
                  <Divider />
                </View>
              );
            })
          )}

          <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
            {/* Amount with a Max button that fills the main wallet balance. */}
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="label" tone="secondary">
                  Amount (USD){minWithdraw > 0 ? `  ·  min $${minWithdraw.toLocaleString()}` : ''}
                </Text>
                <Pressable
                  onPress={() => setAmount(String(Math.max(0, mainBalance)))}
                  haptic="light"
                  disabled={submitting}
                  style={({ pressed }) => ({
                    paddingHorizontal: theme.spacing[2],
                    paddingVertical: theme.spacing[1],
                    borderRadius: theme.radius.sm,
                    backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.chip,
                  })}
                >
                  <Text variant="body" tone="accent" weight="bold">Max</Text>
                </Pressable>
              </View>
              <View style={{ height: theme.spacing[1] }} />
              <Field
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                editable={!submitting}
              />
            </View>

            {channel === 'crypto' ? (
              <>
                {/* Asset selector — mirrors the web CRYPTO_ASSETS grid. */}
                <View>
                  <Text variant="label" tone="secondary">Payout asset</Text>
                  <View style={{ height: theme.spacing[1] }} />
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
                    {CRYPTO_ASSETS.map((c) => {
                      const selected = c.id === asset;
                      return (
                        <Pressable
                          key={c.id}
                          onPress={() => setAsset(c.id)}
                          haptic="light"
                          disabled={submitting}
                          style={({ pressed }) => ({
                            paddingHorizontal: theme.spacing[3],
                            paddingVertical: theme.spacing[2],
                            borderRadius: theme.radius.md,
                            borderWidth: 1,
                            borderColor: selected ? theme.colors.border.accent : theme.colors.border.primary,
                            backgroundColor: selected ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                          })}
                        >
                          <Text variant="bodyMd" weight="bold" tone={selected ? 'accent' : 'primary'} style={{ fontVariant: ['tabular-nums'] }}>
                            {c.label}
                          </Text>
                          <Text variant="body" tone="tertiary">{c.sub}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <Field
                  label="Wallet address"
                  hint={`Your ${selectedAsset.label} address on ${selectedAsset.sub}. The network must match the payout asset.`}
                  value={address}
                  onChangeText={setAddress}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Destination wallet address"
                  editable={!submitting}
                />

                <Text variant="body" tone="tertiary">Processing time: up to 24 hours.</Text>

                {error ? <Text variant="body" tone="sell">{error}</Text> : null}
                {success ? <Text variant="body" tone="buy">{success}</Text> : null}

                <Button variant="danger" size="xl" onPress={submitCrypto} loading={submitting} disabled={!amount || !address.trim()}>
                  {amount ? `Withdraw — ${fmt(parseFloat(amount) || 0)}` : 'Withdraw funds'}
                </Button>
              </>
            ) : (
              <>
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border.primary,
                    backgroundColor: theme.colors.bg.secondary,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing[3],
                  }}
                >
                  <Text variant="bodyMd" weight="bold">Bank / UPI payout</Text>
                  <View style={{ height: theme.spacing[1] }} />
                  <Text variant="body" tone="secondary">
                    Provide the UPI ID and/or upload a QR code. Finance processes the payout after approval.
                  </Text>
                </View>

                <Field
                  label="UPI ID"
                  hint="Required unless you upload a QR code."
                  value={upiId}
                  onChangeText={setUpiId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="yourname@upi"
                  editable={!submitting}
                />

                <Field
                  label="Notes for finance (optional)"
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Account name, bank, etc."
                  editable={!submitting}
                />

                {/* QR picker — gallery or file. */}
                <View>
                  <Text variant="label" tone="secondary">Your QR code (optional)</Text>
                  <View style={{ height: theme.spacing[1] }} />
                  <Pressable
                    onPress={pickQr}
                    haptic="light"
                    disabled={submitting}
                    style={({ pressed }) => ({
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: qr ? theme.colors.border.accent : theme.colors.border.primary,
                      backgroundColor: qr ? theme.colors.buyBg : pressed ? theme.colors.bg.hover : theme.colors.bg.input,
                      borderRadius: theme.radius.md,
                      paddingVertical: theme.spacing[5],
                      paddingHorizontal: theme.spacing[3],
                      alignItems: 'center',
                    })}
                  >
                    {qr ? (
                      <Text variant="bodyMd" tone="accent" weight="medium" numberOfLines={1}>{qr.name}</Text>
                    ) : (
                      <Text variant="body" tone="tertiary">Tap to attach a QR image or PDF (JPG, PNG, PDF, WEBP)</Text>
                    )}
                  </Pressable>
                  <View style={{ height: theme.spacing[2] }} />
                  <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
                    <Pressable onPress={pickQrFromGallery} haptic="light" disabled={submitting}>
                      <Text variant="body" tone="accent" weight="semibold">Pick from gallery</Text>
                    </Pressable>
                    {qr ? (
                      <Pressable onPress={() => setQr(null)} haptic="light" disabled={submitting}>
                        <Text variant="body" tone="sell" weight="semibold">Remove</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <Text variant="body" tone="tertiary">Processing time: up to 24 hours.</Text>

                {error ? <Text variant="body" tone="sell">{error}</Text> : null}
                {success ? <Text variant="body" tone="buy">{success}</Text> : null}

                <Button
                  variant="danger"
                  size="xl"
                  onPress={submitManual}
                  loading={submitting}
                  disabled={!amount || (!upiId.trim() && !qr)}
                >
                  {amount ? `Withdraw — ${fmt(parseFloat(amount) || 0)}` : 'Withdraw funds'}
                </Button>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

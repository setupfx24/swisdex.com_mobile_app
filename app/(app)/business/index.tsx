import { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert, ActivityIndicator, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { format } from 'date-fns';
import { Copy, Check, ChevronDown, ChevronRight, Share2, ChevronRight as ArrowRight } from 'lucide-react-native';
import { Text, Num, Button, Divider, Pressable, Field } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import {
  businessApi,
  type BusinessStatus,
  type IbDashboard,
  type IbReferral,
  type IbCommission,
  type SubBrokerDashboard,
  type IbTree,
  type TreeNode,
} from '@/lib/api/business';
import { ProfileHeader } from '../profile';

type Tab = 'ib' | 'subbroker' | 'network';
const TABS: { key: Tab; label: string }[] = [
  { key: 'ib', label: 'IB Program' },
  { key: 'subbroker', label: 'Sub-Broker' },
  { key: 'network', label: 'My Network' },
];

export default function BusinessScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const isDemo = !!user?.is_demo;

  const [tab, setTab] = useState<Tab>('ib');
  const [status, setStatus] = useState<BusinessStatus | null>(null);
  const [dashboard, setDashboard] = useState<IbDashboard | null>(null);
  const [referrals, setReferrals] = useState<IbReferral[]>([]);
  const [commissions, setCommissions] = useState<IbCommission[]>([]);
  const [subDash, setSubDash] = useState<SubBrokerDashboard | null>(null);
  const [tree, setTree] = useState<IbTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyingSub, setApplyingSub] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [companyName, setCompanyName] = useState('');

  const load = useCallback(async () => {
    if (isDemo) { setLoading(false); return; }
    setError(null);
    try {
      const s = await businessApi.status();
      setStatus(s);
      if (s.is_ib) {
        const [d, r, c, t] = await Promise.all([
          businessApi.ibDashboard().catch(() => null),
          businessApi.ibReferrals().catch(() => ({ items: [] })),
          businessApi.ibCommissions().catch(() => ({ items: [] })),
          businessApi.ibTree().catch(() => null),
        ]);
        setDashboard(d);
        setReferrals(r.items ?? []);
        setCommissions(c.items ?? []);
        setTree(t);
      }
      if (s.is_sub_broker) {
        setSubDash(await businessApi.subBrokerDashboard().catch(() => null));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load partner data.');
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onApply = async () => {
    setApplying(true);
    try {
      await businessApi.apply();
      await load();
      Alert.alert('Submitted', 'Your IB application is under review.');
    } catch (e: unknown) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not submit application.');
    } finally { setApplying(false); }
  };

  const onApplySub = async () => {
    setApplyingSub(true);
    try {
      await businessApi.applySubBroker(companyName.trim() || undefined);
      await load();
      Alert.alert('Submitted', 'Your sub-broker application is under review.');
    } catch (e: unknown) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not submit application.');
    } finally { setApplyingSub(false); }
  };

  const onTransfer = async () => {
    setTransferring(true);
    try {
      const res = await businessApi.ibTransfer();
      await load();
      Alert.alert('Transferred', `$${(res.transferred ?? 0).toFixed(2)} moved to your main wallet.`);
    } catch (e: unknown) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Could not transfer commission.');
    } finally { setTransferring(false); }
  };

  const copyValue = async (val?: string | null) => {
    if (!val) return;
    await Clipboard.setStringAsync(val).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const eligibility = status?.eligibility ?? null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Affiliates' }} />
      <ProfileHeader title="Affiliates" />

      {/* Tabs */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: theme.colors.border.primary }}>
        {TABS.map((t) => {
          const sel = tab === t.key;
          return (
            <Pressable
              key={t.key}
              haptic="light"
              onPress={() => setTab(t.key)}
              style={{
                flex: 1,
                paddingVertical: theme.spacing[3],
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: sel ? theme.colors.buy : 'transparent',
              }}
            >
              <Text variant="bodyMd" weight={sel ? 'bold' : 'regular'} tone={sel ? 'accent' : 'secondary'}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[8], gap: theme.spacing[4] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text.secondary} />}
      >
        {isDemo ? (
          <Info theme={theme} text="Affiliates & IB rewards require a real trading account. Open a live account to apply." />
        ) : loading ? (
          <View style={{ paddingTop: theme.spacing[8], alignItems: 'center' }}>
            <ActivityIndicator color={theme.colors.text.secondary} />
          </View>
        ) : error ? (
          <View style={{ padding: theme.spacing[4] }}><Text variant="body" tone="sell">{error}</Text></View>
        ) : tab === 'ib' ? (
          <IBTab
            theme={theme} status={status} dashboard={dashboard} referrals={referrals} commissions={commissions}
            eligibility={eligibility} applying={applying} transferring={transferring} copied={copied}
            onApply={onApply} onTransfer={onTransfer} onCopy={copyValue}
          />
        ) : tab === 'subbroker' ? (
          <SubBrokerTab
            theme={theme} status={status} subDash={subDash} eligibility={eligibility}
            companyName={companyName} setCompanyName={setCompanyName} applying={applyingSub}
            onApply={onApplySub} copied={copied} onCopy={copyValue}
          />
        ) : (
          <NetworkTab theme={theme} tree={tree} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────── IB Program tab ─────────────── */
function IBTab({
  theme, status, dashboard, referrals, commissions, eligibility,
  applying, transferring, copied, onApply, onTransfer, onCopy,
}: any) {
  if (!status?.is_ib) {
    return (
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4], gap: theme.spacing[4] }}>
        {status?.application_status === 'pending' ? (
          <PendingCard theme={theme} text="Your IB application is under review by the admin team." />
        ) : (
          <>
            <Text variant="h2">Become an Introducing Broker</Text>
            <Text variant="bodyMd" tone="secondary">
              Earn commissions on the trading activity of clients you refer.
            </Text>
            {eligibility ? <EligibilityCard theme={theme} eligibility={eligibility} /> : null}
            <Button onPress={onApply} loading={applying} disabled={eligibility ? !eligibility.is_eligible : false} size="lg">
              {eligibility && !eligibility.is_eligible ? 'Deposit to unlock' : 'Apply Now'}
            </Button>
          </>
        )}
      </View>
    );
  }

  const balance = dashboard?.commission_balance ?? 0;
  const tier = dashboard?.tier;
  const earnings = dashboard?.earnings_by_user ?? [];

  return (
    <>
      <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], gap: theme.spacing[3] }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
          <Stat theme={theme} label="Total earned" value={dashboard?.total_earned ?? 0} prefix="$" tone="buy" />
          <Stat theme={theme} label="Pending payout" value={dashboard?.pending_payout ?? 0} prefix="$" tone="warning" />
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
          <Stat theme={theme} label="Referrals" value={dashboard?.total_referrals ?? 0} digits={0} tone="accent" />
          <Stat theme={theme} label="Level" value={dashboard?.level ?? 1} digits={0} prefix="L" />
        </View>
      </View>

      {/* IB type banner */}
      {dashboard?.ib_type || dashboard?.is_sub_ib != null ? (
        <View style={{ paddingHorizontal: theme.spacing[4], gap: theme.spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: theme.radius.sm, backgroundColor: theme.colors.buyBg }}>
              <Text variant="caption" weight="bold" tone={dashboard.ib_type === 'super_ib' ? 'accent' : dashboard.is_sub_ib ? 'warning' : 'buy'}>
                {dashboard.ib_type === 'super_ib' ? 'SUPER IB' : dashboard.is_sub_ib ? 'SUB-IB' : 'IB'}
              </Text>
            </View>
            <Text variant="body" tone="secondary" style={{ flex: 1 }}>
              {dashboard.is_sub_ib
                ? 'You are a Sub-IB — you earn on your own referrals and downline.'
                : 'You are a full IB.'}
            </Text>
          </View>
          {dashboard.can_request_ib_upgrade ? (
            <Pressable
              onPress={() => router.push('/support')}
              haptic="light"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: theme.spacing[1] }}
            >
              <Text variant="bodyMd" tone="accent" weight="medium">Contact SwisDex to become a full IB</Text>
              <ArrowRight size={14} color={theme.colors.buy} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Tier */}
      {tier?.label ? (
        <View style={{ paddingHorizontal: theme.spacing[4] }}>
          <View style={{ padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary, gap: theme.spacing[2] }}>
            <Text variant="labelXs" tone="tertiary">CURRENT TIER</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
              <Text variant="bodyLg" weight="bold" tone="accent">{tier.label}</Text>
              {tier.per_lot != null ? <Text variant="bodyMd" tone="secondary">${tier.per_lot.toFixed(2)}/lot</Text> : null}
            </View>
            {tier.per_lot_by_account_type ? (
              <View style={{ gap: 2, paddingTop: 2 }}>
                {Object.entries(tier.per_lot_by_account_type).map(([k, v]) => (
                  <Text key={k} variant="body" tone="tertiary">{k.toUpperCase()}: ${Number(v).toFixed(2)}/lot</Text>
                ))}
              </View>
            ) : null}
            {dashboard?.next_tier?.label ? (
              <Text variant="body" tone="secondary" style={{ paddingTop: theme.spacing[1] }}>
                Next: {dashboard.next_tier.label}
                {dashboard.next_tier.per_lot != null ? ` ($${dashboard.next_tier.per_lot.toFixed(2)}/lot)` : ''}
                {dashboard.needed_activations_for_next ? ` — ${dashboard.needed_activations_for_next} more activations` : ''}
                {dashboard.needed_amount_for_next ? ` or $${dashboard.needed_amount_for_next.toFixed(0)} more deposits` : ''}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Commission balance + transfer */}
      <View style={{ paddingHorizontal: theme.spacing[4] }}>
        <View style={{ padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary, gap: theme.spacing[3] }}>
          <View>
            <Text variant="labelXs" tone="tertiary">AVAILABLE COMMISSION</Text>
            <Money theme={theme} value={balance} digits={2} variant="numXl" tone="buy" />
          </View>
          <Button onPress={onTransfer} loading={transferring} disabled={!(balance > 0)} size="lg">Transfer to main wallet</Button>
          <Text variant="caption" tone="tertiary">Transfer moves the amount into your main wallet — a transaction and notification fire on transfer.</Text>
        </View>
      </View>

      {/* Referral code/link */}
      {dashboard?.referral_code || dashboard?.referral_link ? (
        <View style={{ paddingHorizontal: theme.spacing[4] }}>
          <Pressable
            haptic="light"
            onPress={() => onCopy(dashboard?.referral_link || dashboard?.referral_code)}
            style={({ pressed }: any) => ({
              flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[4],
              borderRadius: theme.radius.lg, backgroundColor: pressed ? theme.colors.bg.tertiary : theme.colors.bg.secondary,
            })}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text variant="labelXs" tone="tertiary">YOUR REFERRAL {dashboard?.referral_link ? 'LINK' : 'CODE'}</Text>
              <Text variant="bodyMd" tone="accent" numberOfLines={1} selectable>{dashboard?.referral_link || dashboard?.referral_code}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3] }}>
              {copied ? <Check size={18} color={theme.colors.buy} /> : <Copy size={18} color={theme.colors.text.secondary} />}
              <Pressable
                haptic="light"
                hitSlop={8}
                onPress={() => {
                  void Share.share({
                    message: `Trade with me on SwisDex — use my code ${dashboard?.referral_code ?? ''}${dashboard?.referral_link ? ` (${dashboard.referral_link})` : ''} to claim the welcome bonus.`,
                  });
                }}
              >
                <Share2 size={18} color={theme.colors.buy} />
              </Pressable>
            </View>
          </Pressable>
        </View>
      ) : null}

      {/* Earnings by trader */}
      {earnings.length > 0 ? (
        <View>
          <SectionHeader theme={theme} title="Earnings by trader" />
          <Divider />
          {earnings.map((e: any, i: number) => (
            <Row key={e.user_id ?? i} theme={theme}
              title={e.name || e.email || '—'}
              sub={`${e.trades_attributed ?? 0} trades`}
              value={e.total_commission ?? 0} valueTone="buy" />
          ))}
        </View>
      ) : null}

      {/* Referrals */}
      {referrals.length > 0 ? (
        <View>
          <SectionHeader theme={theme} title="Referrals" />
          <Divider />
          {referrals.map((r: IbReferral, i: number) => (
            <Row key={r.id ?? i} theme={theme}
              title={r.referred_user?.name || r.name || r.referred_user?.email || r.email || '—'}
              sub={`${r.status ?? 'active'}${r.created_at ? ` · ${format(new Date(r.created_at), 'MMM d')}` : ''}`}
              value={r.total_deposit ?? 0} />
          ))}
        </View>
      ) : null}

      {/* Commissions */}
      {commissions.length > 0 ? (
        <View>
          <SectionHeader theme={theme} title="Commission history" />
          <Divider />
          {commissions.map((c: IbCommission, i: number) => (
            <Row key={c.id ?? i} theme={theme}
              title={c.source_user?.name || c.source_user?.email || '—'}
              sub={`${(c.commission_type ?? '').replace('_', ' ')}${c.mlm_level != null ? ` · L${c.mlm_level}` : ''}${c.status ? ` · ${c.status}` : ''}`}
              value={c.amount ?? 0} valueTone="buy" />
          ))}
        </View>
      ) : null}
    </>
  );
}

/* ─────────────── Sub-Broker tab ─────────────── */
function SubBrokerTab({
  theme, status, subDash, eligibility, companyName, setCompanyName, applying, onApply, copied, onCopy,
}: any) {
  if (status?.is_sub_broker && subDash) {
    return (
      <>
        <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], gap: theme.spacing[3] }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            <Stat theme={theme} label="Clients" value={subDash.direct_clients ?? 0} digits={0} tone="accent" />
            <Stat theme={theme} label="Total earned" value={subDash.total_earned ?? 0} prefix="$" tone="buy" />
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            <Stat theme={theme} label="Pending" value={subDash.pending_payout ?? 0} prefix="$" tone="warning" />
            <Stat theme={theme} label="Commission" value={subDash.total_commission ?? 0} prefix="$" />
          </View>
        </View>
        {subDash.referral_code ? (
          <View style={{ paddingHorizontal: theme.spacing[4] }}>
            <Pressable haptic="light" onPress={() => onCopy(subDash.referral_code)}
              style={({ pressed }: any) => ({ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[3], padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: pressed ? theme.colors.bg.tertiary : theme.colors.bg.secondary })}>
              <View style={{ flex: 1 }}>
                <Text variant="labelXs" tone="tertiary">YOUR REFERRAL CODE</Text>
                <Text variant="num" tone="accent" selectable>{subDash.referral_code}</Text>
              </View>
              {copied ? <Check size={18} color={theme.colors.buy} /> : <Copy size={18} color={theme.colors.text.secondary} />}
            </Pressable>
          </View>
        ) : null}
        {(subDash.clients ?? []).length > 0 ? (
          <View>
            <SectionHeader theme={theme} title="Your clients" />
            <Divider />
            {subDash.clients.map((cl: any, i: number) => (
              <Row key={cl.user_id ?? i} theme={theme}
                title={cl.name || cl.email || '—'}
                sub={`${cl.status ?? 'active'}${cl.joined_at ? ` · ${format(new Date(cl.joined_at), 'MMM d')}` : ''}`}
                value={cl.total_balance ?? 0} />
            ))}
          </View>
        ) : null}
      </>
    );
  }

  return (
    <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[4], gap: theme.spacing[4] }}>
      {status?.sub_broker_status === 'pending' ? (
        <PendingCard theme={theme} text="Your sub-broker application is under review." />
      ) : (
        <>
          <Text variant="h2">Become a Sub-Broker</Text>
          <Text variant="bodyMd" tone="secondary">
            Partner with SwisDex to onboard clients and earn revenue share on their activity.
          </Text>
          {eligibility ? <EligibilityCard theme={theme} eligibility={eligibility} /> : null}
          <Field label="Company name (optional)" value={companyName} onChangeText={setCompanyName} placeholder="Your company name" editable={!applying} />
          <Button onPress={onApply} loading={applying} disabled={eligibility ? !eligibility.is_eligible : false} size="lg">
            {eligibility && !eligibility.is_eligible ? 'Deposit to unlock' : 'Apply as Sub-Broker'}
          </Button>
        </>
      )}
    </View>
  );
}

/* ─────────────── My Network tab ─────────────── */
function NetworkTab({ theme, tree }: { theme: any; tree: IbTree | null }) {
  const nodes = tree?.tree ?? [];
  return (
    <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[3], gap: theme.spacing[3] }}>
      <View style={{ padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary, gap: 2 }}>
        <Text variant="labelXs" tone="tertiary">YOUR NETWORK</Text>
        <Text variant="bodyLg" weight="bold">{tree?.total_nodes ?? 0} members</Text>
        {tree?.root ? (
          <Text variant="body" tone="secondary">
            Code {tree.root.referral_code ?? '—'} · Level L{tree.root.level ?? 1} · Earned ${(tree.root.total_earned ?? 0).toFixed(2)}
          </Text>
        ) : null}
      </View>
      {nodes.length === 0 ? (
        <Text variant="bodyMd" tone="tertiary" align="center" style={{ paddingTop: theme.spacing[4] }}>
          No downline members yet. Share your referral link to grow your network.
        </Text>
      ) : (
        nodes.map((n) => <TreeRow key={n.id} theme={theme} node={n} depth={0} />)
      )}
    </View>
  );
}

function TreeRow({ theme, node, depth }: { theme: any; node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 2);
  const kids = node.children ?? [];
  const hasKids = kids.length > 0;
  return (
    <View>
      <Pressable
        haptic="light"
        onPress={() => hasKids && setOpen((o) => !o)}
        style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing[2], paddingLeft: depth * 16 }}
      >
        {hasKids ? (
          open ? <ChevronDown size={14} color={theme.colors.text.tertiary} /> : <ChevronRight size={14} color={theme.colors.text.tertiary} />
        ) : <View style={{ width: 14 }} />}
        <View style={{ flex: 1, marginLeft: theme.spacing[1] }}>
          <Text variant="bodyMd" weight="medium" numberOfLines={1} style={node.is_active === false ? { color: theme.colors.text.tertiary } : undefined}>
            {node.name || node.email || '—'}{node.is_active === false ? ' (inactive)' : ''}
          </Text>
          <Text variant="body" tone="tertiary">L{node.depth ?? 1} · ${(node.total_earned ?? 0).toFixed(2)}</Text>
        </View>
      </Pressable>
      {open && hasKids ? kids.map((c) => <TreeRow key={c.id} theme={theme} node={c} depth={depth + 1} />) : null}
    </View>
  );
}

/* ─────────────── Shared atoms ─────────────── */
function EligibilityCard({ theme, eligibility }: any) {
  const pct = eligibility.min_deposit_required_usd > 0
    ? Math.min(100, (eligibility.total_deposits_usd / eligibility.min_deposit_required_usd) * 100) : 100;
  return (
    <View style={{ padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary, gap: theme.spacing[2] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Text variant="labelXs" tone="tertiary">ELIGIBILITY</Text>
        <Text variant="bodyMd" weight="bold">
          ${eligibility.total_deposits_usd.toFixed(0)} / ${eligibility.min_deposit_required_usd.toFixed(0)}
        </Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: theme.colors.bg.tertiary, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.colors.buy }} />
      </View>
      <Text variant="body" tone={eligibility.is_eligible ? 'buy' : 'secondary'}>
        {eligibility.is_eligible
          ? 'You meet the minimum deposit requirement.'
          : `Deposit $${(eligibility.min_deposit_required_usd - eligibility.total_deposits_usd).toFixed(0)} more to unlock.`}
      </Text>
    </View>
  );
}

function PendingCard({ theme, text }: { theme: any; text: string }) {
  return (
    <View style={{ padding: theme.spacing[5], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary, alignItems: 'center', gap: theme.spacing[2] }}>
      <Text variant="bodyLg" weight="bold">Application pending</Text>
      <Text variant="bodyMd" tone="secondary" align="center">{text}</Text>
    </View>
  );
}

function Info({ theme, text }: { theme: any; text: string }) {
  return (
    <View style={{ margin: theme.spacing[4], padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary }}>
      <Text variant="bodyMd" tone="secondary" align="center">{text}</Text>
    </View>
  );
}

function Stat({ theme, label, value, digits = 2, prefix, tone }: any) {
  return (
    <View style={{ flex: 1, padding: theme.spacing[4], borderRadius: theme.radius.lg, backgroundColor: theme.colors.bg.secondary, gap: theme.spacing[1] }}>
      <Text variant="labelXs" tone="tertiary">{String(label).toUpperCase()}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        {prefix ? <Text variant="numLg" tone={tone ?? 'primary'}>{prefix}</Text> : null}
        <Num value={value} digits={digits} variant="numLg" tone={tone} />
      </View>
    </View>
  );
}

function Money({ theme: _t, value, digits, variant, tone }: any) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
      <Text variant={variant} tone={tone ?? 'primary'}>$</Text>
      <Num value={value} digits={digits} variant={variant} tone={tone} />
    </View>
  );
}

function Row({ theme, title, sub, value, valueTone }: any) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodyMd" weight="medium" numberOfLines={1}>{title}</Text>
          <Text variant="body" tone="tertiary">{sub}</Text>
        </View>
        <Money theme={theme} value={value} digits={2} variant="num" tone={valueTone} />
      </View>
      <Divider />
    </View>
  );
}

function SectionHeader({ theme, title }: { theme: any; title: string }) {
  return (
    <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], paddingBottom: theme.spacing[2] }}>
      <Text variant="labelXs" tone="tertiary">{title.toUpperCase()}</Text>
    </View>
  );
}

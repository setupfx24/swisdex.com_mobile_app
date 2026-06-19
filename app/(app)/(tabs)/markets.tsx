import { useEffect, useState, useMemo, useRef } from 'react';
import { View, ScrollView, RefreshControl, Image, Linking, Share, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  ChevronDown, Eye, Search, Bell,
  Gift, Newspaper, GraduationCap, ChevronRight,
  Copy, Share2,
} from 'lucide-react-native';
import { Text, Num, Pressable, Skeleton, GradientBackground } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { useAuthStore } from '@/stores/authStore';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { usePlatformStatusStore } from '@/stores/platformStatusStore';
import { useNotificationsStore } from '@/stores/notificationsStore';
import { priceSocket } from '@/lib/ws/priceSocket';
import { startWebSocketLifecycle } from '@/lib/ws/appStateLifecycle';
import { instrumentsApi } from '@/lib/api/instruments';
import { bannersApi } from '@/lib/api/banners';
import { businessApi, type BusinessSnapshot } from '@/lib/api/earn';
import type { Banner } from '@/types/notifications';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';
import { MarketRow } from '@/features/markets/components/MarketRow';
import { QuickActionGrid } from '@/shared/components/QuickActionGrid';

// Brand wordmark — light logo on the dark theme, dark logo on the light theme
// (copied from the web trader's /images/swisdex_png*.png, ~4.5:1 ratio).
const LOGO_DARK = require('../../../assets/logo-dark.png');
const LOGO_LIGHT = require('../../../assets/logo-light.png');

/** Vantage-style Home / Markets dashboard.
 *  Total Value hero → quick actions → promo hero → providers → watchlist. */
export default function MarketsTab() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const active = useAccountsStore((s) => s.active);
  const watchlist = useMarketDataStore((s) => s.watchlist);
  const instruments = useMarketDataStore((s) => s.instruments);
  const updateTick = useMarketDataStore((s) => s.updateTick);
  const setInstruments = useMarketDataStore((s) => s.setInstruments);
  const hydrateWatchlist = useMarketDataStore((s) => s.hydrateWatchlist);
  const startPlatform = usePlatformStatusStore((s) => s.start);
  const platformStatus = usePlatformStatusStore((s) => s.status);
  const unread = useNotificationsStore((s) => s.unread);

  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [referral, setReferral] = useState<BusinessSnapshot | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void hydrateWatchlist();
    startWebSocketLifecycle();
    startPlatform();
    const unsub = priceSocket.subscribe(updateTick);
    priceSocket.connect();
    return unsub;
  }, [hydrateWatchlist, startPlatform, updateTick]);

  useEffect(() => {
    if (instruments.length > 0) return;
    instrumentsApi.list().then(setInstruments).catch(() => {});
  }, [instruments.length, setInstruments]);

  // Dashboard data: banners (page=dashboard) + the personal referral
  // snapshot for the invite card.
  const loadDashboard = async () => {
    try {
      const res = await bannersApi.list('dashboard');
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.banners)
            ? res.banners
            : [];
      setBanners(list);
    } catch { setBanners([]); }

    try {
      setReferral(await businessApi.snapshot());
    } catch { setReferral(null); }
  };

  useEffect(() => { void loadDashboard(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try { setInstruments(await instrumentsApi.list()); } catch {}
    await loadDashboard();
    setRefreshing(false);
  };

  const copyReferral = async () => {
    if (!referral?.referral_code) return;
    await Clipboard.setStringAsync(referral.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };

  const shareReferral = async () => {
    if (!referral?.referral_code) return;
    await Share.share({
      message: `Trade with me on SwisDex — use my code ${referral.referral_code} to claim the welcome bonus.`,
    });
  };

  const instrumentBySymbol = useMemo(
    () => new Map(instruments.map((i) => [i.symbol, i])),
    [instruments],
  );

  const totalEquity = active?.equity ?? user?.main_wallet_balance ?? 0;
  const todayPnL = 0; // Backend doesn't expose this directly yet — placeholder slot.

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <ProfileCompleteGate />

      {/* Top header — SwisDex logo (left) | spacer | search + bell + profile (right) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[3],
          paddingBottom: theme.spacing[2],
        }}
      >
        <Image
          source={theme.scheme === 'dark' ? LOGO_DARK : LOGO_LIGHT}
          style={{ width: 132, height: 30 }}
          resizeMode="contain"
        />
        <View style={{ flex: 1 }} />
        <Pressable
          haptic="light"
          onPress={() => router.push('/instruments')}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Search size={22} color={theme.colors.text.primary} strokeWidth={1.75} />
        </Pressable>
        <Pressable
          haptic="light"
          onPress={() => router.push('/inbox')}
          style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
        >
          <Bell size={22} color={theme.colors.text.primary} strokeWidth={1.75} />
          {unread > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                paddingHorizontal: 3,
                backgroundColor: theme.colors.sell,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: theme.colors.bg.base,
              }}
            >
              <Text variant="labelXs" weight="bold" style={{ color: '#FFFFFF', fontSize: 9, lineHeight: 11 }}>
                {unread > 99 ? '99+' : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          haptic="light"
          onPress={() => router.push('/profile')}
          style={{ marginLeft: theme.spacing[1] }}
        >
          <View
            style={{
              width: 40, height: 40,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.buy,
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Text variant="bodyMd" weight="bold" style={{ color: '#FFFFFF' }}>
              {(user?.first_name?.[0] ?? user?.email?.[0] ?? 'S').toUpperCase()}
            </Text>
          </View>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.hitTargets.tabBarBottom + theme.spacing[6] }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text.secondary} />
        }
      >
        {/* Total value hero */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], gap: theme.spacing[1] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
            <Text variant="bodyMd" tone="secondary">Total Value</Text>
            <Pressable
              haptic="light"
              onPress={() => setShowBalance((v) => !v)}
              style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}
            >
              <Eye size={16} color={theme.colors.text.secondary} strokeWidth={1.75} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: theme.spacing[2] }}>
            {showBalance ? (
              <Num value={totalEquity} digits={2} variant="numXxl" />
            ) : (
              <Text variant="numXxl">••••••</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="bodyMd" tone="secondary">USD</Text>
              <ChevronDown size={14} color={theme.colors.text.secondary} strokeWidth={2} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[1], marginTop: 2 }}>
            <Text variant="bodyMd" tone="secondary">Today's PnL</Text>
            <Num value={todayPnL} digits={2} pnl signed variant="bodyMd" suffix="USD" />
          </View>
        </View>

        {/* Quick action grid */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[5] }}>
          <QuickActionGrid
            items={[
              { key: 'news', icon: <Newspaper size={22} color={theme.colors.text.primary} strokeWidth={1.75} />, label: 'News', onPress: () => router.push('/news') },
              { key: 'academy', icon: <GraduationCap size={22} color={theme.colors.text.primary} strokeWidth={1.75} />, label: 'Academy', onPress: () => router.push('/academy' as never) },
            ]}
          />
        </View>

        {/* Admin-configurable banner carousel (page=dashboard). Hidden if none. */}
        <BannerCarousel banners={banners} />

        {/* Invite friends — personal referral code (copy / share). */}
        {referral?.referral_code ? (
          <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[5] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing[3],
                padding: theme.spacing[4],
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.bg.secondary,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
              }}
            >
              <View
                style={{
                  width: 48, height: 48,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.bg.chip,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Gift size={24} color={theme.colors.buy} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant="bodyLg" weight="bold">Invite friends, earn together</Text>
                <Text variant="bodyMd" tone="secondary" numberOfLines={2}>
                  Share your code — earn commission on every trade they make.
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2], marginTop: theme.spacing[2] }}>
                  <Text variant="bodyMd" weight="bold" tone="accent" style={{ letterSpacing: 1 }}>{referral.referral_code}</Text>
                  <Pressable
                    haptic="light"
                    onPress={copyReferral}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Copy size={14} color={theme.colors.text.secondary} />
                    <Text variant="labelXs" tone="secondary">{copied ? 'COPIED' : 'COPY'}</Text>
                  </Pressable>
                  <Pressable
                    haptic="light"
                    onPress={shareReferral}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Share2 size={14} color={theme.colors.text.accent} />
                    <Text variant="labelXs" tone="accent">SHARE</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        ) : referral !== null ? (
          <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[5] }}>
            <Pressable
              haptic="light"
              onPress={() => router.push('/earn/referral')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing[3],
                padding: theme.spacing[4],
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.bg.secondary,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
              }}
            >
              <View
                style={{
                  width: 48, height: 48,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.bg.chip,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Gift size={24} color={theme.colors.buy} strokeWidth={1.75} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyLg" weight="bold">Invite friends, earn together</Text>
                <Text variant="bodyMd" tone="accent">Get your referral link</Text>
              </View>
              <ChevronRight size={16} color={theme.colors.text.tertiary} />
            </Pressable>
          </View>
        ) : null}

        {/* Watchlist */}
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.spacing[4],
              paddingBottom: theme.spacing[2],
            }}
          >
            <Text variant="h2">Watchlist</Text>
            <Pressable haptic="light" onPress={() => router.push('/instruments')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="bodyMd" tone="accent">Add</Text>
              <ChevronRight size={16} color={theme.colors.text.accent} />
            </Pressable>
          </View>

          {watchlist.length === 0 && instruments.length === 0 ? (
            <View style={{ paddingHorizontal: theme.spacing[4], gap: theme.spacing[2] }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} width="100%" height={56} radius={theme.radius.lg} />
              ))}
            </View>
          ) : (
            watchlist.map((sym) => (
              <MarketRow
                key={sym}
                symbol={sym}
                instrument={instrumentBySymbol.get(sym)}
                onPress={() => {
                  useMarketDataStore.getState().setSelectedSymbol(sym);
                  router.push('/(app)/(tabs)/trade');
                }}
              />
            ))
          )}
        </View>

        {platformStatus?.maintenance_mode ? (
          <View
            style={{
              marginHorizontal: theme.spacing[4],
              marginTop: theme.spacing[5],
              padding: theme.spacing[4],
              borderRadius: theme.radius.lg,
              backgroundColor: theme.colors.bg.secondary,
              borderWidth: 1,
              borderColor: theme.colors.warning,
            }}
          >
            <Text variant="label" tone="warning">Maintenance mode</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="bodyMd" tone="secondary">Trading is temporarily paused by the broker.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}

/** Image banner carousel matching the web dashboard (5:1 aspect, auto-advance,
 *  paging dots). Renders nothing when there are no banners. */
function BannerCarousel({ banners }: { banners: Banner[] }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const pageWidth = width - theme.spacing[4] * 2;
  const visible = banners.filter((b) => !!b.image_url);

  useEffect(() => {
    if (visible.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % visible.length;
        scrollRef.current?.scrollTo({ x: next * pageWidth, animated: true });
        return next;
      });
    }, 4_000);
    return () => clearInterval(t);
  }, [visible.length, pageWidth]);

  if (visible.length === 0) return null;

  return (
    <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[5] }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
      >
        {visible.map((b) => (
          <Pressable
            key={b.id}
            haptic="light"
            onPress={() => { if (b.link_url) void Linking.openURL(b.link_url); }}
            style={{ width: pageWidth, borderRadius: theme.radius.lg, overflow: 'hidden' }}
          >
            <Image
              source={{ uri: b.image_url ?? undefined }}
              style={{ width: pageWidth, aspectRatio: 5, backgroundColor: theme.colors.bg.secondary }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>
      {visible.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: theme.spacing[2] }}>
          {visible.map((b, i) => (
            <View
              key={b.id}
              style={{
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: i === index ? theme.colors.buy : theme.colors.border.primary,
              }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

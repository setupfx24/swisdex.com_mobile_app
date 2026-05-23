import { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronDown, Eye, Search, MessageCircle,
  Gift, Newspaper, CalendarDays, Video, Trophy, ChevronRight,
} from 'lucide-react-native';
import { Text, Num, Pressable, Skeleton } from '@/ui';
import { useTheme } from '@/theme';
import { useAccountsStore } from '@/stores/accountsStore';
import { useAuthStore } from '@/stores/authStore';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { usePlatformStatusStore } from '@/stores/platformStatusStore';
import { priceSocket } from '@/lib/ws/priceSocket';
import { startWebSocketLifecycle } from '@/lib/ws/appStateLifecycle';
import { instrumentsApi } from '@/lib/api/instruments';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';
import { MarketRow } from '@/features/markets/components/MarketRow';
import { HeroCard } from '@/shared/components/HeroCard';
import { QuickActionGrid } from '@/shared/components/QuickActionGrid';

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

  const [refreshing, setRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

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

  const onRefresh = async () => {
    setRefreshing(true);
    try { setInstruments(await instrumentsApi.list()); } catch {}
    setRefreshing(false);
  };

  const instrumentBySymbol = useMemo(
    () => new Map(instruments.map((i) => [i.symbol, i])),
    [instruments],
  );

  const totalEquity = active?.equity ?? user?.main_wallet_balance ?? 0;
  const todayPnL = 0; // Backend doesn't expose this directly yet — placeholder slot.

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <ProfileCompleteGate />

      {/* Top header — avatar | spacer | search + chat */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2],
          paddingBottom: theme.spacing[2],
        }}
      >
        <View
          style={{
            width: 36, height: 36,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.bg.secondary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text variant="bodyMd" weight="bold">
            {(user?.first_name?.[0] ?? user?.email?.[0] ?? 'S').toUpperCase()}
          </Text>
        </View>
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
          <MessageCircle size={22} color={theme.colors.text.primary} strokeWidth={1.75} />
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
              { key: 'promo', icon: <Gift size={22} color={theme.colors.text.primary} strokeWidth={1.75} />, label: 'Promotion', onPress: () => router.push('/earn') },
              { key: 'news', icon: <Newspaper size={22} color={theme.colors.text.primary} strokeWidth={1.75} />, label: 'News', onPress: () => {} },
              { key: 'cal', icon: <CalendarDays size={22} color={theme.colors.text.primary} strokeWidth={1.75} />, label: 'Calendar', onPress: () => {} },
              { key: 'webinar', icon: <Video size={22} color={theme.colors.text.primary} strokeWidth={1.75} />, label: 'Webinar', onPress: () => {} },
            ]}
          />
        </View>

        {/* Promotional hero card */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[5] }}>
          <HeroCard
            title="Top 20 Performing Signal Providers"
            chips={['Copy Trading', '30D Returns']}
            cta="View More"
            decoration={<Trophy size={48} color={theme.colors.warning} strokeWidth={1.5} />}
            onPress={() => router.push('/earn/copy')}
          />
        </View>

        {/* Best Overall Strategies — horizontal scroll */}
        <View style={{ paddingBottom: theme.spacing[5] }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: theme.spacing[4],
              paddingBottom: theme.spacing[3],
            }}
          >
            <Text variant="h2">Best Overall Strategies</Text>
            <Pressable haptic="light" onPress={() => router.push('/earn/copy')} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="bodyMd" tone="accent">More</Text>
              <ChevronRight size={16} color={theme.colors.text.accent} />
            </Pressable>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.spacing[4], gap: theme.spacing[3] }}
          >
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{
                  width: 160,
                  padding: theme.spacing[4],
                  borderRadius: theme.radius.lg,
                  backgroundColor: theme.colors.bg.secondary,
                  gap: theme.spacing[2],
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                  <View
                    style={{
                      width: 32, height: 32,
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.colors.bg.chip,
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Text variant="labelXs" weight="bold">T{i}</Text>
                  </View>
                  <Text variant="bodyMd" weight="bold">Trader {i}</Text>
                </View>
                <View style={{ paddingTop: theme.spacing[4] }}>
                  <Text variant="labelXs" tone="secondary">30D Return</Text>
                  <Num value={12 + i * 4.5} digits={1} suffix="%" tone="buy" variant="numXl" />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

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
  );
}

import { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Text, Divider, Pressable, Skeleton } from '@/ui';
import { useTheme } from '@/theme';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { usePlatformStatusStore } from '@/stores/platformStatusStore';
import { priceSocket } from '@/lib/ws/priceSocket';
import { startWebSocketLifecycle } from '@/lib/ws/appStateLifecycle';
import { instrumentsApi } from '@/lib/api/instruments';
import { ActiveAccountBadge } from '@/features/accounts/ActiveAccountBadge';
import { InstrumentRow } from '@/features/market/InstrumentRow';
import { ProfileCompleteGate } from '@/features/auth/ProfileCompleteGate';

export default function MarketsTab() {
  const theme = useTheme();
  const watchlist = useMarketDataStore((s) => s.watchlist);
  const instruments = useMarketDataStore((s) => s.instruments);
  const updateTick = useMarketDataStore((s) => s.updateTick);
  const setInstruments = useMarketDataStore((s) => s.setInstruments);
  const hydrateWatchlist = useMarketDataStore((s) => s.hydrateWatchlist);
  const removeFromWatchlist = useMarketDataStore((s) => s.removeFromWatchlist);
  const startPlatform = usePlatformStatusStore((s) => s.start);
  const platformStatus = usePlatformStatusStore((s) => s.status);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingInstruments, setLoadingInstruments] = useState(true);

  useEffect(() => {
    void hydrateWatchlist();
    startWebSocketLifecycle();
    startPlatform();
    const unsub = priceSocket.subscribe(updateTick);
    priceSocket.connect();
    return () => {
      unsub();
      // Don't disconnect the socket — other screens may still be subscribed.
    };
  }, [hydrateWatchlist, startPlatform, updateTick]);

  useEffect(() => {
    if (instruments.length > 0) {
      setLoadingInstruments(false);
      return;
    }
    instrumentsApi
      .list()
      .then((list) => {
        setInstruments(list);
        setLoadingInstruments(false);
      })
      .catch(() => setLoadingInstruments(false));
  }, [instruments.length, setInstruments]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const list = await instrumentsApi.list();
      setInstruments(list);
    } catch {
      /* swallow */
    } finally {
      setRefreshing(false);
    }
  };

  const instrumentBySymbol = useMemo(
    () => new Map(instruments.map((i) => [i.symbol, i])),
    [instruments],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <ProfileCompleteGate />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: theme.spacing[4],
          paddingTop: theme.spacing[2],
          paddingBottom: theme.spacing[2],
        }}
      >
        <Text variant="h2">Markets</Text>
        <ActiveAccountBadge />
      </View>

      {platformStatus?.maintenance_mode ? (
        <View
          style={{
            marginHorizontal: theme.spacing[4],
            marginBottom: theme.spacing[2],
            padding: theme.spacing[3],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            borderWidth: 1,
            borderColor: theme.colors.warning,
          }}
        >
          <Text variant="label" tone="warning">Maintenance mode</Text>
          <View style={{ height: theme.spacing[1] }} />
          <Text variant="body" tone="secondary">Trading is temporarily paused by the broker.</Text>
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{ paddingBottom: theme.spacing[10] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.text.secondary} />}
      >
        {/* Column header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: theme.spacing[4],
            paddingVertical: theme.spacing[1],
            gap: theme.spacing[3],
          }}
        >
          <View style={{ flex: 1 }}><Text variant="labelXs" tone="tertiary">SYMBOL</Text></View>
          <View style={{ width: 84, alignItems: 'flex-end' }}><Text variant="labelXs" tone="tertiary">BID</Text></View>
          <View style={{ width: 84, alignItems: 'flex-end' }}><Text variant="labelXs" tone="tertiary">ASK</Text></View>
        </View>
        <Divider />

        {watchlist.length === 0 ? (
          <View style={{ padding: theme.spacing[6] }}>
            <Text variant="bodyMd" tone="tertiary" align="center">Watchlist is empty.</Text>
            <View style={{ height: theme.spacing[3] }} />
            <Pressable
              onPress={() => router.push('/instruments')}
              haptic="light"
              style={({ pressed }) => ({
                alignSelf: 'center',
                paddingVertical: theme.spacing[2],
                paddingHorizontal: theme.spacing[4],
                borderRadius: theme.radius.lg,
                backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
              })}
            >
              <Text variant="bodyMd" weight="medium">Add symbols</Text>
            </Pressable>
          </View>
        ) : loadingInstruments && instruments.length === 0 ? (
          <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={28} />
            ))}
          </View>
        ) : (
          <>
            {watchlist.map((sym) => (
              <View key={sym}>
                <InstrumentRow
                  symbol={sym}
                  instrument={instrumentBySymbol.get(sym)}
                  onPress={() => {
                    useMarketDataStore.getState().setSelectedSymbol(sym);
                    router.push('/(app)/(tabs)/trade');
                  }}
                />
                <Divider inset={theme.spacing[4]} />
              </View>
            ))}

            <View style={{ height: theme.spacing[2] }} />
            <Pressable
              onPress={() => router.push('/instruments')}
              haptic="light"
              style={({ pressed }) => ({
                marginHorizontal: theme.spacing[4],
                paddingVertical: theme.spacing[2],
                paddingHorizontal: theme.spacing[3],
                borderRadius: theme.radius.lg,
                backgroundColor: pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                borderWidth: 1,
                borderColor: theme.colors.border.primary,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing[2],
                alignSelf: 'flex-start',
              })}
            >
              <Plus size={14} color={theme.colors.text.primary} strokeWidth={2} />
              <Text variant="bodyMd" weight="medium">Add symbol</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

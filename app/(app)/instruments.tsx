import { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Search, Check } from 'lucide-react-native';
import { Text, Field, Divider, Pressable, Skeleton } from '@/ui';
import { useTheme } from '@/theme';
import { useMarketDataStore } from '@/stores/marketDataStore';
import { instrumentsApi } from '@/lib/api/instruments';
import { ProfileHeader } from './profile';
import type { InstrumentInfo } from '@/types/market';

const SEGMENTS = ['all', 'forex', 'metals', 'crypto', 'indices', 'stocks', 'commodities'] as const;
type Segment = typeof SEGMENTS[number];

export default function InstrumentsScreen() {
  const theme = useTheme();
  const instruments = useMarketDataStore((s) => s.instruments);
  const setInstruments = useMarketDataStore((s) => s.setInstruments);
  const watchlist = useMarketDataStore((s) => s.watchlist);
  const add = useMarketDataStore((s) => s.addToWatchlist);
  const remove = useMarketDataStore((s) => s.removeFromWatchlist);

  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<Segment>('all');
  const [loading, setLoading] = useState(instruments.length === 0);

  useEffect(() => {
    if (instruments.length > 0) return;
    instrumentsApi.list().then((list) => {
      setInstruments(list);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [instruments.length, setInstruments]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return instruments
      .filter((i) => i.is_active !== false)
      .filter((i) => segment === 'all' || i.segment === segment)
      .filter((i) =>
        q === '' ? true : i.symbol.includes(q) || (i.name?.toUpperCase().includes(q) ?? false),
      );
  }, [instruments, query, segment]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Instruments' }} />
      <ProfileHeader title="Instruments" />

      <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[2], gap: theme.spacing[2] }}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Search symbol or name"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing[2] }}>
          {SEGMENTS.map((s) => {
            const selected = segment === s;
            return (
              <Pressable
                key={s}
                onPress={() => setSegment(s)}
                haptic="light"
                style={({ pressed }) => ({
                  paddingVertical: theme.spacing[1],
                  paddingHorizontal: theme.spacing[3],
                  borderRadius: theme.radius.full,
                  backgroundColor: selected ? theme.colors.buy : pressed ? theme.colors.bg.hover : theme.colors.bg.secondary,
                  borderWidth: 1,
                  borderColor: selected ? theme.colors.buy : theme.colors.border.primary,
                })}
              >
                <Text variant="labelXs" tone={selected ? 'inverse' : 'secondary'}>{s.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <Divider />

      {loading ? (
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[2] }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={28} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <InstrumentRow
              item={item}
              inWatchlist={watchlist.includes(item.symbol)}
              onToggle={() => (watchlist.includes(item.symbol) ? remove(item.symbol) : add(item.symbol))}
            />
          )}
          ItemSeparatorComponent={() => <Divider inset={theme.spacing[4]} />}
          ListEmptyComponent={
            <View style={{ padding: theme.spacing[6] }}>
              <Text variant="bodyMd" tone="tertiary" align="center">No symbols match.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: theme.spacing[10] }}
          windowSize={5}
          removeClippedSubviews
          initialNumToRender={20}
        />
      )}
    </SafeAreaView>
  );
}

function InstrumentRow({
  item,
  inWatchlist,
  onToggle,
}: {
  item: InstrumentInfo;
  inWatchlist: boolean;
  onToggle: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        useMarketDataStore.getState().setSelectedSymbol(item.symbol);
        router.push('/(app)/(tabs)/trade');
      }}
      haptic="light"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[4],
        paddingVertical: theme.spacing[3],
        backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
        gap: theme.spacing[3],
      })}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyMd" weight="medium">{item.symbol}</Text>
        <Text variant="labelXs" tone="tertiary">{item.segment}{item.name ? ` · ${item.name}` : ''}</Text>
      </View>
      <Pressable
        onPress={onToggle}
        haptic="medium"
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: inWatchlist ? theme.colors.buy : pressed ? theme.colors.bg.active : theme.colors.bg.secondary,
          borderWidth: 1,
          borderColor: inWatchlist ? theme.colors.buy : theme.colors.border.primary,
        })}
      >
        {inWatchlist ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : <Text variant="bodyMd" weight="bold">+</Text>}
      </Pressable>
    </Pressable>
  );
}

import { useEffect, useState, useCallback, useMemo } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react-native';
import { Text, Num, Divider, SkeletonRow, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi } from '@/lib/api/wallet';
import type { WalletTransaction } from '@/types/wallet';
import { ProfileHeader } from '../profile';

type TxnFilter = 'all' | 'transfer';
const FILTERS: { key: TxnFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'transfer', label: 'Internal Transfer' },
];

export default function TransactionsScreen() {
  const theme = useTheme();
  const [rows, setRows] = useState<WalletTransaction[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<TxnFilter>('all');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const visible = useMemo(() => {
    if (!rows) return rows;
    if (filter === 'transfer') {
      return rows.filter((r) => r.type === 'transfer_in' || r.type === 'transfer_out');
    }
    return rows;
  }, [rows, filter]);

  const currentLabel = FILTERS.find((f) => f.key === filter)?.label ?? 'All';

  useEffect(() => {
    walletApi.transactions({ page: 1, per_page: 30 }).then((r) => {
      setRows(r.items);
      setPages(r.pages);
    }).catch(() => setRows([]));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const next = await walletApi.transactions({ page: page + 1, per_page: 30 });
      setRows((prev) => [...(prev ?? []), ...next.items]);
      setPage(page + 1);
      setPages(next.pages);
    } finally { setLoadingMore(false); }
  }, [page, pages, loadingMore]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Transactions' }} />
      <ProfileHeader title="Transactions" />

      {/* Filter dropdown — All / Internal Transfer */}
      <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[2], zIndex: 10 }}>
        <Pressable
          haptic="light"
          onPress={() => setDropdownOpen((o) => !o)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.spacing[3],
            paddingVertical: theme.spacing[2],
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
          }}
        >
          <Text variant="bodyMd" weight="medium">{currentLabel}</Text>
          <ChevronDown size={16} color={theme.colors.text.secondary} strokeWidth={2} />
        </Pressable>
        {dropdownOpen ? (
          <View
            style={{
              marginTop: 4,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.secondary,
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
              overflow: 'hidden',
            }}
          >
            {FILTERS.map((f, i) => {
              const sel = filter === f.key;
              return (
                <View key={f.key}>
                  <Pressable
                    haptic="light"
                    onPress={() => { setFilter(f.key); setDropdownOpen(false); }}
                    style={({ pressed }) => ({
                      paddingHorizontal: theme.spacing[3],
                      paddingVertical: theme.spacing[3],
                      backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                    })}
                  >
                    <Text variant="bodyMd" weight={sel ? 'bold' : 'regular'} tone={sel ? 'accent' : 'primary'}>
                      {f.label}
                    </Text>
                  </Pressable>
                  {i < FILTERS.length - 1 ? <Divider /> : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      {rows === null ? (
        <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={6} /></View>
      ) : (
        <FlatList
          data={visible ?? []}
          keyExtractor={(r) => r.id}
          ListEmptyComponent={
            <View style={{ padding: theme.spacing[6] }}>
              <Text variant="bodyMd" tone="tertiary" align="center">
                {filter === 'transfer' ? 'No internal transfers found.' : 'No transactions yet.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View>
              <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3], flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMd" weight="medium">{item.type.replace('_', ' ')}</Text>
                  <Text variant="labelXs" tone="tertiary">
                    {format(new Date(item.created_at), 'MMM d, HH:mm')} · {item.status}
                  </Text>
                  {item.description ? (
                    <Text variant="body" tone="tertiary" numberOfLines={1}>{item.description}</Text>
                  ) : null}
                </View>
                <Num value={item.amount} digits={2} pnl signed variant="numLg" suffix={item.currency} />
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </SafeAreaView>
  );
}

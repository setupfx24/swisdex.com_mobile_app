import { useEffect, useState, useCallback } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Num, Divider, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { walletApi } from '@/lib/api/wallet';
import type { WalletTransaction } from '@/types/wallet';
import { ProfileHeader } from '../profile';

export default function TransactionsScreen() {
  const theme = useTheme();
  const [rows, setRows] = useState<WalletTransaction[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

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
      {rows === null ? (
        <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={6} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
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

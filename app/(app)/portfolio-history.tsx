import { useEffect, useState, useCallback } from 'react';
import { View, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { format } from 'date-fns';
import { Text, Num, Divider, SkeletonRow } from '@/ui';
import { useTheme } from '@/theme';
import { portfolioApi, type TradeRow } from '@/lib/api/portfolio';
import { ProfileHeader } from './profile';

export default function PortfolioHistoryScreen() {
  const theme = useTheme();
  const [rows, setRows] = useState<TradeRow[] | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    portfolioApi.trades({ page: 1, per_page: 30 }).then((r) => {
      setRows(r.items);
      setPages(r.pages);
    }).catch(() => setRows([]));
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= pages) return;
    setLoadingMore(true);
    try {
      const next = await portfolioApi.trades({ page: page + 1, per_page: 30 });
      setRows((prev) => [...(prev ?? []), ...next.items]);
      setPage(page + 1);
      setPages(next.pages);
    } finally {
      setLoadingMore(false);
    }
  }, [page, pages, loadingMore]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Trade history' }} />
      <ProfileHeader title="Trade history" />
      {rows === null ? (
        <View style={{ padding: theme.spacing[4] }}><SkeletonRow count={6} /></View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <View>
              <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing[2] }}>
                    <Text variant="bodyMd" weight="bold" tone={item.side === 'buy' ? 'buy' : 'sell'}>
                      {item.side.toUpperCase()}
                    </Text>
                    <Text variant="bodyMd" weight="medium">{item.symbol}</Text>
                    <Text variant="labelXs" tone="tertiary">{item.lots}</Text>
                  </View>
                  <Num value={item.profit} digits={2} pnl signed variant="num" />
                </View>
                <View style={{ flexDirection: 'row', gap: theme.spacing[3], marginTop: 2 }}>
                  <Text variant="labelXs" tone="tertiary">
                    {item.open_price} → {item.close_price}
                  </Text>
                  <Text variant="labelXs" tone="tertiary">
                    {format(new Date(item.close_time), 'MMM d HH:mm')}
                  </Text>
                  {item.close_reason ? (
                    <Text variant="labelXs" tone="tertiary">{item.close_reason.toUpperCase()}</Text>
                  ) : null}
                </View>
              </View>
              <Divider inset={theme.spacing[4]} />
            </View>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={{ padding: theme.spacing[6] }}>
              <Text variant="bodyMd" tone="tertiary" align="center">No trades yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

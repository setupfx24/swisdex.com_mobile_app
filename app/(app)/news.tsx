import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Text, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { ProfileHeader } from './profile';

interface NewsItem {
  id: string;
  source: string;
  title: string;
  time: string;
}

const NEWS: NewsItem[] = [
  { id: 'n1', source: 'Reuters', title: 'Dollar steadies ahead of key inflation print as traders weigh rate path', time: '2h ago' },
  { id: 'n2', source: 'Bloomberg', title: 'Gold holds near record as safe-haven demand offsets stronger yields', time: '3h ago' },
  { id: 'n3', source: 'FXStreet', title: 'EUR/USD: Bulls eye 1.10 as ECB decision looms', time: '5h ago' },
  { id: 'n4', source: 'CoinDesk', title: 'Bitcoin consolidates above support after volatile session', time: '6h ago' },
  { id: 'n5', source: 'MarketWatch', title: 'Oil edges higher on supply concerns; inventories in focus', time: '8h ago' },
];

export default function NewsScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Economic News' }} />
      <ProfileHeader title="Economic News" />

      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[8] }}>
        <View style={{ paddingTop: theme.spacing[2] }}>
          <Divider />
          {NEWS.map((n) => (
            <View key={n.id}>
              <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3], gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="labelXs" tone="accent">{n.source.toUpperCase()}</Text>
                  <Text variant="labelXs" tone="tertiary">{n.time}</Text>
                </View>
                <Text variant="bodyMd">{n.title}</Text>
              </View>
              <Divider />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

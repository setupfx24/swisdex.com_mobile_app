import { useEffect, useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Text, Divider, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { phases } from '@/data/academy';
import { useAcademyStore } from '@/stores/academyStore';
import { ProfileHeader } from '../profile';

export default function AcademyHome() {
  const theme = useTheme();
  const hydrate = useAcademyStore((s) => s.hydrate);
  const hydrated = useAcademyStore((s) => s.hydrated);
  const completed = useAcademyStore((s) => s.completed);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const totalModules = useMemo(
    () => phases.reduce((sum, p) => sum + p.modules.length, 0),
    [],
  );
  const completedCount = completed.length;
  const pct = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Academy' }} />
      <ProfileHeader title="SwisDex Academy" />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        {/* Overall progress */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
          <Text variant="bodyMd" tone="secondary">
            The complete trader curriculum — 8 phases, {totalModules} modules. Master forex from
            foundations to professional trading.
          </Text>
          <View style={{ height: theme.spacing[4] }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="labelXs" tone="tertiary">YOUR PROGRESS</Text>
            <Text variant="bodyB" tone="accent">
              {completedCount}/{totalModules} · {pct}%
            </Text>
          </View>
          <View style={{ height: theme.spacing[2] }} />
          <View
            style={{
              height: 8,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.bg.tertiary,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${pct}%`,
                backgroundColor: theme.colors.buy,
                borderRadius: theme.radius.pill,
              }}
            />
          </View>
        </View>

        <Divider />

        {/* Phase list */}
        {phases.map((phase) => {
          const moduleIds = phase.modules.map((m) => m.id);
          const done = moduleIds.filter((id) => completed.includes(id)).length;
          const total = moduleIds.length;
          const phaseComplete = total > 0 && done === total;
          return (
            <View key={phase.id}>
              <Pressable
                onPress={() => router.push({ pathname: '/academy/[phaseId]', params: { phaseId: String(phase.id) } })}
                haptic="light"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing[3],
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                })}
              >
                {/* Phase numeral badge */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: theme.radius.md,
                    backgroundColor: `${theme.colors.buy}22`,
                    borderWidth: 1,
                    borderColor: `${theme.colors.buy}55`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text variant="bodyB" style={{ color: theme.colors.buy }}>{phase.num}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text variant="bodyM" weight="bold" numberOfLines={1} style={{ flex: 1 }}>
                      {phase.title}
                    </Text>
                    {phaseComplete ? (
                      <Text variant="labelXs" tone="buy"> ✓ DONE</Text>
                    ) : null}
                  </View>
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {phase.subtitle}
                  </Text>
                  <View style={{ height: 2 }} />
                  <Text variant="caption" tone="tertiary">
                    {phase.level} · {phase.duration} · {total} modules · {done}/{total} done
                  </Text>
                </View>
              </Pressable>
              <Divider />
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

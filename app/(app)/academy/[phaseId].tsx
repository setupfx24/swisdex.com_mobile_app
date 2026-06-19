import { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text, Divider, Pressable, Button } from '@/ui';
import { useTheme } from '@/theme';
import { phases } from '@/data/academy';
import { useAcademyStore } from '@/stores/academyStore';
import { ProfileHeader } from '../profile';

export default function PhaseDetail() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ phaseId: string }>();
  const phaseId = Number(params.phaseId);
  const phase = phases.find((p) => p.id === phaseId);

  const hydrate = useAcademyStore((s) => s.hydrate);
  const hydrated = useAcademyStore((s) => s.hydrated);
  const completed = useAcademyStore((s) => s.completed);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  if (!phase) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title: 'Phase' }} />
        <ProfileHeader title="Phase" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="tertiary">Phase not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const done = phase.modules.filter((m) => completed.includes(m.id)).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: phase.title }} />
      <ProfileHeader title={`Phase ${phase.num}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[10] }}>
        {/* Phase header */}
        <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
          <View
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: theme.spacing[2],
              paddingVertical: 2,
              borderRadius: theme.radius.sm,
              backgroundColor: `${theme.colors.buy}22`,
              borderWidth: 1,
              borderColor: `${theme.colors.buy}55`,
              marginBottom: theme.spacing[2],
            }}
          >
            <Text variant="labelXs" style={{ color: theme.colors.buy }}>
              {phase.level} · {phase.duration}
            </Text>
          </View>
          <Text variant="title1">{phase.title}</Text>
          <Text variant="bodyM" tone="secondary">{phase.subtitle}</Text>
          <View style={{ height: theme.spacing[2] }} />
          <Text variant="bodyMd" tone="secondary">{phase.description}</Text>
          <View style={{ height: theme.spacing[2] }} />
          <Text variant="caption" tone="tertiary">
            {done}/{phase.modules.length} modules complete · {phase.totalMinutes} min total
          </Text>
        </View>

        <Divider />

        {/* Modules */}
        {phase.modules.map((m) => {
          const isDone = completed.includes(m.id);
          return (
            <View key={m.id}>
              <Pressable
                onPress={() => router.push({ pathname: '/academy/[phaseId]/[moduleId]', params: { phaseId: String(phase.id), moduleId: m.id } })}
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
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: theme.radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDone ? theme.colors.buy : theme.colors.bg.tertiary,
                  }}
                >
                  <Text variant="caption" weight="bold" style={{ color: isDone ? '#FFFFFF' : theme.colors.text.tertiary }}>
                    {isDone ? '✓' : m.id}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMd" weight="medium">{m.title}</Text>
                  <Text variant="caption" tone="tertiary">
                    {m.topics} topics · {m.minutes} min · {m.level}
                  </Text>
                </View>
              </Pressable>
              <Divider />
            </View>
          );
        })}

        {/* Quiz CTA */}
        <View style={{ padding: theme.spacing[4] }}>
          <Button variant="secondary" onPress={() => router.push({ pathname: '/academy/[phaseId]/quiz', params: { phaseId: String(phase.id) } })}>
            Take {phase.quiz.title}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

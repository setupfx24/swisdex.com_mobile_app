import { useEffect, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text, Divider, Pressable, Button } from '@/ui';
import { useTheme, type Theme } from '@/theme';
import { phases, lessonContent, type TopicBlock } from '@/data/academy';
import { useAcademyStore } from '@/stores/academyStore';
import { ProfileHeader } from '../../profile';

// --- TopicBlock renderer ---------------------------------------------------
// Each block carries a `type` discriminator plus type-specific *Data fields.
// Icon fields are plain emoji/strings — rendered as text, never as components.

function BlockView({ block, theme }: { block: TopicBlock; theme: Theme }) {
  const accent = theme.colors.text.accent;

  switch (block.type) {
    case 'text':
      return (
        <Text variant="bodyMd" tone="secondary" style={{ marginBottom: theme.spacing[3] }}>
          {block.content}
        </Text>
      );

    case 'definition':
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: theme.colors.info,
            backgroundColor: theme.colors.bg.secondary,
            borderRadius: theme.radius.md,
            padding: theme.spacing[3],
            marginBottom: theme.spacing[3],
          }}
        >
          <Text variant="labelXs" style={{ color: theme.colors.info, marginBottom: 4 }}>DEFINITION</Text>
          <Text variant="bodyMd" tone="primary">{block.content}</Text>
        </View>
      );

    case 'keyConcept':
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: accent,
            backgroundColor: theme.colors.buyBg,
            borderRadius: theme.radius.md,
            padding: theme.spacing[3],
            marginBottom: theme.spacing[3],
          }}
        >
          <Text variant="labelXs" tone="accent" style={{ marginBottom: 4 }}>KEY CONCEPT</Text>
          <Text variant="bodyMd" tone="primary">{block.content}</Text>
        </View>
      );

    case 'practiceTip':
      return (
        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: theme.colors.warning,
            backgroundColor: theme.colors.bg.secondary,
            borderRadius: theme.radius.md,
            padding: theme.spacing[3],
            marginBottom: theme.spacing[3],
          }}
        >
          <Text variant="labelXs" style={{ color: theme.colors.warning, marginBottom: 4 }}>💡 PRACTICE TIP</Text>
          <Text variant="bodyMd" tone="primary">{block.content}</Text>
        </View>
      );

    case 'comparison': {
      const data = block.comparisonData;
      if (!data) return null;
      const Col = ({ title, items }: { title: string; items: string[] }) => (
        <View
          style={{
            flex: 1,
            backgroundColor: theme.colors.bg.secondary,
            borderRadius: theme.radius.md,
            padding: theme.spacing[3],
          }}
        >
          <Text variant="captionB" tone="accent" style={{ marginBottom: theme.spacing[2] }}>{title}</Text>
          {items.map((it, i) => (
            <Text key={i} variant="caption" tone="secondary" style={{ marginBottom: 4 }}>• {it}</Text>
          ))}
        </View>
      );
      return (
        <View style={{ marginBottom: theme.spacing[3] }}>
          {block.content ? (
            <Text variant="labelXs" tone="tertiary" style={{ marginBottom: theme.spacing[2] }}>{block.content}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: theme.spacing[2] }}>
            <Col title={data.left.title} items={data.left.items} />
            <Col title={data.right.title} items={data.right.items} />
          </View>
        </View>
      );
    }

    case 'timeline': {
      const data = block.timelineData;
      if (!data) return null;
      return (
        <View style={{ marginBottom: theme.spacing[3] }}>
          {block.content ? (
            <Text variant="labelXs" tone="tertiary" style={{ marginBottom: theme.spacing[2] }}>{block.content}</Text>
          ) : null}
          {data.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: theme.spacing[3], marginBottom: theme.spacing[2] }}>
              <Text variant="bodyMd">{t.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text variant="captionB" tone="accent">{t.year} · {t.label}</Text>
                <Text variant="caption" tone="secondary">{t.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    case 'stats': {
      const data = block.statsData;
      if (!data) return null;
      return (
        <View style={{ marginBottom: theme.spacing[3] }}>
          {block.content ? (
            <Text variant="labelXs" tone="tertiary" style={{ marginBottom: theme.spacing[2] }}>{block.content}</Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
            {data.map((s, i) => (
              <View
                key={i}
                style={{
                  width: '47%',
                  flexGrow: 1,
                  backgroundColor: theme.colors.bg.secondary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing[3],
                }}
              >
                <Text variant="bodyMd">{s.icon}</Text>
                <Text variant="numLg" tone="accent">{s.value}</Text>
                <Text variant="captionB" tone="primary">{s.label}</Text>
                <Text variant="caption" tone="tertiary">{s.sublabel}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    case 'sessions': {
      const data = block.sessionsData;
      if (!data) return null;
      return (
        <View style={{ marginBottom: theme.spacing[3] }}>
          {block.content ? (
            <Text variant="labelXs" tone="tertiary" style={{ marginBottom: theme.spacing[2] }}>{block.content}</Text>
          ) : null}
          {data.map((s, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: theme.spacing[2],
                borderBottomWidth: i < data.length - 1 ? 1 : 0,
                borderBottomColor: theme.colors.border.primary,
              }}
            >
              <Text variant="bodyMd">{s.flag}  {s.city}</Text>
              <Text variant="caption" tone="secondary">{s.hours}</Text>
            </View>
          ))}
        </View>
      );
    }

    case 'hierarchy': {
      const data = block.hierarchyData;
      if (!data) return null;
      return (
        <View style={{ marginBottom: theme.spacing[3] }}>
          {block.content ? (
            <Text variant="labelXs" tone="tertiary" style={{ marginBottom: theme.spacing[2] }}>{block.content}</Text>
          ) : null}
          {data.map((h, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: theme.spacing[3],
                alignItems: 'flex-start',
                marginBottom: theme.spacing[2],
              }}
            >
              <Text variant="bodyMd">{h.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text variant="captionB" tone="primary">{h.title}</Text>
                <Text variant="caption" tone="secondary">{h.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      );
    }

    default:
      return null;
  }
}

export default function LessonScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ phaseId: string; moduleId: string }>();
  const phaseId = Number(params.phaseId);
  const moduleId = String(params.moduleId);

  const phase = phases.find((p) => p.id === phaseId);
  const moduleMeta = phase?.modules.find((m) => m.id === moduleId);
  const lesson = lessonContent[moduleId];

  const hydrate = useAcademyStore((s) => s.hydrate);
  const hydrated = useAcademyStore((s) => s.hydrated);
  const markComplete = useAcademyStore((s) => s.markComplete);
  const done = useAcademyStore((s) => s.completed.includes(moduleId));

  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    if (!hydrated) void hydrate();
  }, [hydrated, hydrate]);

  const title = moduleMeta?.title ?? `Module ${moduleId}`;

  if (!lesson || lesson.topics.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
        <Stack.Screen options={{ title }} />
        <ProfileHeader title={title} />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="tertiary">
            {lesson?.studyNotes ?? 'Module content coming soon.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title }} />
      <ProfileHeader title={`Module ${moduleId}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[12] }}>
        <View style={{ paddingHorizontal: theme.spacing[4], paddingTop: theme.spacing[2], paddingBottom: theme.spacing[3] }}>
          <Text variant="title1">{title}</Text>
          {moduleMeta ? (
            <Text variant="caption" tone="tertiary">
              {moduleMeta.topics} topics · {moduleMeta.minutes} min · {moduleMeta.level}
            </Text>
          ) : null}
        </View>

        <Divider />

        {/* Topics — expandable sections */}
        {lesson.topics.map((topic, idx) => {
          const open = expanded === idx;
          return (
            <View key={topic.id}>
              <Pressable
                onPress={() => setExpanded(open ? null : idx)}
                haptic="light"
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing[2],
                  paddingHorizontal: theme.spacing[4],
                  paddingVertical: theme.spacing[3],
                  backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
                })}
              >
                <Text variant="captionB" tone="accent" style={{ width: 20 }}>{idx + 1}</Text>
                <Text variant="bodyMd" weight="semibold" style={{ flex: 1 }}>{topic.title}</Text>
                <Text variant="bodyMd" tone="tertiary">{open ? '−' : '+'}</Text>
              </Pressable>
              {open ? (
                <View style={{ paddingHorizontal: theme.spacing[4], paddingBottom: theme.spacing[3] }}>
                  {topic.blocks.map((block, bi) => (
                    <BlockView key={bi} block={block} theme={theme} />
                  ))}
                </View>
              ) : null}
              <Divider />
            </View>
          );
        })}

        {/* Key takeaways */}
        {lesson.keyTakeaways.length > 0 ? (
          <View style={{ padding: theme.spacing[4] }}>
            <Text variant="label" tone="accent" style={{ marginBottom: theme.spacing[2] }}>KEY TAKEAWAYS</Text>
            {lesson.keyTakeaways.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: theme.spacing[2], marginBottom: theme.spacing[2] }}>
                <Text variant="bodyMd" tone="accent">✓</Text>
                <Text variant="bodyMd" tone="secondary" style={{ flex: 1 }}>{t}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Study notes */}
        {lesson.studyNotes ? (
          <View
            style={{
              marginHorizontal: theme.spacing[4],
              padding: theme.spacing[3],
              backgroundColor: theme.colors.bg.secondary,
              borderRadius: theme.radius.md,
            }}
          >
            <Text variant="labelXs" tone="tertiary" style={{ marginBottom: 4 }}>STUDY NOTES</Text>
            <Text variant="bodyMd" tone="secondary">{lesson.studyNotes}</Text>
          </View>
        ) : null}

        {/* Mark complete */}
        <View style={{ padding: theme.spacing[4] }}>
          {done ? (
            <Button variant="secondary" onPress={() => router.back()}>
              ✓ Completed — Back to phase
            </Button>
          ) : (
            <Button
              variant="primary"
              onPress={async () => {
                await markComplete(moduleId);
              }}
            >
              Mark as complete
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

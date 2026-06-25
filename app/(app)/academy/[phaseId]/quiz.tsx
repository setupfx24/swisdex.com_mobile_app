import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Text, Divider, Pressable, Button } from '@/ui';
import { useTheme } from '@/theme';
import { phases } from '@/data/academy';
import { ProfileHeader } from '../../profile';

export default function QuizScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ phaseId: string }>();
  const phaseId = Number(params.phaseId);
  const phase = phases.find((p) => p.id === phaseId);

  // answers[questionId] = selected option index
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  if (!phase) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
        <Stack.Screen options={{ title: 'Quiz' }} />
        <ProfileHeader title="Quiz" />
        <View style={{ padding: theme.spacing[4] }}>
          <Text variant="bodyMd" tone="tertiary">Quiz not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { quiz } = phase;
  const total = quiz.questions.length;
  const score = quiz.questions.reduce(
    (s, q) => (answers[q.id] === q.correct ? s + 1 : s),
    0,
  );
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined);
  const passed = total > 0 && score / total >= 0.6;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <Stack.Screen options={{ title: quiz.title }} />
      <ProfileHeader title={quiz.title} />
      <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing[12] }}>
        {/* Result banner */}
        {submitted ? (
          <View
            style={{
              margin: theme.spacing[4],
              padding: theme.spacing[4],
              borderRadius: theme.radius.md,
              backgroundColor: passed ? theme.colors.buyBg : theme.colors.sellBg,
              borderWidth: 1,
              borderColor: passed ? theme.colors.border.accent : theme.colors.sell,
            }}
          >
            <Text variant="numXl" tone={passed ? 'buy' : 'sell'}>
              {score}/{total}
            </Text>
            <Text variant="bodyMd" weight="bold">
              {passed ? 'Passed — well done!' : 'Keep studying and try again.'}
            </Text>
            <Text variant="caption" tone="secondary">
              {Math.round((score / total) * 100)}% correct · 60% needed to pass
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
            <Text variant="bodyMd" tone="secondary">
              {total} questions · select one answer each. Scored locally on your device.
            </Text>
          </View>
        )}

        <Divider />

        {/* Questions */}
        {quiz.questions.map((q, qi) => (
          <View key={q.id} style={{ paddingHorizontal: theme.spacing[4], paddingVertical: theme.spacing[3] }}>
            <Text variant="bodyMd" weight="semibold" style={{ marginBottom: theme.spacing[2] }}>
              {qi + 1}. {q.question}
            </Text>
            {q.options.map((opt, oi) => {
              const selected = answers[q.id] === oi;
              const isCorrect = oi === q.correct;
              // After submit, show right/wrong colouring.
              let borderColor = theme.colors.border.primary;
              let bg = 'transparent';
              if (submitted) {
                if (isCorrect) {
                  borderColor = theme.colors.buy;
                  bg = theme.colors.buyBg;
                } else if (selected) {
                  borderColor = theme.colors.sell;
                  bg = theme.colors.sellBg;
                }
              } else if (selected) {
                borderColor = theme.colors.border.accent;
                bg = theme.colors.bg.secondary;
              }
              return (
                <Pressable
                  key={oi}
                  disabled={submitted}
                  haptic="light"
                  onPress={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                    paddingHorizontal: theme.spacing[3],
                    paddingVertical: theme.spacing[3],
                    borderRadius: theme.radius.md,
                    borderWidth: 1,
                    borderColor,
                    backgroundColor: bg,
                    marginBottom: theme.spacing[2],
                  }}
                >
                  <View
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: theme.radius.pill,
                      borderWidth: 2,
                      borderColor: selected ? theme.colors.buy : theme.colors.border.secondary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selected ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: theme.radius.pill,
                          backgroundColor: theme.colors.buy,
                        }}
                      />
                    ) : null}
                  </View>
                  <Text variant="bodyMd" style={{ flex: 1 }}>{opt}</Text>
                  {submitted && isCorrect ? (
                    <Text variant="caption" tone="buy">✓</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Actions */}
        <View style={{ padding: theme.spacing[4], gap: theme.spacing[3] }}>
          {submitted ? (
            <>
              <Button
                variant="secondary"
                onPress={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
              >
                Retake quiz
              </Button>
              <Button variant="ghost" onPress={() => router.back()}>
                Back to phase
              </Button>
            </>
          ) : (
            <Button variant="primary" disabled={!allAnswered} onPress={() => setSubmitted(true)}>
              {allAnswered ? 'Submit answers' : 'Answer all questions'}
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

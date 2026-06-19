import { useState } from 'react';
import { Modal, View, ScrollView } from 'react-native';
import {
  Shield, Zap, ShieldCheck, Check, Coins, Clock,
  type LucideIcon,
} from 'lucide-react-native';
import { Text, Button, Pressable } from '@/ui';
import { useTheme } from '@/theme';

const ACCENT = '#55a630';

interface Screen {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  Icon: LucideIcon;
}

// 1:1 with the web trader's InsuranceOnboardingModal SCREENS array.
const SCREENS: Screen[] = [
  {
    eyebrow: 'Hook',
    title: 'What if your losses were partially protected?',
    body: 'Trade with confidence. Reduce risk on every trade.',
    cta: 'Next',
    Icon: Shield,
  },
  {
    eyebrow: 'The Problem',
    title: 'One bad trade can wipe your profits',
    body: 'Markets move fast. Losses are part of trading. Without protection, a single bad day can erase weeks of gains.',
    cta: 'Show me the solution',
    Icon: Zap,
  },
  {
    eyebrow: 'The Solution',
    title: 'Introducing Trade Protection',
    body: 'Pay a small fee. Get part of your loss back automatically when a covered trade closes in loss.',
    cta: 'How it works',
    Icon: ShieldCheck,
  },
  {
    eyebrow: 'How it works',
    title: 'Simple. Fast. Automatic.',
    body: '1. Open a trade\n2. Turn ON protection + pick a tier\n3. Pay the small fee\n4. If the trade closes in loss, the refund is credited instantly.',
    cta: 'See plans',
    Icon: Check,
  },
  {
    eyebrow: 'Plans',
    title: 'Choose your protection level',
    body: 'Basic 20% (up to $100) · Advanced 30% (up to $300) · Pro 40% (up to $600) · Elite 50% (up to $1,000). A small fee applies per trade — fee scales with risk.',
    cta: 'Continue',
    Icon: Coins,
  },
  {
    eyebrow: 'Real example',
    title: 'How it lands in practice',
    body: 'Trade size $1,000 · Loss $200 · Elite plan (50%) → $100 credited back to your wallet instantly. Cap rule: large losses are capped at the plan max.',
    cta: 'Got it',
    Icon: Coins,
  },
  {
    eyebrow: 'Rules',
    title: 'Simple rules to keep it fair',
    body: '· Trade must run at least 5 minutes\n· Activate protection before placing the trade\n· Hedging or instant open/close not eligible\n· Valid only when the trade closes in loss\n· Max 2 insured trades per day',
    cta: 'Continue',
    Icon: Clock,
  },
  {
    eyebrow: 'Ready',
    title: 'Trade smarter. Lose less.',
    body: 'Activate protection on your next trade — toggle the shield on the order ticket and pick your tier.',
    cta: 'Start trading with protection',
    Icon: ShieldCheck,
  },
];

export function InsuranceOnboardingModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const screen = SCREENS[step]!;
  const isLast = step === SCREENS.length - 1;

  const advance = () => {
    if (isLast) {
      setStep(0);
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };
  const back = () => setStep((s) => Math.max(0, s - 1));
  const skip = () => { setStep(0); onClose(); };

  const { Icon } = screen;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={skip}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing[4],
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 440,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: `${ACCENT}4D`,
            backgroundColor: theme.colors.bg.secondary,
            padding: theme.spacing[5],
          }}
        >
          {/* Progress dots */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: theme.spacing[5] }}>
            {SCREENS.map((_, i) => (
              <View
                key={i}
                style={{
                  height: 6,
                  width: i === step ? 24 : 6,
                  borderRadius: 3,
                  backgroundColor: i === step ? ACCENT : theme.colors.border.primary,
                }}
              />
            ))}
          </View>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {/* Icon */}
            <View
              style={{
                width: 64, height: 64,
                borderRadius: theme.radius.xl,
                borderWidth: 1,
                borderColor: `${ACCENT}59`,
                backgroundColor: `${ACCENT}1A`,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: theme.spacing[4],
              }}
            >
              <Icon size={30} color={ACCENT} strokeWidth={1.85} />
            </View>

            <Text variant="labelXs" tone="accent" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              {screen.eyebrow}
            </Text>
            <Text variant="h2" weight="bold" style={{ marginTop: theme.spacing[2] }}>
              {screen.title}
            </Text>
            <Text variant="bodyMd" tone="secondary" style={{ marginTop: theme.spacing[3], lineHeight: 22 }}>
              {screen.body}
            </Text>
          </ScrollView>

          {/* Actions */}
          <View style={{ marginTop: theme.spacing[5], gap: theme.spacing[3] }}>
            <Button onPress={advance} color={ACCENT}>{screen.cta}</Button>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              {step > 0 ? (
                <Pressable onPress={back} haptic="light" hitSlop={8}>
                  <Text variant="bodyMd" tone="tertiary">Back</Text>
                </Pressable>
              ) : <View />}
              {!isLast ? (
                <Pressable onPress={skip} haptic="light" hitSlop={8}>
                  <Text variant="bodyMd" tone="tertiary">Skip</Text>
                </Pressable>
              ) : <View />}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

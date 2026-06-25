import { View } from 'react-native';
import { router } from 'expo-router';
import { ShieldCheck, Clock } from 'lucide-react-native';
import { Text, Button } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';

/** True only when the user's identity verification is fully approved.
 *  Payments (deposit / withdraw / transfer) are gated on this. */
export function useKycApproved(): boolean {
  return useAuthStore((s) => s.user?.kyc_status) === 'approved';
}

/** Blocking notice shown in place of a payment form until KYC is approved.
 *  `action` is the verb used in the copy, e.g. "deposit", "withdraw funds". */
export function KycNotice({ action }: { action: string }) {
  const theme = useTheme();
  const kyc = useAuthStore((s) => s.user?.kyc_status);
  const underReview = kyc === 'submitted' || kyc === 'under_review';

  return (
    <View style={{ padding: theme.spacing[4] }}>
      <View
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border.primary,
          backgroundColor: theme.colors.bg.secondary,
          borderRadius: theme.radius.md,
          padding: theme.spacing[4],
          gap: theme.spacing[3],
          alignItems: 'center',
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.bg.chip,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {underReview ? (
            <Clock size={26} color={theme.colors.warning} strokeWidth={1.9} />
          ) : (
            <ShieldCheck size={26} color={theme.colors.buy} strokeWidth={1.9} />
          )}
        </View>

        <Text variant="bodyLg" weight="bold" align="center">
          {underReview ? 'Verification under review' : 'Verify your identity first'}
        </Text>

        <Text variant="body" tone="secondary" align="center" style={{ lineHeight: 20 }}>
          {underReview
            ? `Your KYC documents are being reviewed. You'll be able to ${action} as soon as your verification is approved.`
            : `Complete identity verification (KYC) to ${action}. It only takes a few minutes — once approved, all payment features unlock.`}
        </Text>

        {!underReview ? (
          <Button variant="buy" size="lg" onPress={() => router.push('/kyc')} style={{ alignSelf: 'stretch' }}>
            Complete verification
          </Button>
        ) : (
          <Button variant="secondary" size="lg" onPress={() => router.push('/kyc')} style={{ alignSelf: 'stretch' }}>
            View verification status
          </Button>
        )}
      </View>
    </View>
  );
}

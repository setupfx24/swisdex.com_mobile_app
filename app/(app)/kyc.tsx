import { useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Text, Field, Button, Pressable, Divider } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { profileApi, type KycSubmitPayload } from '@/lib/api/profile';
import { ProfileHeader } from './profile';

type DocType = KycSubmitPayload['document_type'];
const DOC_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'drivers_license', label: 'Driver’s license' },
  { value: 'utility_bill', label: 'Utility bill' },
  { value: 'bank_statement', label: 'Bank statement' },
];

export default function KycScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [docType, setDocType] = useState<DocType>('passport');
  const [file, setFile] = useState<KycSubmitPayload['file'] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pickImage = async () => {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError('Photo library permission denied.');
    const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setFile({
      uri: a.uri,
      name: a.fileName ?? `${docType}.jpg`,
      mimeType: a.mimeType ?? 'image/jpeg',
    });
  };

  const pickDoc = async () => {
    setError(null);
    const r = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (r.canceled || !r.assets[0]) return;
    const a = r.assets[0];
    setFile({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? 'application/octet-stream' });
  };

  const onSubmit = async () => {
    setError(null);
    if (!file) return setError('Pick a document first.');
    setSubmitting(true);
    try {
      await profileApi.submitKyc({ document_type: docType, file });
      await refreshMe();
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const status = user?.kyc_status ?? 'pending';
  const locked = status === 'submitted' || status === 'under_review' || status === 'approved';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <Stack.Screen options={{ title: 'KYC' }} />
      <ProfileHeader title="KYC verification" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[4],
            paddingTop: theme.spacing[2],
            paddingBottom: theme.spacing[8],
            gap: theme.spacing[4],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              padding: theme.spacing[3],
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.bg.secondary,
              borderWidth: 1,
              borderColor: theme.colors.border.primary,
            }}
          >
            <Text variant="label" tone="tertiary">Status</Text>
            <View style={{ height: theme.spacing[1] }} />
            <Text variant="bodyMd" weight="medium" tone={status === 'approved' ? 'buy' : status === 'rejected' ? 'sell' : 'primary'}>
              {status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          {locked ? (
            <Text variant="bodyMd" tone="secondary">
              {status === 'approved'
                ? 'Your identity is verified. You can deposit and trade.'
                : 'Documents submitted. Review typically takes 1–3 business days.'}
            </Text>
          ) : (
            <>
              <View>
                <Text variant="label" tone="secondary">Document type</Text>
                <View style={{ height: theme.spacing[1] }} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
                  {DOC_OPTIONS.map((opt) => {
                    const selected = opt.value === docType;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setDocType(opt.value)}
                        style={({ pressed }) => ({
                          paddingVertical: theme.spacing[2],
                          paddingHorizontal: theme.spacing[3],
                          borderRadius: theme.radius.lg,
                          backgroundColor: selected
                            ? theme.colors.buyBg
                            : pressed
                              ? theme.colors.bg.hover
                              : theme.colors.bg.secondary,
                          borderWidth: 1,
                          borderColor: selected ? theme.colors.buy : theme.colors.border.primary,
                        })}
                      >
                        <Text variant="body" tone={selected ? 'buy' : 'primary'} weight={selected ? 'bold' : 'medium'}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Divider />

              <View>
                <Text variant="label" tone="secondary">Document image / PDF</Text>
                <View style={{ height: theme.spacing[2] }} />
                {file ? (
                  <View
                    style={{
                      padding: theme.spacing[3],
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.bg.secondary,
                      borderWidth: 1,
                      borderColor: theme.colors.border.primary,
                    }}
                  >
                    <Text variant="bodyMd" weight="medium" numberOfLines={1}>{file.name}</Text>
                    <Text variant="body" tone="tertiary">{file.mimeType}</Text>
                  </View>
                ) : (
                  <Text variant="body" tone="tertiary">No file selected.</Text>
                )}
                <View style={{ height: theme.spacing[3] }} />
                <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Button variant="secondary" onPress={pickImage} disabled={submitting}>From photos</Button>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button variant="secondary" onPress={pickDoc} disabled={submitting}>From files</Button>
                  </View>
                </View>
              </View>

              {error ? <Text variant="body" tone="sell">{error}</Text> : null}
              {done ? <Text variant="body" tone="buy">Submitted. We’ll email you when review completes.</Text> : null}

              <Button onPress={onSubmit} loading={submitting} size="lg">Submit document</Button>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

import { useEffect, useState } from 'react';
import { Modal, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Field, Button } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';

/** Blocks the app until the user has filled in the fields required to
 *  trade / deposit (first/last name, phone, country, DOB). Mirrors the web
 *  trader's ProfileCompleteGate. Backend derives `profile_complete` on
 *  /auth/me so we only need to listen to that flag. */
export function ProfileCompleteGate() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const needs = !!user && !user.profile_complete;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD for now; date-picker in a later phase
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName((p) => p || user.first_name || '');
    setLastName((p) => p || user.last_name || '');
    setPhone((p) => p || user.phone || '');
    setCountry((p) => p || user.country || '');
    setDob((p) => p || (user.date_of_birth ? user.date_of_birth.slice(0, 10) : ''));
  }, [user]);

  const onSubmit = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !country.trim() || !dob.trim()) {
      setError('All fields are required to start trading.');
      return;
    }
    setSubmitting(true);
    try {
      await api.put('/profile', {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        country: country.trim().toUpperCase(),
        date_of_birth: dob.trim(),
      });
      await refreshMe();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={needs} animationType="slide" transparent={false} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: theme.colors.bg.base }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: theme.spacing[5],
              paddingTop: theme.spacing[12],
              paddingBottom: theme.spacing[8],
              gap: theme.spacing[4],
            }}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <Text variant="h1">Finish your profile</Text>
              <View style={{ height: theme.spacing[1] }} />
              <Text variant="bodyMd" tone="secondary">
                A few details are required before you can deposit and trade.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <Field label="First name" value={firstName} onChangeText={setFirstName} editable={!submitting} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Last name" value={lastName} onChangeText={setLastName} editable={!submitting} />
              </View>
            </View>

            <Field
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!submitting}
            />

            <Field
              label="Country"
              hint="ISO-2 country code (e.g. IN, US, AE)."
              value={country}
              onChangeText={setCountry}
              autoCapitalize="characters"
              maxLength={2}
              editable={!submitting}
            />

            <Field
              label="Date of birth"
              hint="YYYY-MM-DD"
              value={dob}
              onChangeText={setDob}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              editable={!submitting}
            />

            {error ? <Text variant="body" tone="sell">{error}</Text> : null}

            <Button onPress={onSubmit} loading={submitting} size="lg">
              Save and continue
            </Button>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

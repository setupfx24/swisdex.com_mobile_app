import { useEffect, useState } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Text, Field, Button, Pressable } from '@/ui';
import { useTheme } from '@/theme';
import { useAuthStore } from '@/stores/authStore';
import { profileApi } from '@/lib/api/profile';

export default function ProfileScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postal, setPostal] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name ?? '');
    setLastName(user.last_name ?? '');
    setPhone(user.phone ?? '');
    setCountry(user.country ?? '');
    setDob(user.date_of_birth ? user.date_of_birth.slice(0, 10) : '');
    setAddress(user.address ?? '');
    setCity(user.city ?? '');
    setPostal(user.postal_code ?? '');
  }, [user]);

  const onSave = async () => {
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await profileApi.update({
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        phone: phone.trim() || undefined,
        country: country.trim().toUpperCase() || undefined,
        date_of_birth: dob.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        postal_code: postal.trim() || undefined,
      });
      await refreshMe();
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg.base }} edges={['top']}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ProfileHeader title="Profile" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing[4],
            paddingTop: theme.spacing[2],
            paddingBottom: theme.spacing[8],
            gap: theme.spacing[3],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Field label="First name" value={firstName} onChangeText={setFirstName} editable={!submitting} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Last name" value={lastName} onChangeText={setLastName} editable={!submitting} />
            </View>
          </View>
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" editable={!submitting} />
          <Field label="Country (ISO-2)" value={country} onChangeText={setCountry} autoCapitalize="characters" maxLength={2} editable={!submitting} />
          <Field label="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} keyboardType="numbers-and-punctuation" maxLength={10} editable={!submitting} />
          <Field label="Address" value={address} onChangeText={setAddress} editable={!submitting} />
          <View style={{ flexDirection: 'row', gap: theme.spacing[3] }}>
            <View style={{ flex: 2 }}>
              <Field label="City" value={city} onChangeText={setCity} editable={!submitting} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Postal" value={postal} onChangeText={setPostal} editable={!submitting} />
            </View>
          </View>

          {error ? <Text variant="body" tone="sell">{error}</Text> : null}
          {saved ? <Text variant="body" tone="buy">Saved.</Text> : null}

          <Button onPress={onSave} loading={submitting} size="lg">Save</Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function ProfileHeader({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing[2],
        paddingTop: theme.spacing[2],
        paddingBottom: theme.spacing[2],
        gap: theme.spacing[2],
      }}
    >
      <Pressable
        onPress={() => router.back()}
        haptic="light"
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: theme.radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? theme.colors.bg.hover : 'transparent',
        })}
      >
        <ChevronLeft size={22} color={theme.colors.text.primary} />
      </Pressable>
      <Text variant="h2">{title}</Text>
    </View>
  );
}

import { forwardRef } from 'react';
import { View, type TextInput as RNTextInput } from 'react-native';
import { Text } from './Text';
import { TextInput, type TextInputProps } from './TextInput';
import { useTheme } from '@/theme';

interface FieldProps extends Omit<TextInputProps, 'invalid'> {
  label?: string;
  hint?: string;
  error?: string | null;
}

/** Form field wrapper: label + input + error message. Spacing is tighter
 *  than typical Material-style fields — trading-app forms read as dense
 *  lists, not generous greeting-card layouts. */
export const Field = forwardRef<RNTextInput, FieldProps>(function Field(
  { label, hint, error, ...inputProps },
  ref,
) {
  const theme = useTheme();
  return (
    <View>
      {label ? (
        <>
          <Text variant="label" tone="secondary">{label}</Text>
          <View style={{ height: theme.spacing[1] }} />
        </>
      ) : null}
      <TextInput ref={ref} invalid={!!error} {...inputProps} />
      {error ? (
        <>
          <View style={{ height: theme.spacing[1] }} />
          <Text variant="body" tone="sell">{error}</Text>
        </>
      ) : hint ? (
        <>
          <View style={{ height: theme.spacing[1] }} />
          <Text variant="body" tone="tertiary">{hint}</Text>
        </>
      ) : null}
    </View>
  );
});

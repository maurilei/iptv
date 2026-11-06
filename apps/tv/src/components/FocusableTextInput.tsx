import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  TextInputProps,
} from 'react-native';

interface FocusableTextInputProps extends TextInputProps {
  label?: string;
  hasTVPreferredFocus?: boolean;
}

export const FocusableTextInput: React.FC<FocusableTextInputProps> = ({
  label,
  hasTVPreferredFocus = false,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {label ? (
        <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>
      ) : null}
      <Pressable
        focusable={true}
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onPress={handlePress}
        style={({ pressed }) => [
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          pressed && styles.inputWrapperPressed,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#64748b"
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize || 'none'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isFocused && (
          <View style={styles.tipBadge}>
            <Text style={styles.tipText}>[OK para digitar]</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  labelFocused: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 2,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inputWrapperFocused: {
    borderColor: '#38bdf8',
    backgroundColor: '#0c1a2e',
    transform: [{ scale: 1.02 }],
    elevation: 6,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  inputWrapperPressed: {
    opacity: 0.9,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    padding: 0,
  },
  tipBadge: {
    backgroundColor: '#0369a1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  tipText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
});


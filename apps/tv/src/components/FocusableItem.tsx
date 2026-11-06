import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
} from 'react-native';

interface FocusableItemProps {
  children: React.ReactNode | ((focused: boolean) => React.ReactNode);
  onPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  hasTVPreferredFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export const FocusableItem: React.FC<FocusableItemProps> = ({
  children,
  onPress,
  onFocus,
  onBlur,
  hasTVPreferredFocus = false,
  style,
  focusedStyle,
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Pressable
      testID={testID}
      hasTVPreferredFocus={hasTVPreferredFocus}
      focusable={true}
      onFocus={() => {
        setIsFocused(true);
        onFocus?.();
      }}
      onBlur={() => {
        setIsFocused(false);
        onBlur?.();
      }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        style,
        isFocused && [styles.focused, focusedStyle],
        pressed && styles.pressed,
      ]}
    >
      {typeof children === 'function' ? children(isFocused) : children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  focused: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    transform: [{ scale: 1.03 }],
    elevation: 8,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});


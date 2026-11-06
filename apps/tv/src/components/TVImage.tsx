import React, { useState } from 'react';
import { Image, View, StyleSheet, Text, StyleProp, ViewStyle, ImageStyle } from 'react-native';

interface TVImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  fallbackText?: string;
}

export const TVImage: React.FC<TVImageProps> = ({
  uri,
  style,
  containerStyle,
  fallbackText = '📺',
}) => {
  const [hasError, setHasError] = useState(false);

  if (!uri || hasError) {
    return (
      <View style={[styles.fallbackContainer, containerStyle]}>
        <Text style={styles.fallbackText}>{fallbackText.slice(0, 3)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.imageContainer, containerStyle]}>
      <Image
        source={{ uri }}
        style={[styles.image, style]}
        resizeMode="contain"
        onError={() => setHasError(true)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    backgroundColor: '#0a0f1d',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    backgroundColor: '#131b2e',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  fallbackText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '700',
  },
});

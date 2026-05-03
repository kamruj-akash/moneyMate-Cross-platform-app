import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../constants/theme';

const GradientBackground = ({ children, style }) => {
  return (
    <View style={[{ flex: 1, backgroundColor: COLORS.bg }, style]}>
      <LinearGradient
        colors={GRADIENTS.bgGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={[StyleSheet.absoluteFill, { height: 380 }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
};

export default GradientBackground;

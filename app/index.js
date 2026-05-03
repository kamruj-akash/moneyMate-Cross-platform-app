import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

export default function AuthGate() {
  const { bootstrapping, isAuthenticated, isOfflineMode } = useAuth();

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (isAuthenticated || isOfflineMode) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)/welcome" />;
}

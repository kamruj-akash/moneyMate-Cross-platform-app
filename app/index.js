import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';

// Hard ceiling on how long we'll show the boot spinner. Pairs with the
// timeout inside AuthContext — if everything goes well, bootstrapping flips
// to false in well under a second. This is the last-resort escape hatch so a
// post-storage-clear edge case can never strand the user on a spinner.
const BOOT_FALLBACK_MS = 6000;

export default function AuthGate() {
  const { bootstrapping, isAuthenticated, isOfflineMode } = useAuth();
  const [forceProceed, setForceProceed] = useState(false);

  useEffect(() => {
    if (!bootstrapping) return;
    const t = setTimeout(() => setForceProceed(true), BOOT_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [bootstrapping]);

  if (bootstrapping && !forceProceed) {
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

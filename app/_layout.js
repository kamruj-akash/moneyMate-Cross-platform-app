import React, { useCallback, useEffect, useState } from 'react';
import { View, StatusBar, ActivityIndicator } from 'react-native';
import { Stack, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import { useFonts } from 'expo-font';

import { COLORS } from '../constants/theme';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { ToastProvider } from '../components/ui/Toast';
import { ensureFirstLaunchPermission } from '../lib/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Load only the 4 weights we use (instead of all 18 from @expo-google-fonts/inter).
  // Each require() pulls a single .ttf into the bundle, saving ~4-5 MB in the APK.
  const [fontsLoaded] = useFonts({
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(COLORS.bg).catch(() => {});
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      setReady(true);
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  // Ask for notification permission once on first launch. Slight delay so
  // the welcome / dashboard screen renders first — the system dialog then
  // appears on top, which feels less abrupt than firing during the splash.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      ensureFirstLaunchPermission().catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [ready]);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} translucent={false} />
        <AuthProvider>
          <DataProvider>
            <ToastProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: COLORS.bg },
                  animation: 'fade',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="add-transaction"
                  options={{
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                    animationDuration: 280,
                    gestureEnabled: true,
                  }}
                />
                <Stack.Screen name="transaction/[id]" options={{ animation: 'slide_from_right' }} />
              </Stack>
            </ToastProvider>
          </DataProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

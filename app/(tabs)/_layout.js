import React from 'react';
import { View, Pressable, StyleSheet, Text, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, FONT, GRADIENTS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { hMedium, hSelection } from '../../utils/haptics';

const TAB_DEFS = [
  { name: 'index', label: 'Home', icon: 'home', iconOutline: 'home-outline' },
  { name: 'history', label: 'History', icon: 'list', iconOutline: 'list-outline' },
  { name: 'add', label: 'Add', special: true },
  { name: 'analytics', label: 'Stats', icon: 'pie-chart', iconOutline: 'pie-chart-outline' },
  { name: 'settings', label: 'Settings', icon: 'settings', iconOutline: 'settings-outline' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneContainerStyle: { backgroundColor: COLORS.bg },
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="categories" options={{ href: null }} />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}

function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: Math.max(insets.bottom, 12) },
      ]}
    >
      <View style={[styles.bar, SHADOWS.card]}>
        {TAB_DEFS.map((def, i) => {
          if (def.special) {
            return <FabButton key="add" onPress={() => { hMedium(); router.push('/add-transaction'); }} />;
          }
          const tabIndex = state.routes.findIndex((r) => r.name === def.name);
          const focused = state.index === tabIndex;
          return (
            <TabButton
              key={def.name}
              focused={focused}
              icon={focused ? def.icon : def.iconOutline}
              label={def.label}
              onPress={() => {
                hSelection();
                if (tabIndex >= 0) {
                  const route = state.routes[tabIndex];
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({ focused, icon, label, onPress }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ flex: 1 }, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.92, { damping: 14, stiffness: 240 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 240 }); }}
        onPress={onPress}
        style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}
      >
        <Ionicons name={icon} size={22} color={focused ? COLORS.primary : COLORS.textMuted} />
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: focused ? COLORS.primary : 'transparent',
            marginTop: 6,
            shadowColor: COLORS.primary,
            shadowOpacity: focused ? 0.7 : 0,
            shadowRadius: 4,
          }}
        />
      </Pressable>
    </Animated.View>
  );
}

function FabButton({ onPress }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateY: -22 }] }));
  return (
    <Animated.View style={[{ flex: 1, alignItems: 'center' }, animStyle]}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.92, { damping: 12, stiffness: 220 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 220 }); }}
        onPress={onPress}
        style={[styles.fabShadow, SHADOWS.glow]}
      >
        <LinearGradient
          colors={GRADIENTS.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fab}
        >
          <Ionicons name="add" size={32} color={COLORS.white} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
  fabShadow: {
    borderRadius: RADIUS.full,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

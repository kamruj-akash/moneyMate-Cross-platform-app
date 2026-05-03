import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING } from '../constants/theme';
import { useData } from '../context/DataContext';

const SyncIndicator = ({ compact = false }) => {
  const { syncStatus } = useData();
  const { phase, queue, online } = syncStatus;

  let label = 'Synced';
  let color = COLORS.success;
  let icon = 'checkmark-circle';

  if (!online) {
    label = 'Offline';
    color = COLORS.warning;
    icon = 'cloud-offline';
  } else if (phase === 'syncing') {
    label = 'Syncing';
    color = COLORS.primary;
    icon = null;
  } else if (queue > 0) {
    label = `${queue} pending`;
    color = COLORS.warning;
    icon = 'time';
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.full,
        paddingHorizontal: SPACING.md,
        paddingVertical: 6,
      }}
    >
      {icon ? (
        <Ionicons name={icon} size={12} color={color} style={{ marginRight: 6 }} />
      ) : (
        <ActivityIndicator size="small" color={color} style={{ marginRight: 6, transform: [{ scale: 0.7 }] }} />
      )}
      {!compact ? (
        <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.medium, fontSize: 11 }}>{label}</Text>
      ) : null}
    </View>
  );
};

export default SyncIndicator;

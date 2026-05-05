import React from 'react';
import { Modal, View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, TEXT_STYLES } from '../constants/theme';
import Button from './ui/Button';

// Modal shown when a newer version is published in app_versions. Mandatory
// flag hides the dismiss path so the user has to update before continuing.
const UpdateModal = ({
  visible,
  current,
  latest,
  releaseNotes,
  mandatory,
  downloading,
  onUpdate,
  onClose,
}) => {
  const dismissable = !mandatory && !downloading;

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={dismissable ? onClose : undefined}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} />
        <Animated.View entering={ZoomIn.duration(220)} style={[styles.card, SHADOWS.card]}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-download-outline" size={28} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Update available</Text>
          <Text style={styles.subtitle}>
            {mandatory ? 'This update is required to keep using MoneyMate.' : 'A new version of MoneyMate is ready to install.'}
          </Text>

          <View style={styles.versionRow}>
            <View style={styles.versionCell}>
              <Text style={styles.versionLabel}>Current</Text>
              <Text style={styles.versionValue}>{current || '—'}</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={COLORS.textMuted} style={{ marginHorizontal: SPACING.md }} />
            <View style={[styles.versionCell, styles.versionLatest]}>
              <Text style={[styles.versionLabel, { color: COLORS.primary }]}>Latest</Text>
              <Text style={[styles.versionValue, { color: COLORS.primary }]}>{latest || '—'}</Text>
            </View>
          </View>

          {releaseNotes ? (
            <View style={styles.notesWrap}>
              <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.sm }]}>What's new</Text>
              <ScrollView style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
                <Text style={styles.notes}>{releaseNotes}</Text>
              </ScrollView>
            </View>
          ) : null}

          <Button
            title={downloading ? 'Opening download…' : 'Update now'}
            onPress={onUpdate}
            loading={downloading}
            disabled={downloading}
            style={{ marginTop: SPACING.md }}
          />

          {dismissable ? (
            <Pressable onPress={onClose} hitSlop={10} style={styles.laterBtn}>
              <Text style={styles.laterText}>Later</Text>
            </Pressable>
          ) : null}

          {downloading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md }}>
              <ActivityIndicator color={COLORS.textMuted} size="small" />
              <Text style={{ color: COLORS.textMuted, fontFamily: FONT.regular, fontSize: 12, marginLeft: SPACING.sm }}>
                Your browser will download the APK
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.66)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(127,90,240,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(127,90,240,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONT.semibold,
    fontSize: 22,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: SPACING.xl,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  versionCell: {
    flex: 1,
    alignItems: 'center',
  },
  versionLatest: {
    // visual delta to highlight the target version
  },
  versionLabel: {
    color: COLORS.textMuted,
    fontFamily: FONT.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  versionValue: {
    color: COLORS.textPrimary,
    fontFamily: FONT.semibold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  notesWrap: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  notes: {
    color: COLORS.textPrimary,
    fontFamily: FONT.regular,
    fontSize: 13,
    lineHeight: 20,
  },
  laterBtn: {
    alignSelf: 'center',
    paddingVertical: SPACING.md,
    marginTop: 4,
  },
  laterText: {
    color: COLORS.textSecondary,
    fontFamily: FONT.medium,
    fontSize: 14,
  },
});

export default UpdateModal;

import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import SegmentedControl from '../../components/ui/SegmentedControl';
import CategoryEditor from '../../components/categories/CategoryEditor';
import { useData } from '../../context/DataContext';

export default function Categories() {
  const router = useRouter();
  const { categories, transactions, addCategory, updateCategory, deleteCategory } = useData();
  const [type, setType] = useState('expense');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const list = useMemo(() => categories.filter((c) => c.type === type), [categories, type]);

  const txCount = (cId) => transactions.filter((t) => t.category_id === cId).length;

  const onSave = async (data) => {
    if (editing) {
      await updateCategory(editing.id, data);
    } else {
      await addCategory(data);
    }
  };

  const onDelete = async (id) => {
    await deleteCategory(id);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
              <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
            </Pressable>
            <Text style={[TEXT_STYLES.h1, { marginLeft: SPACING.md }]}>Categories</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: SPACING.xl, marginBottom: SPACING.lg }}>
          <SegmentedControl
            options={[
              { value: 'expense', label: 'Expense' },
              { value: 'income', label: 'Income' },
            ]}
            value={type}
            onChange={setType}
          />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {list.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => { setEditing(c); setEditorOpen(true); }}
                style={styles.cell}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${c.color}25` }]}>
                  <Ionicons name={c.icon} size={22} color={c.color} />
                </View>
                <Text style={styles.cellName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.cellSub}>{txCount(c.id)} {txCount(c.id) === 1 ? 'tx' : 'txs'}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => { setEditing(null); setEditorOpen(true); }}
              style={[styles.cell, styles.addCell]}
            >
              <View style={[styles.iconCircle, { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong, borderStyle: 'dashed' }]}>
                <Ionicons name="add" size={22} color={COLORS.textSecondary} />
              </View>
              <Text style={[styles.cellName, { color: COLORS.textSecondary }]}>Add new</Text>
            </Pressable>
          </View>
        </ScrollView>

        <CategoryEditor
          visible={editorOpen}
          onClose={() => setEditorOpen(false)}
          initial={editing}
          onSave={onSave}
          onDelete={onDelete}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  back: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  cell: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: 'flex-start',
    minHeight: 110,
  },
  addCell: {
    borderStyle: 'dashed',
    borderColor: COLORS.borderStrong,
    backgroundColor: 'transparent',
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  cellName: {
    color: COLORS.textPrimary,
    fontFamily: FONT.medium,
    fontSize: 15,
  },
  cellSub: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 12,
    marginTop: 2,
  },
});

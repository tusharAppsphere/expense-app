// src/screens/TransactionDetailScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, RADIUS, SHADOW, CATEGORY_COLORS } from '../constants/theme';
import { CategoryIcon, Button } from '../components/UI';
import { transactionAPI } from '../api';
import { format, parseISO } from 'date-fns';

export default function TransactionDetailScreen({ navigation, route }) {
  const { transaction } = route.params;
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const confirmDelete = async () => {
    setShowConfirmDelete(false);
    setDeleting(true);
    try {
      await transactionAPI.delete(transaction.id);
      navigation.goBack();
    } catch {
      setDeleting(false);
    }
  };

  const formattedDate = transaction.date
    ? format(parseISO(transaction.date), 'EEEE, d MMMM yyyy')
    : '';

  const isIncome = transaction.type === 'income';
  const accentColor = transaction.category_color
    || CATEGORY_COLORS[transaction.category_name]
    || (isIncome ? COLORS.success : COLORS.primary);
  const amountColor = isIncome ? COLORS.success : COLORS.danger;

  return (
    <View style={styles.container}>
      {/* ── Gradient Hero Header ── */}
      <LinearGradient
        colors={[accentColor + 'EE', accentColor + '99', COLORS.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.heroGradient}
      >
        {/* Nav row */}
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn} hitSlop={10}>
            <Ionicons name="arrow-back" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Transaction</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddExpense', { transaction })}
            style={styles.navBtn}
            hitSlop={10}
          >
            <Ionicons name="pencil" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Hero content */}
        <View style={styles.hero}>
          <View style={styles.iconRing}>
            <CategoryIcon
              category={transaction.category_name}
              icon={transaction.category_icon}
              color={transaction.category_color}
              size={52}
            />
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>{transaction.title}</Text>
          <Text style={styles.heroCategory}>{transaction.category_name}</Text>
          <Text style={[styles.heroAmount, { color: amountColor }]}>
            {isIncome ? '+' : '-'}₹{parseFloat(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
          {/* Type badge */}
          <View style={[styles.typeBadge, { backgroundColor: amountColor + '22' }]}>
            <Text style={[styles.typeBadgeText, { color: amountColor }]}>
              {isIncome ? '↓ Income' : '↑ Expense'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Details card */}
        <View style={styles.card}>
          <DetailRow
            icon="calendar-outline"
            label="Date"
            value={formattedDate}
            accent={accentColor}
          />
          <DetailRow
            icon="wallet-outline"
            label="Account"
            value={transaction.account_name || 'N/A'}
            accent={accentColor}
          />
          <DetailRow
            icon={
              transaction.payment_method_type === 'upi' ? 'qr-code-outline' :
              transaction.payment_method_type === 'card' ? 'card-outline' : 'cash-outline'
            }
            label="Payment Method"
            value={transaction.payment_method_label || transaction.payment_method_type || 'Cash'}
            accent={accentColor}
          />
          <DetailRow
            icon="business-outline"
            label="Workspace"
            value={transaction.workspace_name || 'Personal'}
            accent={accentColor}
          />
          {transaction.description ? (
            <DetailRow
              icon="document-text-outline"
              label="Notes"
              value={transaction.description}
              accent={accentColor}
              last
            />
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Edit"
            variant="secondary"
            icon="pencil-outline"
            onPress={() => navigation.navigate('AddExpense', { transaction })}
            style={{ flex: 1 }}
          />
          <Button
            title="Delete"
            variant="danger"
            icon="trash-outline"
            onPress={() => setShowConfirmDelete(true)}
            loading={deleting}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>

      {/* Delete Confirmation */}
      <Modal
        visible={showConfirmDelete}
        animationType="fade"
        transparent
        onRequestClose={() => setShowConfirmDelete(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.alertModal}>
            <View style={styles.alertIconWrap}>
              <Ionicons name="trash-outline" size={28} color={COLORS.danger} />
            </View>
            <Text style={styles.alertTitle}>Delete Transaction</Text>
            <Text style={styles.alertMessage}>
              Are you sure you want to delete{'\n'}
              <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{transaction.title}</Text>?
            </Text>
            <View style={styles.alertActions}>
              <Button title="Cancel" variant="secondary" onPress={() => setShowConfirmDelete(false)} style={{ flex: 1 }} />
              <Button title="Delete" variant="danger"    onPress={confirmDelete}                    style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ icon, label, value, accent, last }) {
  return (
    <View style={[drStyles.row, last && { borderBottomWidth: 0 }]}>
      <View style={[drStyles.iconWrap, { backgroundColor: (accent || COLORS.primary) + '18' }]}>
        <Ionicons name={icon} size={17} color={accent || COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={drStyles.label}>{label}</Text>
        <Text style={drStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const drStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 14,
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: SIZES.xs, color: COLORS.textSecondary,
    fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 2,
  },
  value: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  heroGradient: {
    paddingTop: Platform.OS === 'ios' ? 58 : 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },

  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  navTitle: {
    fontSize: SIZES.base, fontWeight: '700',
    color: COLORS.white,
  },

  hero: { alignItems: 'center', gap: 6 },
  iconRing: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTitle: {
    fontSize: SIZES.xl, fontWeight: '800',
    color: COLORS.white, textAlign: 'center',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroCategory: {
    fontSize: SIZES.sm, color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  heroAmount: {
    fontSize: 42, fontWeight: '900',
    letterSpacing: -1, marginTop: 4,
  },
  typeBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 5,
    marginTop: 4,
  },
  typeBadgeText: { fontSize: SIZES.sm, fontWeight: '700' },

  content: { padding: 16, paddingBottom: 48 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 20,
    ...SHADOW.sm,
  },
  actions: { flexDirection: 'row', gap: 12 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  alertModal: {
    width: '85%', maxWidth: 360,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 24,
    ...SHADOW.lg,
    alignItems: 'center',
  },
  alertIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FFF0F0',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  alertTitle: { fontSize: SIZES.lg, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  alertMessage: { fontSize: SIZES.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  alertActions: { flexDirection: 'row', gap: 12, width: '100%' },
});

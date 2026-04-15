// src/components/BalanceCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS } from '../constants/theme';
import { WorkspaceBadge } from './UI';
import { format } from 'date-fns';

export default function BalanceCard({ balance, date, workspace, onWorkspacePress, onCalendarPress, showStats, statsLabel, onViewStats }) {
  const numBalance = parseFloat(balance || 0);
  const isNegative = numBalance < 0;
  const formattedBalance = Math.abs(numBalance).toLocaleString('en-US', { minimumFractionDigits: 2 });
  const [whole, decimal] = formattedBalance.split('.');
  const displayDate = date ? format(new Date(date), 'd MMMM yyyy') : format(new Date(), 'd MMMM yyyy');

  return (
    <LinearGradient
      colors={['#5B6EFF', '#4B5EFC', '#3A4EE8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Decorative yellow blob */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Top row */}
      <View style={styles.topRow}>
        <WorkspaceBadge name={workspace?.name || 'My Workspace'} onPress={onWorkspacePress} />
        <TouchableOpacity onPress={onCalendarPress} hitSlop={10}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <View style={styles.balanceSection}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <View style={styles.balanceRow}>
          <Text style={styles.dollarSign}>{isNegative ? '-₹' : '₹'}</Text>
          <Text style={styles.balanceWhole}>{whole}</Text>
          <Text style={styles.balanceDec}>.{decimal}</Text>
        </View>
        <Text style={styles.balanceDate}>{displayDate}</Text>
      </View>

      {/* Mini stats area for Expense screen */}
      {showStats && (
        <View style={styles.statsArea}>
          <View style={styles.statsChart}>
            {/* Simplified line chart visual */}
            <Text style={styles.statsLabel}>{statsLabel || 'Statistics'}</Text>
          </View>
          <TouchableOpacity onPress={onViewStats} style={styles.viewStatsBtn}>
            <Text style={styles.viewStatsText}>View Statistics </Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    padding: 20,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  blob1: {
    position: 'absolute', top: -30, right: -20,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: '#F5E642', opacity: 0.9,
  },
  blob2: {
    position: 'absolute', top: 30, right: 40,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#3A4EE8', opacity: 0.6,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  balanceSection: { alignItems: 'center', paddingVertical: 8 },
  balanceLabel: { fontSize: SIZES.md, color: 'rgba(255,255,255,0.8)', fontWeight: '500', marginBottom: 6 },
  balanceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 0 },
  dollarSign: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  balanceWhole: { fontSize: 52, fontWeight: '800', color: COLORS.white, letterSpacing: -1 },
  balanceDec: { fontSize: SIZES.xxl, fontWeight: '700', color: COLORS.white, marginBottom: 8 },
  balanceDate: { fontSize: SIZES.sm, color: 'rgba(255,255,255,0.75)', marginTop: 8, fontWeight: '500' },
  statsArea: { marginTop: 16 },
  statsChart: {
    height: 60, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 8, padding: 12,
    justifyContent: 'flex-end',
  },
  statsLabel: { color: 'rgba(255,255,255,0.6)', fontSize: SIZES.xs },
  viewStatsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  viewStatsText: { color: COLORS.white, fontSize: SIZES.sm, fontWeight: '600' },
});

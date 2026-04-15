// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW } from '../constants/theme';
import BalanceCard from '../components/BalanceCard';
import { TransactionRow, DateSectionHeader, EmptyState, BottomSheet, SelectItem } from '../components/UI';
import { transactionAPI, statisticsAPI } from '../api';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation }) {
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ balance: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = activeWorkspace ? { workspace: activeWorkspace.id } : {};
      const [txRes, sumRes] = await Promise.all([
        transactionAPI.list({ ...params, limit: 10, ordering: '-date' }),
        statisticsAPI.summary(params),
      ]);
      setTransactions(txRes.data.results || txRes.data);
      setSummary(sumRes.data);
    } catch (err) {
      console.log('Fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeWorkspace]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Group transactions by date
  const grouped = transactions.reduce((acc, tx) => {
    const key = tx.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const firstName = user?.first_name || 'there';

  // Quick stats for the summary row
  const totalIncome   = parseFloat(summary.total_income   || 0);
  const totalExpenses = parseFloat(summary.total_expenses || 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting Header ── */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.greetingName}>{firstName} 👋</Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Statistics')}
            activeOpacity={0.75}
          >
            <Ionicons name="stats-chart-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <BalanceCard
          balance={summary.total_balance ?? summary.balance ?? 0}
          date={new Date()}
          workspace={activeWorkspace}
          onWorkspacePress={() => setShowWorkspacePicker(true)}
          onCalendarPress={() => navigation.navigate('Statistics')}
        />

        {/* ── Quick Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: COLORS.success }]}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.success + '18' }]}>
              <Ionicons name="arrow-down-circle-outline" size={18} color={COLORS.success} />
            </View>
            <View>
              <Text style={styles.statLabel}>Income</Text>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                ₹{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={[styles.statCard, { borderLeftColor: COLORS.danger }]}>
            <View style={[styles.statIconWrap, { backgroundColor: COLORS.danger + '18' }]}>
              <Ionicons name="arrow-up-circle-outline" size={18} color={COLORS.danger} />
            </View>
            <View>
              <Text style={styles.statLabel}>Expenses</Text>
              <Text style={[styles.statValue, { color: COLORS.danger }]}>
                ₹{totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Transactions Header ── */}
        <View style={styles.txHeader}>
          <Text style={styles.txTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Expense')} style={styles.seeAllBtn}>
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="arrow-forward" size={13} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Transactions List ── */}
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : Object.keys(grouped).length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            message="No expenses yet"
            sub="Tap the + button to add your first expense"
          />
        ) : (
          <View style={styles.txCard}>
            {Object.entries(grouped).map(([date, items], groupIdx) => (
              <View key={date}>
                <DateSectionHeader date={date} />
                {items.map((tx, itemIdx) => (
                  <View key={tx.id}>
                    <TransactionRow
                      item={tx}
                      onPress={() => navigation.navigate('TransactionDetail', { transaction: tx })}
                    />
                    {/* Divider except last item in last group */}
                    {!(groupIdx === Object.keys(grouped).length - 1 && itemIdx === items.length - 1) && (
                      <View style={styles.divider} />
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Workspace Picker */}
      <BottomSheet
        visible={showWorkspacePicker}
        onClose={() => setShowWorkspacePicker(false)}
        title="Filter by workspace"
      >
        <ScrollView>
          {workspaces.map((ws) => (
            <SelectItem
              key={ws.id}
              label={ws.name}
              selected={activeWorkspace?.id === ws.id}
              onPress={() => { switchWorkspace(ws); setShowWorkspacePicker(false); }}
            />
          ))}
          <View style={{ padding: 20 }}>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => { switchWorkspace(null); setShowWorkspacePicker(false); }}
            >
              <Text style={styles.clearBtnText}>Clear filter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 32,
    paddingBottom: 110,
  },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: SIZES.md,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.sm,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginTop: 14,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    ...SHADOW.sm,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 3,
    paddingLeft: 12,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 1,
  },
  statValue: {
    fontSize: SIZES.md,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // Transactions
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  txTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  txCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    ...SHADOW.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 9,
  },

  clearBtn: {
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});

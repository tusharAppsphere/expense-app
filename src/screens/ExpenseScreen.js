// src/screens/ExpenseScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, ActivityIndicator, Modal,
  Switch, FlatList, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW, CATEGORY_ICONS } from '../constants/theme';
import BalanceCard from '../components/BalanceCard';
import { TransactionRow, DateSectionHeader, EmptyState, CategoryIcon, SelectItem } from '../components/UI';
import { transactionAPI, statisticsAPI, categoryAPI, accountAPI } from '../api';
import { useWorkspace } from '../context/WorkspaceContext';
import { format } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

export default function ExpenseScreen({ navigation }) {
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState({});
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  
  const [listType, setListType] = useState('all'); // all, expense, income
  const [sortMode, setSortMode] = useState('-date');

  const [accounts, setAccounts] = useState([]);
  const [paymentSources, setPaymentSources] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [activePaymentMethodId, setActivePaymentMethodId] = useState(null);
  const [sourceLabel, setSourceLabel] = useState('All Sources');

  const fetchData = useCallback(async () => {
    try {
      const params = { ordering: sortMode };
      if (listType !== 'all') params.type = listType;
      if (activeWorkspace) params.workspace = activeWorkspace.id;
      if (activeAccountId) params.account = activeAccountId;
      if (activePaymentMethodId) params.payment_method = activePaymentMethodId;

      const [txRes, sumRes, accRes] = await Promise.all([
        transactionAPI.list(params),
        statisticsAPI.summary(params),
        accountAPI.list().catch(() => ({ data: [] }))
      ]);
      setTransactions(txRes.data.results || txRes.data);
      setSummary(sumRes.data);

      const accs = accRes.data.results || accRes.data;
      setAccounts(accs);
      const sources = [];
      accs.forEach(acc => {
        // Individual account option
        sources.push({ type: 'account', id: acc.id, name: acc.name, label: acc.name });
        // Combined methods
        acc.payment_methods.forEach(pm => {
          sources.push({ 
            type: 'method', 
            id: pm.id, 
            accountId: acc.id, 
            name: `${acc.name} - ${pm.label || pm.type.toUpperCase()}`,
            label: `${acc.name} - ${pm.label || pm.type.toUpperCase()}`
          });
        });
      });
      setPaymentSources(sources);
    } catch (err) { console.log(err?.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeWorkspace, listType, sortMode, activeAccountId, activePaymentMethodId]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const toggleCategory = (cat) =>
    setActiveCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));

  const filtered = transactions.filter((tx) => {
    const anyActive = Object.values(activeCategories).some(Boolean);
    if (anyActive && !activeCategories[tx.category_name]) return false;
    if (searchQuery && !tx.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, tx) => {
    const key = tx.date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(tx);
    return acc;
  }, {});

  const totalBalance = filtered.reduce((sum, tx) => {
    const amt = parseFloat(tx.amount || 0);
    return tx.type === 'income' ? sum + amt : sum - amt;
  }, 0);

  const uniqueCatsMap = {};
  transactions.forEach(t => {
    if (t.category_name && !uniqueCatsMap[t.category_name]) {
      uniqueCatsMap[t.category_name] = { name: t.category_name, icon: t.category_icon, color: t.category_color };
    }
  });
  const uniqueCategories = Object.values(uniqueCatsMap);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Balance Card */}
        <BalanceCard
          balance={totalBalance}
          date={new Date()}
          workspace={activeWorkspace}
          onWorkspacePress={() => setShowWorkspacePicker(true)}
          showStats
          statsLabel="Statistics"
          onViewStats={() => navigation.navigate('Statistics')}
        />

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <TouchableOpacity
            onPress={() => setShowSearch(true)}
            style={styles.filterBtn}
            hitSlop={8}
            activeOpacity={0.75}
          >
            <Ionicons name="options-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Type Toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggle}>
            {['all', 'expense', 'income'].map(t => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.toggleBtn,
                  listType === t && (t === 'income' ? styles.toggleActiveIncome : styles.toggleActive)
                ]}
                onPress={() => setListType(t)}
              >
                <Text style={[styles.toggleText, listType === t && styles.toggleTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
        ) : Object.keys(grouped).length === 0 ? (
          <EmptyState icon="receipt-outline" message="No transactions found" sub="Try adjusting your filters" />
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
                    {!(groupIdx === Object.keys(grouped).length - 1 && itemIdx === items.length - 1) && (
                      <View style={styles.divider} />
                    )}
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddExpense')} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Search & Filter Modal */}
      <Modal visible={showSearch} animationType="slide" onRequestClose={() => setShowSearch(false)}>
        <View style={styles.searchModal}>
          <View style={styles.searchBar}>
            <TouchableOpacity onPress={() => setShowSearch(false)}>
              <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search keyword..."
              placeholderTextColor={COLORS.textTertiary}
            />
            <TouchableOpacity onPress={() => { setSearchQuery(''); setShowSearch(false); }}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.categoryLabel}>Sort By</Text>
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, gap: 10 }}>
            {[{id: '-date', label: 'Newest Date'}, {id: '-amount', label: 'Highest Amount'}].map(s => (
              <TouchableOpacity key={s.id} onPress={() => { setSortMode(s.id); setShowSearch(false); }}
                style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: RADIUS.full, backgroundColor: sortMode === s.id ? COLORS.primary : COLORS.gray100 }}>
                <Text style={{ color: sortMode === s.id ? COLORS.white : COLORS.textPrimary, fontWeight: '600', fontSize: SIZES.sm }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.categoryLabel}>Filter by Account/Source ({sourceLabel})</Text>
          <View style={{ height: 220, marginBottom: 20 }}>
            <ScrollView nestedScrollEnabled style={{ paddingHorizontal: 20 }}>
              <SelectItem
                label="All Sources"
                selected={!activeAccountId && !activePaymentMethodId}
                onPress={() => {
                  setActiveAccountId(null);
                  setActivePaymentMethodId(null);
                  setSourceLabel('All Sources');
                }}
              />
              {paymentSources.map((s) => (
                <SelectItem
                  key={`${s.type}-${s.id}`}
                  label={s.label}
                  selected={(s.type === 'account' && activeAccountId === s.id && !activePaymentMethodId) || (s.type === 'method' && activePaymentMethodId === s.id)}
                  onPress={() => {
                    if (s.type === 'account') {
                      setActiveAccountId(s.id);
                      setActivePaymentMethodId(null);
                    } else {
                      setActiveAccountId(null);
                      setActivePaymentMethodId(s.id);
                    }
                    setSourceLabel(s.label);
                  }}
                />
              ))}
            </ScrollView>
          </View>

          <Text style={styles.categoryLabel}>Filter by Category</Text>
          <ScrollView>
            {uniqueCategories.map((cat) => (
              <View key={cat.name} style={styles.categoryRow}>
                <CategoryIcon category={cat.name} icon={cat.icon} color={cat.color} size={36} />
                <Text style={styles.categoryName}>{cat.name}</Text>
                <Switch
                  value={!!activeCategories[cat.name]}
                  onValueChange={() => toggleCategory(cat.name)}
                  trackColor={{ false: COLORS.gray200, true: COLORS.primary }}
                  thumbColor={COLORS.white}
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Workspace picker */}
      {showWorkspacePicker && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowWorkspacePicker(false)}>
          <TouchableOpacity style={styles.overlay} onPress={() => setShowWorkspacePicker(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Filter by workspace</Text>
            {workspaces.map((ws) => (
              <TouchableOpacity
                key={ws.id}
                style={styles.wsRow}
                onPress={() => { switchWorkspace(ws); setShowWorkspacePicker(false); }}
              >
                <Text style={styles.wsName}>{ws.name}</Text>
                {activeWorkspace?.id === ws.id && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.clearBtn} onPress={() => { switchWorkspace(null); setShowWorkspacePicker(false); }}>
              <Text style={styles.clearText}>Clear filter</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingTop: Platform.OS === 'ios' ? 60 : 32, paddingBottom: 110 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 24, marginBottom: 12,
  },
  sectionTitle: { fontSize: SIZES.base, fontWeight: '700', color: COLORS.textPrimary },
  toggleRow: { alignItems: 'center', paddingBottom: 14 },
  toggle: {
    flexDirection: 'row', backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.full, padding: 4, gap: 2, width: '100%', alignSelf: 'center',
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.full },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleActiveIncome: { backgroundColor: COLORS.success },
  toggleText: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.white },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnText: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textSecondary },
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
  searchModal: { flex: 1, backgroundColor: COLORS.white, paddingTop: 56 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl,
    marginHorizontal: 16, marginBottom: 20,
  },
  searchInput: { flex: 1, fontSize: SIZES.md, color: COLORS.textPrimary },
  categoryLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary, fontWeight: '600', paddingHorizontal: 20, marginBottom: 8 },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  categoryName: { flex: 1, fontSize: SIZES.md, color: COLORS.textPrimary, fontWeight: '500' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetTitle: { fontSize: SIZES.xl, fontWeight: '800', marginBottom: 20 },
  wsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  wsName: { flex: 1, fontSize: SIZES.md, fontWeight: '500', color: COLORS.textPrimary },
  clearBtn: { backgroundColor: COLORS.gray100, borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  clearText: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },

  // Transaction card
  txCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 56,
  },
});

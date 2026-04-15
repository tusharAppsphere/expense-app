// src/screens/StatisticsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, G } from 'react-native-svg';
import { COLORS, SIZES, RADIUS, SHADOW, CATEGORY_COLORS } from '../constants/theme';
import { statisticsAPI } from '../api';
import { useWorkspace } from '../context/WorkspaceContext';
import { CategoryIcon, EmptyState } from '../components/UI';
import { Button } from '../components/UI';
import { Calendar } from 'react-native-calendars';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const DONUT_SIZE = 220;
const STROKE = 28;
const RADIUS_DONUT = (DONUT_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS_DONUT;

function DonutChart({ data, total }) {
  let offset = 0;
  const cx = DONUT_SIZE / 2;
  const cy = DONUT_SIZE / 2;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: DONUT_SIZE, height: DONUT_SIZE }}>
      <Svg width={DONUT_SIZE} height={DONUT_SIZE}>
        {/* Background circle */}
        <Circle
          cx={cx} cy={cy} r={RADIUS_DONUT}
          stroke={COLORS.gray200} strokeWidth={STROKE}
          fill="none"
        />
        <G rotation="-90" origin={`${cx}, ${cy}`}>
          {data.map((item, i) => {
            const pct = total > 0 ? item.amount / total : 0;
            const dash = pct * CIRCUMFERENCE;
            const gap = CIRCUMFERENCE - dash;
            const seg = (
              <Circle
                key={i}
                cx={cx} cy={cy} r={RADIUS_DONUT}
                stroke={item.color}
                strokeWidth={STROKE}
                fill="none"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-offset * CIRCUMFERENCE}
                strokeLinecap="round"
              />
            );
            offset += pct;
            return seg;
          })}
        </G>
      </Svg>
      {/* Center text */}
      <View style={styles.donutCenter}>
        <Text style={styles.donutMonth}>{format(new Date(), 'MMMM yyyy')}</Text>
        <Text style={styles.donutAmount}>
          ₹{parseFloat(total || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
        </Text>
      </View>
    </View>
  );
}

export default function StatisticsScreen({ navigation }) {
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [view, setView] = useState('graph'); // 'graph' | 'list'
  const [type, setType] = useState('expense'); // 'expense' | 'income'
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });
  const [markedDates, setMarkedDates] = useState({});
  const [selectingStart, setSelectingStart] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        date_from: dateRange.start,
        date_to: dateRange.end,
        ...(activeWorkspace && { workspace: activeWorkspace.id }),
      };
      
      const [{ data: summaryRes }, { data: catRes }] = await Promise.all([
        statisticsAPI.summary(params),
        statisticsAPI.byCategory({ ...params, type })
      ]);
      setSummary(summaryRes);

      const arr = Array.isArray(catRes) ? catRes : catRes.categories || [];
      const totalAmt = arr.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
      setTotal(totalAmt);
      setData(arr.map((item) => ({
        ...item,
        amount: parseFloat(item.amount || 0),
        percentage: totalAmt > 0 ? ((parseFloat(item.amount) / totalAmt) * 100).toFixed(0) : 0,
        color: CATEGORY_COLORS[item.category_name] || (type === 'income' ? COLORS.success : COLORS.primary),
      })));
    } catch (err) { console.log(err?.message); }
    finally { setLoading(false); }
  }, [activeWorkspace, dateRange, type]);

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const handleDayPress = (day) => {
    if (selectingStart) {
      setDateRange({ start: day.dateString, end: day.dateString });
      setMarkedDates({
        [day.dateString]: { startingDay: true, endingDay: true, color: COLORS.primary, textColor: COLORS.white },
      });
      setSelectingStart(false);
    } else {
      const start = dateRange.start <= day.dateString ? dateRange.start : day.dateString;
      const end = dateRange.start <= day.dateString ? day.dateString : dateRange.start;
      setDateRange({ start, end });
      // Build range marking
      const marks = {};
      let cur = parseISO(start);
      const endDate = parseISO(end);
      while (cur <= endDate) {
        const key = format(cur, 'yyyy-MM-dd');
        marks[key] = {
          color: COLORS.primary,
          textColor: COLORS.white,
          startingDay: key === start,
          endingDay: key === end,
        };
        cur.setDate(cur.getDate() + 1);
      }
      setMarkedDates(marks);
      setSelectingStart(true);
    }
  };

  const dateLabel = `${format(parseISO(dateRange.start), 'd MMM')} – ${format(parseISO(dateRange.end), 'd MMM')}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => setShowWorkspacePicker(true)}
          style={styles.wsBadge}
          activeOpacity={0.7}
        >
          <Ionicons name="business-outline" size={18} color={COLORS.textPrimary} />
          <Text style={styles.wsBadgeText} numberOfLines={1}>{activeWorkspace?.name || 'My Workspace'}</Text>
          <Ionicons name="chevron-down" size={14} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistics</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)} hitSlop={10}>
          <Ionicons name="calendar-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'graph' && styles.toggleActive]}
            onPress={() => setView('graph')}
          >
            <Text style={[styles.toggleText, view === 'graph' && styles.toggleTextActive]}>Graph</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, view === 'list' && styles.toggleActive]}
            onPress={() => setView('list')}
          >
            <Text style={[styles.toggleText, view === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Balance Record Card */}
        {summary && (
          <View style={styles.balanceCard}>
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>Income</Text>
              <Text style={[styles.balanceVal, { color: COLORS.success }]}>+₹{parseFloat(summary.total_income).toLocaleString('en-US', { minimumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>Expenses</Text>
              <Text style={[styles.balanceVal, { color: COLORS.danger }]}>-₹{parseFloat(summary.total_expenses).toLocaleString('en-US', { minimumFractionDigits: 0 })}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceCol}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={[styles.balanceVal, { color: COLORS.textPrimary }]}>₹{parseFloat(summary.total_balance).toLocaleString('en-US', { minimumFractionDigits: 0 })}</Text>
            </View>
          </View>
        )}

        {/* Type Toggle for Category Breakdown */}
        <View style={[styles.toggleRow, { paddingTop: 0 }]}>
          <View style={[styles.toggle, { width: '100%' }]}>
            <TouchableOpacity style={[styles.toggleBtn, type === 'expense' && styles.toggleActive]} onPress={() => setType('expense')}>
              <Text style={[styles.toggleText, type === 'expense' && styles.toggleTextActive]}>Expense Breakdown</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, type === 'income' && styles.toggleActiveIncome]} onPress={() => setType('income')}>
              <Text style={[styles.toggleText, type === 'income' && styles.toggleTextActive]}>Income Breakdown</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 48 }} />
        ) : data.length === 0 ? (
          <EmptyState icon="bar-chart-outline" message="No data for this period" sub="Try selecting a different date range" />
        ) : view === 'graph' ? (
          <>
            {/* Donut */}
            <View style={{ alignItems: 'center', marginVertical: 24 }}>
              <DonutChart data={data} total={total} />
            </View>

            {/* Category pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {data.map((item, i) => (
                <View key={i} style={[styles.pill, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
                  <CategoryIcon category={item.category_name} size={24} />
                  <Text style={[styles.pillText, { color: item.color }]} numberOfLines={1}>{item.category_name}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Dot indicators */}
            <View style={styles.dots}>
              {data.slice(0, 5).map((_, i) => (
                <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
              ))}
            </View>
          </>
        ) : (
          // List view
          <View style={styles.listView}>
            {data.map((item, i) => (
              <View key={i} style={styles.listRow}>
                <CategoryIcon category={item.category_name} size={36} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.listCatName}>{item.category_name}</Text>
                  <Text style={styles.listPct}>{item.percentage}%</Text>
                </View>
                <Text style={styles.listAmt}>
                  ₹{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Date Range Picker Modal */}
      <Modal visible={showDatePicker} animationType="slide" transparent onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calHeader}>
              <Text style={styles.calTitle}>{dateLabel}</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.calHint}>{selectingStart ? 'Select start date' : 'Select end date'}</Text>
            <Calendar
              markingType="period"
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                selectedDayBackgroundColor: COLORS.primary,
                selectedDayTextColor: COLORS.white,
                todayTextColor: COLORS.primary,
                arrowColor: COLORS.primary,
                textMonthFontWeight: '700',
              }}
            />
            <View style={{ padding: 20 }}>
              <Button title="Show" onPress={() => { setShowDatePicker(false); fetchStats(); }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Workspace Picker */}
      {showWorkspacePicker && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowWorkspacePicker(false)}>
          <TouchableOpacity style={styles.overlay} onPress={() => setShowWorkspacePicker(false)} />
          <View style={styles.wsSheet}>
            <Text style={styles.wsTitle}>Workspaces</Text>
            {workspaces.map((ws) => (
              <TouchableOpacity key={ws.id} style={styles.wsRow} onPress={() => { switchWorkspace(ws); setShowWorkspacePicker(false); }}>
                <Text style={styles.wsName}>{ws.name}</Text>
                {activeWorkspace?.id === ws.id && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  wsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.white, borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.border,
    maxWidth: 160,
  },
  wsBadgeText: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textPrimary, flexShrink: 1 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  toggleRow: { alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  toggle: {
    flexDirection: 'row', backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.full, padding: 4, gap: 4,
  },
  toggleBtn: { paddingVertical: 8, paddingHorizontal: 28, borderRadius: RADIUS.full },
  toggleActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextActive: { color: COLORS.white },
  content: { paddingHorizontal: 16, paddingBottom: 40, alignItems: 'center' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: COLORS.textPrimary, marginTop: 8 },
  totalLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 4, fontWeight: '500' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutMonth: { fontSize: SIZES.sm, color: COLORS.textSecondary, fontWeight: '500' },
  donutAmount: { fontSize: SIZES.xxl, fontWeight: '800', color: COLORS.textPrimary },
  pillsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 4, paddingBottom: 8 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.full,
    borderWidth: 1, maxWidth: 160,
  },
  pillText: { fontSize: SIZES.sm, fontWeight: '600', flexShrink: 1 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 12 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.gray200 },
  dotActive: { backgroundColor: COLORS.primary, width: 20 },
  listView: { width: '100%', marginTop: 16 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  listCatName: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  listPct: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },
  listAmt: { fontSize: SIZES.md, fontWeight: '700', color: COLORS.textPrimary },
  // Date modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  calendarModal: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 40, maxHeight: '85%',
  },
  calHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  calTitle: { fontSize: SIZES.lg, fontWeight: '700' },
  calHint: { fontSize: SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  wsSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 48,
  },
  wsTitle: { fontSize: SIZES.xl, fontWeight: '800', marginBottom: 16 },
  wsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  wsName: { flex: 1, fontSize: SIZES.md, fontWeight: '500' },
  toggleActiveIncome: { backgroundColor: COLORS.success },
  balanceCard: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 20, marginBottom: 24, width: '100%', ...SHADOW.sm },
  balanceCol: { flex: 1, alignItems: 'center' },
  balanceLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 4, fontWeight: '500' },
  balanceVal: { fontSize: SIZES.md, fontWeight: '800' },
  balanceDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 8 },
});

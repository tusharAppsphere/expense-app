// src/screens/AddExpenseScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW } from '../constants/theme';
import { Button, InputField, BottomSheet, SelectItem } from '../components/UI';
import { transactionAPI, categoryAPI, accountAPI } from '../api';
import { useWorkspace } from '../context/WorkspaceContext';
import { format, parseISO } from 'date-fns';
import { Calendar } from 'react-native-calendars';

const ICON_OPTIONS = [
  'star', 'restaurant', 'car', 'heart', 'happy', 'nutrition', 'home',
  'umbrella', 'reader', 'briefcase', 'gift', 'airplane', 'fitness',
  'medical', 'bus', 'pizza', 'shirt', 'game-controller'
];

const COLOR_OPTIONS = [
  '#4B5EFC', '#FF6B6B', '#4ECDC4', '#FF8CC8', '#FFD166', '#06D6A0',
  '#118AB2', '#7B68EE', '#F77F00', '#9B5DE5', '#EF476F', '#FF9F1C'
];

export default function AddExpenseScreen({ navigation, route }) {
  const { activeWorkspace } = useWorkspace();
  const existingTx = route.params?.transaction;

  const [form, setForm] = useState({
    title: existingTx?.title || '',
    amount: existingTx?.amount?.toString() || '',
    type: existingTx?.type || 'expense',
    category: existingTx?.category || null,
    categoryName: existingTx?.category_name || '',
    accountId: existingTx?.account || null,
    paymentMethodId: existingTx?.payment_method || null,
    sourceLabel: existingTx?.payment_method_label ? `${existingTx.account_name} - ${existingTx.payment_method_label}` : '',
    date: existingTx?.date || format(new Date(), 'yyyy-MM-dd'),
    description: existingTx?.description || '',
  });

  const [errors, setErrors] = useState({});
  const [errorObj, setErrorObj] = useState(null);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  
  // Flattened account-method pairs for the dropdown
  const [paymentSources, setPaymentSources] = useState([]);

  const [showPayment, setShowPayment] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('star');
  const [newCategoryColor, setNewCategoryColor] = useState(COLORS.primary);

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.list();
      const cats = res.data.results || res.data;
      if (cats?.length) setCategories(cats);
    } catch (e) {}
  };

  useEffect(() => {
    Promise.all([
      fetchCategories(),
      accountAPI.list().catch(() => ({ data: [] }))
    ]).then(([_, accRes]) => {
      const accs = accRes.data.results || accRes.data;
      setAccounts(accs);
// ... existing source flattening logic ...

      // Flatten accounts into "Sources" (Account + Method pairs)
      const sources = [];
      accs.forEach(acc => {
        acc.payment_methods.forEach(pm => {
          sources.push({
            id: `${acc.id}-${pm.id}`,
            accountId: acc.id,
            accountName: acc.name,
            paymentMethodId: pm.id,
            paymentMethodLabel: pm.label || pm.type,
            type: pm.type,
            balance: acc.balance,
            isDefault: pm.is_default && acc.is_default
          });
        });
      });
      setPaymentSources(sources);

      if (!existingTx && sources.length > 0) {
        // Find default UPI or first available
        const def = sources.find(s => s.type === 'upi') || sources.find(s => s.isDefault) || sources[0];
        setForm(f => ({ 
          ...f, 
          accountId: def.accountId, 
          paymentMethodId: def.paymentMethodId,
          sourceLabel: `${def.accountName} - ${def.paymentMethodLabel.toUpperCase()}`
        }));
      }
    });
  }, []);

  const set = (key) => (val) => {
    setServerError('');
    setForm((f) => ({ ...f, [key]: val }));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Description is required';
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = 'Valid amount is required';
    if (form.type === 'expense' && !form.category) e.category = 'Category is required';
    if (!form.accountId) e.payment = 'Account is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setErrorObj(null);
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        amount: parseFloat(form.amount),
        category: form.category,
        account: form.accountId,
        payment_method: form.paymentMethodId,
        date: form.date,
        description: form.description,
        type: form.type,
        ...(activeWorkspace && { workspace: activeWorkspace.id }),
      };
      if (existingTx) {
        await transactionAPI.update(existingTx.id, payload);
      } else {
        await transactionAPI.create(payload);
      }
      if (route.params?.onGoBack) route.params.onGoBack();
      navigation.goBack();
    } catch (err) {
      if (err.response?.data?.amount) {
        const errMsg = Array.isArray(err.response.data.amount) ? err.response.data.amount[0] : err.response.data.amount;
        setErrorObj({ amount: errMsg });
      } else {
        setServerError(err?.response?.data?.detail || 'Failed to save transaction');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { data } = await categoryAPI.create({ 
        name: newCategoryName.trim(), 
        icon: newCategoryIcon,
        color: newCategoryColor
      });
      await fetchCategories();
      setForm(f => ({ ...f, category: data.id, categoryName: data.name }));
      setShowNewCategory(false);
      setNewCategoryName('');
      setNewCategoryIcon('star');
      setShowCategories(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to create category');
    }
  };

  const formattedDate = form.date
    ? format(parseISO(form.date), 'dd/MM/yyyy')
    : 'DD/MM/YYYY';

  const markedDates = {
    [form.date]: { selected: true, selectedColor: COLORS.primary },
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* ── Modal Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{existingTx ? 'Edit Transaction' : 'New Transaction'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Type Toggle ── */}
        <View style={styles.typeToggleRow}>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              form.type === 'expense' && styles.typeBtnActiveExpense,
            ]}
            onPress={() => set('type')('expense')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up-circle"
              size={16}
              color={form.type === 'expense' ? COLORS.white : COLORS.textSecondary}
            />
            <Text style={[styles.typeBtnText, form.type === 'expense' && { color: COLORS.white }]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              form.type === 'income' && styles.typeBtnActiveIncome,
            ]}
            onPress={() => set('type')('income')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-down-circle"
              size={16}
              color={form.type === 'income' ? COLORS.white : COLORS.textSecondary}
            />
            <Text style={[styles.typeBtnText, form.type === 'income' && { color: COLORS.white }]}>Income</Text>
          </TouchableOpacity>
        </View>

        <InputField
          label="Description *"
          value={form.title}
          onChangeText={set('title')}
          placeholder="New IT equipment"
          icon="star-outline"
          error={errors.title}
        />

        <InputField
          label="Amount *"
          value={form.amount}
          onChangeText={v => { setForm(f => ({ ...f, amount: v })); setErrorObj(null); }}
          placeholder="0"
          keyboardType="decimal-pad"
          icon="cash-outline"
          error={errorObj?.amount || errors.amount}
          rightElement={<Text style={styles.currency}>₹</Text>}
        />

        <InputField
          label={form.type === 'expense' ? 'Category *' : 'Category (optional)'}
          value={form.categoryName}
          icon="star-outline"
          error={errors.category}
          onPress={() => setShowCategories(true)}
          placeholder="Select category"
        />

        <InputField
          label="Payment Source *"
          value={form.sourceLabel}
          icon="wallet-outline"
          onPress={() => setShowPayment(true)}
          error={errors.payment}
        />

        <InputField
          label="Date *"
          value={formattedDate !== 'DD/MM/YYYY' ? formattedDate : ''}
          placeholder="DD/MM/YYYY"
          icon="calendar-outline"
          onPress={() => setShowDate(true)}
          editable={false}
        />

        <InputField
          label="Notes (optional)"
          value={form.description}
          onChangeText={set('description')}
          placeholder="Additional details..."
          multiline
        />

        {serverError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{serverError}</Text>
          </View>
        ) : null}

        <Button
          title={loading ? 'Saving...' : (existingTx ? 'Save Changes →' : 'Next →')}
          onPress={handleSubmit}
          loading={loading}
          icon={!loading ? 'arrow-forward' : undefined}
          style={{ marginTop: 12 }}
        />
      </ScrollView>

      {/* Payment Source Sheet */}
      <BottomSheet visible={showPayment} onClose={() => setShowPayment(false)} title="Select Source" snapHeight={450}>
        <ScrollView>
          {paymentSources.map((s) => (
            <SelectItem
              key={`source-${s.id}`}
              label={`${s.accountName} - ${s.paymentMethodLabel.toUpperCase()}`}
              subText={`Balance: ₹${parseFloat(s.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              icon={s.type === 'upi' ? 'qr-code-outline' : s.type === 'bank' ? 'business-outline' : 'card-outline'}
              selected={form.paymentMethodId === s.paymentMethodId && form.accountId === s.accountId}
              onPress={() => {
                setForm((f) => ({ 
                  ...f, 
                  accountId: s.accountId, 
                  paymentMethodId: s.paymentMethodId,
                  sourceLabel: `${s.accountName} - ${s.paymentMethodLabel.toUpperCase()}`
                }));
                setShowPayment(false);
              }}
            />
          ))}
          <View style={{ padding: 16 }}>
            <Button
               title="Manage Methods"
               variant="ghost"
               onPress={() => { setShowPayment(false); navigation.navigate('BankAccounts'); }}
            />
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Date Picker Sheet */}
      <BottomSheet visible={showDate} onClose={() => setShowDate(false)} title="Date" snapHeight={520}>
        <ScrollView>
          <Calendar
            current={form.date}
            onDayPress={(day) => setForm((f) => ({ ...f, date: day.dateString }))}
            markedDates={markedDates}
            theme={{
              backgroundColor: COLORS.white,
              calendarBackground: COLORS.white,
              selectedDayBackgroundColor: COLORS.primary,
              selectedDayTextColor: COLORS.white,
              todayTextColor: COLORS.primary,
              dayTextColor: COLORS.textPrimary,
              textDisabledColor: COLORS.textTertiary,
              monthTextColor: COLORS.textPrimary,
              arrowColor: COLORS.primary,
              textDayFontWeight: '500',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
            }}
          />
          <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
            <Button title="Select" onPress={() => setShowDate(false)} />
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Categories Sheet */}
      <BottomSheet visible={showCategories} onClose={() => setShowCategories(false)} title="Categories" snapHeight={560}>
        <ScrollView>
          <SelectItem
            label="➕ New Category"
            onPress={() => { setShowCategories(false); setTimeout(() => setShowNewCategory(true), 300); }}
            style={{ backgroundColor: COLORS.gray100 }}
          />
          {categories.map((cat) => (
            <SelectItem
              key={`cat-${cat.id}`}
              label={cat.name}
              icon={cat.icon}
              selected={form.category === cat.id}
              onPress={() => {
                setForm((f) => ({ ...f, category: cat.id, categoryName: cat.name }));
                setShowCategories(false);
              }}
            />
          ))}
        </ScrollView>
      </BottomSheet>

      {/* New Category Modal */}
      <Modal visible={showNewCategory} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.catModal}>
            <View style={styles.catModalHeader}>
              <Text style={styles.catModalTitle}>New Category</Text>
              <TouchableOpacity onPress={() => setShowNewCategory(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <InputField
                label="Category Name"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="e.g. Subscriptions"
                autoFocus
              />

              <Text style={styles.gridLabel}>Select Icon</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((ico) => (
                  <TouchableOpacity
                    key={ico}
                    onPress={() => setNewCategoryIcon(ico)}
                    style={[
                      styles.iconCell,
                      newCategoryIcon === ico && { backgroundColor: newCategoryColor + '20', borderColor: newCategoryColor }
                    ]}
                  >
                    <Ionicons name={ico} size={24} color={newCategoryIcon === ico ? newCategoryColor : COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.gridLabel}>Select Color</Text>
              <View style={styles.colorRow}>
                {COLOR_OPTIONS.map((col) => (
                  <TouchableOpacity
                    key={col}
                    onPress={() => setNewCategoryColor(col)}
                    style={[
                      styles.colorCell,
                      { backgroundColor: col },
                      newCategoryColor === col && styles.colorSelected
                    ]}
                  />
                ))}
              </View>

              <Button 
                title="Create Category" 
                onPress={handleCreateCategory} 
                disabled={!newCategoryName.trim()}
                style={{ marginTop: 20, marginBottom: 40 }} 
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: COLORS.gray100,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 48 },

  // Type Toggle
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    padding: 4,
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.lg,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: RADIUS.md,
  },
  typeBtnActiveExpense: { backgroundColor: COLORS.danger },
  typeBtnActiveIncome:  { backgroundColor: COLORS.success },
  typeBtnText: { fontSize: SIZES.sm, fontWeight: '700', color: COLORS.textSecondary },
  currency: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textSecondary },
  errorBox: { backgroundColor: '#FFF0F0', padding: 12, borderRadius: RADIUS.md, marginTop: 12 },
  errorText: { color: COLORS.danger, fontSize: SIZES.sm, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  alertModal: { width: '85%', maxWidth: 400, backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 24, ...SHADOW.lg },
  alertTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16, textAlign: 'center' },
  
  // Category Modal
  catModal: { width: '90%', height: '80%', backgroundColor: COLORS.white, borderRadius: RADIUS.xl, overflow: 'hidden', ...SHADOW.lg },
  catModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catModalTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  gridLabel: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, marginTop: 20, marginBottom: 12 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  iconCell: { width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 20 },
  colorCell: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },
  colorSelected: { borderColor: COLORS.white, ...SHADOW.sm },
});

// src/screens/BankAccountsScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Platform, Alert, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW } from '../constants/theme';
import { Button, EmptyState, InputField } from '../components/UI';
import { accountAPI, paymentAPI } from '../api';

export default function BankAccountsScreen({ navigation }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showMethodModal, setShowMethodModal] = useState(false);
  
  // Form State
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountName, setAccountName] = useState('');
  
  const [editingMethod, setEditingMethod] = useState(null);
  const [targetAccountId, setTargetAccountId] = useState(null);
  const [methodType, setMethodType] = useState('upi');
  const [methodLabel, setMethodLabel] = useState('');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const { data } = await accountAPI.list();
      setAccounts(data.results || data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    if (!accountName.trim()) return;
    setSaving(true);
    try {
      if (editingAccount) {
        await accountAPI.update(editingAccount.id, { name: accountName.trim() });
      } else {
        await accountAPI.create({ name: accountName.trim() });
      }
      setShowAccountModal(false);
      setEditingAccount(null);
      setAccountName('');
      fetchAccounts();
    } catch (err) {
      Alert.alert('Error', 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMethod = async () => {
    setSaving(true);
    try {
      const payload = {
        account: targetAccountId,
        type: methodType,
        label: methodLabel.trim(),
      };
      if (editingMethod) {
        await paymentAPI.update(editingMethod.id, payload);
      } else {
        await paymentAPI.create(payload);
      }
      setShowMethodModal(false);
      setEditingMethod(null);
      setMethodLabel('');
      fetchAccounts();
    } catch (err) {
      Alert.alert('Error', 'Failed to save payment method');
    } finally {
      setSaving(false);
    }
  };

  const openAccountEditor = (acc = null) => {
    setEditingAccount(acc);
    setAccountName(acc ? acc.name : '');
    setShowAccountModal(true);
  };

  const openMethodEditor = (accId, method = null) => {
    setTargetAccountId(accId);
    setEditingMethod(method);
    setMethodType(method ? method.type : 'upi');
    setMethodLabel(method ? method.label : '');
    setShowMethodModal(true);
  };

  const handleDeleteAccount = (id) => {
    Alert.alert('Delete Account', 'Are you sure? This will delete all linked payment methods.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await accountAPI.delete(id);
          fetchAccounts();
        } catch(e) { Alert.alert('Error', 'Failed to delete'); }
      }}
    ]);
  };

  const getMethodIcon = (type) => {
    switch(type) {
      case 'upi': return 'qr-code-outline';
      case 'bank': return 'business-outline';
      case 'cash': return 'cash-outline';
      case 'debit_card': return 'card-outline';
      case 'credit_card': return 'card';
      default: return 'wallet-outline';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Financial Accounts</Text>
        <TouchableOpacity onPress={() => openAccountEditor()} hitSlop={12}>
          <Ionicons name="add" size={26} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : accounts.length === 0 ? (
          <EmptyState icon="business-outline" message="No accounts found" sub="Add a bank or cash account to get started" />
        ) : (
          accounts.map(acc => (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.accountName}>{acc.name}</Text>
                  <Text style={styles.accountBalance}>₹ {parseFloat(acc.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
                </View>
                <TouchableOpacity onPress={() => openAccountEditor(acc)} style={styles.editBtn}>
                   <Ionicons name="pencil" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteAccount(acc.id)} style={[styles.editBtn, { marginLeft: 8 }]}>
                   <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>

              <View style={styles.methodsList}>
                {acc.payment_methods.map(pm => (
                  <TouchableOpacity 
                    key={pm.id} 
                    style={styles.methodRow} 
                    onPress={() => openMethodEditor(acc.id, pm)}
                  >
                    <View style={styles.methodIconBg}>
                      <Ionicons name={getMethodIcon(pm.type)} size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.methodLabel}>{pm.label || pm.type.toUpperCase()}</Text>
                    {pm.is_default && (
                      <View style={styles.defaultBadge}><Text style={styles.defaultText}>Default</Text></View>
                    )}
                    <Ionicons name="chevron-forward" size={14} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity 
                  style={styles.addMethodBtn} 
                  onPress={() => openMethodEditor(acc.id)}
                >
                  <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.addMethodText}>Link New Method</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => openAccountEditor()}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>

      {/* Account Modal */}
      <Modal visible={showAccountModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={styles.centeredModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingAccount ? 'Edit Account' : 'New Account'}</Text>
                <TouchableOpacity onPress={() => setShowAccountModal(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary}/></TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <InputField label="Account Name" value={accountName} onChangeText={setAccountName} placeholder="e.g. HDFC Bank" autoFocus />
                <Button title="Save Account" onPress={handleSaveAccount} loading={saving} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Method Modal */}
      <Modal visible={showMethodModal} animationType="fade" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={styles.centeredModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingMethod ? 'Edit Method' : 'Link Method'}</Text>
                <TouchableOpacity onPress={() => setShowMethodModal(false)}><Ionicons name="close" size={24} color={COLORS.textPrimary}/></TouchableOpacity>
              </View>
              <View style={{ padding: 20 }}>
                <Text style={styles.label}>Method Type</Text>
                <View style={styles.typeGrid}>
                  {['upi', 'bank_transfer', 'cash', 'debit_card', 'credit_card'].map(t => (
                    <TouchableOpacity 
                      key={t}
                      style={[styles.typeChip, methodType === t && styles.typeChipActive]}
                      onPress={() => setMethodType(t)}
                    >
                      <Text style={[styles.typeChipText, methodType === t && styles.typeChipTextActive]}>{t.replace('_', ' ').toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <InputField label="Label (optional)" value={methodLabel} onChangeText={setMethodLabel} placeholder="e.g. Personal UPI" />
                <Button title="Save Method" onPress={handleSaveMethod} loading={saving} />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 30, paddingBottom: 16,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  content: { padding: 16, paddingBottom: 100 },
  accountCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, 
    marginBottom: 20, ...SHADOW.md, overflow: 'hidden'
  },
  accountHeader: {
    flexDirection: 'row', alignItems: 'center', 
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.gray100
  },
  accountName: { fontSize: SIZES.md, fontWeight: '800', color: COLORS.textPrimary },
  accountBalance: { fontSize: 20, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  editBtn: { padding: 8, backgroundColor: COLORS.gray100, borderRadius: 8 },
  methodsList: { padding: 8 },
  methodRow: {
    flexDirection: 'row', alignItems: 'center', 
    padding: 12, borderRadius: RADIUS.md, gap: 12
  },
  methodIconBg: {
    width: 32, height: 32, borderRadius: 8, 
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center'
  },
  methodLabel: { flex: 1, fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  defaultBadge: { backgroundColor: COLORS.success + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  defaultText: { fontSize: 10, fontWeight: '700', color: COLORS.success },
  addMethodBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 12, gap: 8, marginTop: 4, borderDash: [4, 4], // dashed border not native, using border
    borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: RADIUS.md
  },
  addMethodText: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.primary },
  fab: {
    position: 'absolute', bottom: 30, right: 20, width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center', ...SHADOW.lg
  },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  centeredModal: { width: '85%', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.lg },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: SIZES.lg, fontWeight: '700' },
  label: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.full, backgroundColor: COLORS.gray100, borderWidth: 1, borderColor: COLORS.border },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  typeChipTextActive: { color: COLORS.white }
});

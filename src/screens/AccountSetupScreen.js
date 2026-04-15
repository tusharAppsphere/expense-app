// src/screens/AccountSetupScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW } from '../constants/theme';
import { Button, InputField } from '../components/UI';
import { accountAPI, paymentAPI } from '../api';
import { useAuth } from '../context/AuthContext';

const PAYMENT_OPTIONS = [
  { id: 'upi', label: 'UPI', icon: 'qr-code-outline' },
  { id: 'cash', label: 'Cash', icon: 'cash-outline' },
  { id: 'debit_card', label: 'Debit Card', icon: 'card-outline' },
  { id: 'credit_card', label: 'Credit Card', icon: 'card' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline' },
];

export default function AccountSetupScreen() {
  const { updateUser } = useAuth();
  const [accountName, setAccountName] = useState('My Primary Bank');
  const [selectedMethods, setSelectedMethods] = useState(['upi']); // UPI default selected
  const [loading, setLoading] = useState(false);

  const toggleMethod = (id) => {
    if (selectedMethods.includes(id)) {
      if (selectedMethods.length > 1) {
        setSelectedMethods(selectedMethods.filter(m => m !== id));
      } else {
        Alert.alert('Selection Required', 'Please keep at least one payment method.');
      }
    } else {
      setSelectedMethods([...selectedMethods, id]);
    }
  };

  const handleSetup = async () => {
    if (!accountName.trim()) return;
    setLoading(true);
    try {
      // 1. Create the Financial Account
      const { data: account } = await accountAPI.create({
        name: accountName.trim(),
        is_default: true,
      });

      // 2. Create the selected Payment Methods for this account
      const pmPromises = selectedMethods.map(methodType => {
        return paymentAPI.create({
          account: account.id,
          type: methodType,
          label: methodType === 'upi' ? 'My UPI' : '',
          is_default: methodType === 'upi' // Set UPI as default if selected
        });
      });

      await Promise.all(pmPromises);

      // 3. Trigger context update to unlock app (re-fetches profile or updates flag)
      updateUser({ has_setup_completed: true });
    } catch (err) {
      console.log(err);
      Alert.alert('Setup Error', 'Failed to complete account setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>Let's get you set up!</Text>
            <Text style={styles.subtitle}>Create your first bank or cash account to start tracking transactions.</Text>
          </View>

          <View style={styles.form}>
            <InputField
              label="Account Name"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="e.g. HDFC Bank, My Wallet"
              icon="business-outline"
            />

            <Text style={styles.sectionLabel}>Select Payment Methods</Text>
            <Text style={styles.sectionSub}>Which ways do you spend/receive in this account?</Text>

            <View style={styles.methodsGrid}>
              {PAYMENT_OPTIONS.map((item) => {
                const isSelected = selectedMethods.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.methodCard, isSelected && styles.methodCardActive]}
                    onPress={() => toggleMethod(item.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={item.icon} 
                      size={24} 
                      color={isSelected ? COLORS.white : COLORS.textPrimary} 
                    />
                    <Text style={[styles.methodLabel, isSelected && styles.methodLabelActive]}>
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Button
            title={loading ? "Wrapping up..." : "Complete Setup"}
            onPress={handleSetup}
            loading={loading}
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 80 : 40, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
    ...SHADOW.sm
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 12 },
  subtitle: { fontSize: SIZES.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  form: { marginBottom: 32 },
  sectionLabel: { fontSize: SIZES.md, fontWeight: '700', color: COLORS.textPrimary, marginTop: 24, marginBottom: 4 },
  sectionSub: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 16 },
  methodsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  methodCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative'
  },
  methodCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    ...SHADOW.md
  },
  methodLabel: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.textPrimary },
  methodLabelActive: { color: COLORS.white },
  checkBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: COLORS.white, borderRadius: 10
  }
});

// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW } from '../constants/theme';
import { Button, InputField } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');

  const set = (key) => (val) => {
    setServerError('');
    setForm((f) => ({ ...f, [key]: val }));
  };

  const validate = () => {
    const e = {};
    if (mode === 'register' && !form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    if (mode === 'register' && form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({ name: form.name, email: form.email, password: form.password });
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || (typeof err?.response?.data === 'object' ? Object.entries(err.response.data).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : null) || err?.message || 'Something went wrong. Please try again.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Illustration header */}
        <View style={styles.header}>
          <View style={styles.appIcon}>
            <Ionicons name="star" size={28} color={COLORS.black} />
          </View>
          <Text style={styles.title}>Welcome to Your{'\n'}Expense Manager</Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Track your spending effortlessly. Sign in to get started'
              : 'Create your account to start tracking expenses'}
          </Text>
        </View>

        {/* Mode tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => { setMode('login'); setErrors({}); setServerError(''); }}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => { setMode('register'); setErrors({}); setServerError(''); }}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Register</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <InputField
              label="Full Name *"
              value={form.name}
              onChangeText={set('name')}
              placeholder="Devon Lane"
              icon="person-outline"
              error={errors.name}
            />
          )}
          <InputField
            label="Email Address *"
            value={form.email}
            onChangeText={set('email')}
            placeholder="you@example.com"
            keyboardType="email-address"
            icon="mail-outline"
            error={errors.email}
          />
          <InputField
            label="Password *"
            value={form.password}
            onChangeText={set('password')}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            icon="lock-closed-outline"
            error={errors.password}
            rightElement={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            }
          />
          {mode === 'register' && (
            <InputField
              label="Confirm Password *"
              value={form.confirmPassword}
              onChangeText={set('confirmPassword')}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
              icon="lock-closed-outline"
              error={errors.confirmPassword}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={10}>
                  <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              }
            />
          )}

          {serverError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{serverError}</Text>
            </View>
          ) : null}

          <Button
            title={mode === 'login' ? 'Sign In' : 'Create Account'}
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          {mode === 'login' && (
            <TouchableOpacity style={{ alignItems: 'center', marginTop: 16 }} onPress={() => setServerError('Password reset functionality will be available in a future update.')}>
              <Text style={{ color: COLORS.primary, fontSize: SIZES.sm, fontWeight: '500' }}>Forgot password?</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <Button
          title="Sign in with Google"
          variant="secondary"
          icon="logo-google"
          onPress={() => Alert.alert('Info', 'Configure Google OAuth in your Django backend')}
          style={{ marginBottom: 12 }}
        />
        <Button
          title="Sign in with Apple"
          variant="primary"
          icon="logo-apple"
          onPress={() => Alert.alert('Info', 'Configure Apple OAuth in your Django backend')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  appIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 34, marginBottom: 10 },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: 24,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.full },
  tabActive: { backgroundColor: COLORS.white, ...SHADOW.sm },
  tabText: { fontSize: SIZES.md, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.textPrimary, fontWeight: '700' },
  form: { gap: 0 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  errorBox: { backgroundColor: '#FFF0F0', padding: 12, borderRadius: RADIUS.md, marginBottom: 12, marginTop: 8 },
  errorText: { color: COLORS.danger, fontSize: SIZES.sm, textAlign: 'center' },
});

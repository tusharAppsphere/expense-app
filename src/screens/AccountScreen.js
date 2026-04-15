// src/screens/AccountScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, Platform, Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW } from '../constants/theme';
import { AvatarCircle, Button, BottomSheet, SelectItem, InputField } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { userAPI } from '../api';

// ─── SETTING ROW ────────────────────────────────────────────────
function SettingRow({ icon, label, value, onPress, danger }) {
  return (
    <TouchableOpacity onPress={onPress} style={srStyles.row} activeOpacity={0.7}>
      <View style={[srStyles.icon, danger && { backgroundColor: '#FFF0F0' }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.textPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={srStyles.label}>{label}</Text>
        {value ? <Text style={srStyles.value} numberOfLines={1}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
}

const srStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  icon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.gray100,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  label: { fontSize: SIZES.xs, color: COLORS.textSecondary, fontWeight: '500' },
  value: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary, marginTop: 1 },
});


// ─── OTP MODAL ──────────────────────────────────────────────────
function OtpModal({ visible, phone, onVerify, onClose }) {
  const [otp, setOtp] = useState(['', '', '', '']);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const handleChange = (text, idx) => {
    const next = [...otp];
    next[idx] = text.slice(-1);
    setOtp(next);
    if (text && idx < 3) refs[idx + 1].current?.focus();
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code === '0000') onVerify();
    else Alert.alert('Invalid OTP', 'The code you entered is incorrect. Try 0000.');
  };

  const reset = () => setOtp(['', '', '', '']);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
      <View style={otpStyles.overlay}>
        <View style={otpStyles.sheet}>
          <TouchableOpacity onPress={onClose} style={otpStyles.closeBtn}>
            <Ionicons name="close" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={otpStyles.iconWrap}>
            <Ionicons name="phone-portrait-outline" size={40} color={COLORS.primary} />
          </View>

          <Text style={otpStyles.title}>Verify Phone</Text>
          <Text style={otpStyles.sub}>Enter the 4-digit OTP sent to{'\n'}<Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{phone}</Text></Text>

          <View style={otpStyles.digitRow}>
            {otp.map((d, i) => (
              <TextInput
                key={i}
                ref={refs[i]}
                value={d}
                onChangeText={(t) => handleChange(t, i)}
                keyboardType="number-pad"
                maxLength={1}
                style={[otpStyles.digit, d && otpStyles.digitFilled]}
              />
            ))}
          </View>

          <Button title="Verify OTP" onPress={handleVerify} style={{ marginHorizontal: 24, marginTop: 24 }} />
          <TouchableOpacity onPress={reset} style={{ alignItems: 'center', marginTop: 16, paddingBottom: 8 }}>
            <Text style={{ color: COLORS.textSecondary, fontSize: SIZES.sm }}>Clear</Text>
          </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const otpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 28, alignItems: 'center',
  },
  closeBtn: { position: 'absolute', top: 20, right: 20, padding: 4 },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: SIZES.xl, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  digitRow: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  digit: {
    width: 56, height: 64, borderRadius: 14,
    borderWidth: 2, borderColor: COLORS.border,
    textAlign: 'center', fontSize: 28, fontWeight: '700',
    color: COLORS.textPrimary, backgroundColor: COLORS.gray100,
  },
  digitFilled: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
});


// ─── EDIT PROFILE PIC MODAL ─────────────────────────────────────
function EditProfilePicModal({ visible, onClose, onCamera, onGallery }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={editStyles.overlay}>
        <View style={editStyles.sheet}>
          <View style={editStyles.header}>
            <Text style={editStyles.title}>Profile Picture</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <SettingRow icon="camera-outline" label="Take a photo" onPress={onCamera} />
            <SettingRow icon="image-outline" label="Upload from gallery" onPress={onGallery} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── EDIT NAME MODAL ─────────────────────────────────────────────
function EditNameModal({ visible, currentFirst, currentLast, onSave, onClose }) {
  const [firstName, setFirstName] = useState(currentFirst || '');
  const [lastName, setLastName] = useState(currentLast || '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={editStyles.overlay}>
          <View style={editStyles.sheet}>
          <View style={editStyles.header}>
            <Text style={editStyles.title}>Edit Name</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
          </View>
          <View style={{ padding: 20, gap: 4 }}>
            <InputField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="e.g. John" />
            <InputField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="e.g. Doe" />
          </View>
          <Button
            title="Save Changes"
            onPress={() => onSave(firstName, lastName)}
            disabled={!firstName.trim()}
            style={{ margin: 20, marginTop: 4 }}
          />
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


// ─── EDIT PHONE MODAL ────────────────────────────────────────────
function EditPhoneModal({ visible, currentPhone, onNext, onClose }) {
  const [phone, setPhone] = useState(currentPhone || '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
      >
        <View style={editStyles.overlay}>
          <View style={editStyles.sheet}>
            
            <View style={editStyles.header}>
              <Text style={editStyles.title}>Change Phone</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <InputField
                label="Phone Number"
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 9999999999"
                keyboardType="phone-pad"
                icon="call-outline"
              />
              <Text style={{
                fontSize: SIZES.xs,
                color: COLORS.textSecondary,
                marginTop: 4,
                marginLeft: 4
              }}>
                An OTP will be sent to this number for verification.
              </Text>
            </View>

            <Button
              title="Send OTP →"
              onPress={() => onNext(phone)}
              disabled={!phone.trim() || phone.length < 8}
              style={{ margin: 20, marginTop: 4 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const editStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
});


// ─── MAIN SCREEN ────────────────────────────────────────────────
export default function AccountScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace, fetchWorkspaces, createWorkspace } = useWorkspace();

  const [showWorkspaces, setShowWorkspaces] = useState(false);
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Profile edit state
  const [showEditName, setShowEditName] = useState(false);
  const [showEditPhone, setShowEditPhone] = useState(false);
  const [pendingPhone, setPendingPhone] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User';

  const handleSaveName = async (first, last) => {
    setSaving(true);
    try {
      await userAPI.updateProfile({ first_name: first.trim(), last_name: last.trim() });
      await refreshUser?.();
      setShowEditName(false);
    } catch {
      Alert.alert('Error', 'Could not save name. Please try again.');
    } finally { setSaving(false); }
  };

  const handlePhoneNext = (phone) => {
    setPendingPhone(phone);
    setShowEditPhone(false);
    setTimeout(() => setShowOtp(true), 300);
  };

  const handleOtpVerify = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile({ phone_number: pendingPhone });
      await refreshUser?.();
      setShowOtp(false);
      Alert.alert('Success', 'Phone number updated successfully!');
    } catch {
      Alert.alert('Error', 'Could not save phone. Please try again.');
    } finally { setSaving(false); }
  };

  const handleCreateWorkspace = async () => {
    if (!newWsName.trim()) return;
    setCreating(true);
    try {
      await createWorkspace({ name: newWsName.trim(), description: '' });
      setNewWsName('');
      setShowNewWorkspace(false);
      await fetchWorkspaces();
    } catch {
      Alert.alert('Error', 'Failed to create workspace');
    } finally { setCreating(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── HERO HEADER ── */}
      <View style={styles.header}>
        {/* Decorative blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <Text style={styles.headerTitle}>My Account</Text>

        <View style={styles.avatarWrap}>
          <AvatarCircle name={fullName} size={80} bg={COLORS.primaryLight} />
          <TouchableOpacity style={styles.editAvatarBtn} onPress={() => setShowImageOptions(true)}>
            <Ionicons name="pencil" size={14} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <Text style={styles.heroName}>{fullName}</Text>
        <Text style={styles.heroEmail}>{user?.email}</Text>
      </View>

      {/* ── PERSONAL INFO ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Personal info</Text>
        <View style={styles.card}>
          <SettingRow
            icon="person-outline"
            label="Your name"
            value={fullName}
            onPress={() => setShowEditName(true)}
          />
          <SettingRow
            icon="call-outline"
            label="Phone number"
            value={user?.phone_number || 'Tap to add'}
            onPress={() => setShowEditPhone(true)}
          />
          <SettingRow
            icon="mail-outline"
            label="Email address"
            value={user?.email || ''}
            onPress={() => Alert.alert('Email', 'Email address cannot be changed.')}
          />
        </View>
      </View>

      {/* ── PREFERENCES ── */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferences</Text>
        <View style={styles.card}>
          <SettingRow
            icon="business-outline"
            label="Workspaces"
            value={`${workspaces.length} workspace${workspaces.length !== 1 ? 's' : ''}`}
            onPress={() => setShowWorkspaces(true)}
          />
          <SettingRow
            icon="wallet-outline"
            label="Manage Accounts & Methods"
            onPress={() => navigation.navigate('BankAccounts')}
          />
          <SettingRow
            icon="list-outline"
            label="Customize Categories"
            onPress={() => navigation.navigate('AddExpense')}
          />
        </View>
      </View>

      {/* ── SIGN OUT ── */}
      <View style={[styles.section, { paddingBottom: 60 }]}>
        <View style={styles.card}>
          <SettingRow
            icon="log-out-outline"
            label="Sign Out"
            danger
            onPress={() => setShowLogoutConfirm(true)}
          />
        </View>
      </View>

      {/* ── MODALS ── */}
      <EditProfilePicModal
        visible={showImageOptions}
        onClose={() => setShowImageOptions(false)}
        onCamera={() => {
          setShowImageOptions(false);
          Alert.alert('Camera', 'Camera functionality to be implemented');
        }}
        onGallery={() => {
          setShowImageOptions(false);
          Alert.alert('Gallery', 'Gallery functionality to be implemented');
        }}
      />

      <EditNameModal
        visible={showEditName}
        currentFirst={user?.first_name}
        currentLast={user?.last_name}
        onSave={handleSaveName}
        onClose={() => setShowEditName(false)}
      />

      <EditPhoneModal
        visible={showEditPhone}
        currentPhone={user?.phone_number}
        onNext={handlePhoneNext}
        onClose={() => setShowEditPhone(false)}
      />

      <OtpModal
        visible={showOtp}
        phone={pendingPhone}
        onVerify={handleOtpVerify}
        onClose={() => setShowOtp(false)}
      />

      {/* Workspaces Bottom Sheet */}
      <BottomSheet visible={showWorkspaces} onClose={() => setShowWorkspaces(false)} title="Workspaces" snapHeight={480}>
        <TouchableOpacity style={styles.newWsBtn} onPress={() => { setShowWorkspaces(false); setShowNewWorkspace(true); }}>
          <View style={styles.newWsBtnInner}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.newWsBtnText}>New workspace</Text>
          </View>
        </TouchableOpacity>
        <ScrollView>
          {workspaces.map((ws) => (
            <TouchableOpacity key={ws.id} style={styles.wsCard} onPress={() => { switchWorkspace(ws); setShowWorkspaces(false); }} activeOpacity={0.7}>
              <AvatarCircle name={ws.name} size={40} bg={COLORS.primaryLight} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.wsCardName}>{ws.name}</Text>
                <Text style={styles.wsCardDesc}>{ws.description || 'No description'}</Text>
              </View>
              {activeWorkspace?.id === ws.id && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </BottomSheet>

      {/* New Workspace Modal */}
      <Modal visible={showNewWorkspace} animationType="slide" transparent onRequestClose={() => setShowNewWorkspace(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <View style={styles.overlay}>
            <View style={styles.newWsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Workspace</Text>
              <TouchableOpacity onPress={() => setShowNewWorkspace(false)}><Ionicons name="close" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <InputField label="Workspace Name" value={newWsName} onChangeText={setNewWsName} placeholder="e.g. Appsphere workspace" autoFocus />
            </View>
              <Button title={creating ? 'Creating...' : 'Create Workspace'} onPress={handleCreateWorkspace} loading={creating} disabled={!newWsName.trim()} style={{ margin: 20, marginTop: 4 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout Confirm Modal */}
      <Modal visible={showLogoutConfirm} animationType="fade" transparent onRequestClose={() => setShowLogoutConfirm(false)}>
        <View style={[styles.overlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={styles.alertModal}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF0F0', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 }}>
              <Ionicons name="log-out-outline" size={28} color={COLORS.danger} />
            </View>
            <Text style={styles.alertTitle}>Sign Out</Text>
            <Text style={styles.alertMessage}>Are you sure you want to sign out of your account?</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Button title="Cancel" variant="secondary" onPress={() => setShowLogoutConfirm(false)} style={{ flex: 1 }} />
              <Button title="Sign Out" variant="danger" onPress={() => { setShowLogoutConfirm(false); logout(); }} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 20 },

  // Hero Header
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 60 : 28,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOW.sm,
  },
  blob1: {
    position: 'absolute', top: -30, right: -40,
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 35, borderColor: COLORS.primaryLight,
  },
  blob2: {
    position: 'absolute', top: 40, right: 30,
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 20, borderColor: COLORS.primaryLight,
  },
  headerTitle: { fontSize: SIZES.xl, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  editAvatarBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  heroName: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
  heroEmail: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  // Section & Card
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionLabel: {
    fontSize: SIZES.xs, color: COLORS.textSecondary, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, paddingLeft: 4,
  },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, overflow: 'hidden', ...SHADOW.sm },

  // Workspaces
  newWsBtn: { margin: 16 },
  newWsBtnInner: { backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  newWsBtnText: { color: COLORS.white, fontSize: SIZES.md, fontWeight: '700' },
  wsCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  wsCardName: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  wsCardDesc: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 2 },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  newWsModal: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: SIZES.lg, fontWeight: '700' },

  alertModal: { width: '85%', maxWidth: 400, backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: 24, ...SHADOW.lg },
  alertTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' },
  alertMessage: { fontSize: SIZES.md, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 22 },
});

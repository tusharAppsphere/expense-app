// src/components/UI.js
import React, { useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Modal, ScrollView,
  Dimensions, Platform, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, RADIUS, SHADOW, CATEGORY_ICONS, CATEGORY_COLORS } from '../constants/theme';
import { format, parseISO } from 'date-fns';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── BUTTON ─────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', loading = false, icon, style, textStyle, disabled }) {
  const variants = {
    primary: { bg: COLORS.black, text: COLORS.white, border: 'transparent' },
    secondary: { bg: COLORS.white, text: COLORS.black, border: COLORS.black },
    blue: { bg: COLORS.primary, text: COLORS.white, border: 'transparent' },
    ghost: { bg: 'transparent', text: COLORS.primary, border: 'transparent' },
    danger: { bg: COLORS.danger, text: COLORS.white, border: 'transparent' },
    gray: { bg: COLORS.gray100, text: COLORS.textPrimary, border: 'transparent' },
  };
  const v = variants[variant];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: disabled ? COLORS.gray200 : v.bg, borderColor: v.border, borderWidth: v.border !== 'transparent' ? 1.5 : 0 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon && <Ionicons name={icon} size={18} color={v.text} />}
          <Text style={[styles.btnText, { color: v.text }, textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  btnText: { fontSize: SIZES.base, fontWeight: '600', letterSpacing: 0.3 },
});

// ─── INPUT FIELD ─────────────────────────────────────────────────
export function InputField({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, icon, error, multiline, editable = true, onPress, rightElement, style }) {
  const inputRef = useRef(null);

  const handleContainerPress = () => {
    if (onPress) {
      onPress();
    } else if (editable && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={handleContainerPress} style={[inputStyles.wrapper, style]}>
      <View style={[inputStyles.container, error ? { borderColor: COLORS.danger } : {}, !editable && { backgroundColor: COLORS.gray100 }]}>
        {icon && (
          <View style={inputStyles.iconWrap}>
            <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={inputStyles.label}>{label}</Text>
          {onPress ? (
            <Text style={[inputStyles.input, !value && { color: COLORS.textTertiary }]}>
              {value || placeholder || 'Select...'}
            </Text>
          ) : (
            <TextInput
              ref={inputRef}
              value={value}
              onChangeText={onChangeText}
              placeholder={placeholder}
              placeholderTextColor={COLORS.textTertiary}
              keyboardType={keyboardType}
              secureTextEntry={secureTextEntry}
              multiline={multiline}
              editable={editable}
              style={[inputStyles.input, multiline && { height: 60, textAlignVertical: 'top' }]}
            />
          )}
        </View>
        {rightElement && <View style={inputStyles.rightEl}>{rightElement}</View>}
        {onPress && <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} style={{ marginLeft: 4 }} />}
      </View>
      {error && <Text style={inputStyles.error}>{error}</Text>}
    </TouchableOpacity>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  container: {
    borderWidth: 1.5,
    borderColor: COLORS.inputBorder,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    minHeight: 58,
  },
  iconWrap: { marginRight: 10 },
  label: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginBottom: 2, fontWeight: '500' },
  input: { fontSize: SIZES.md, color: COLORS.textPrimary, fontWeight: '500', padding: 0 },
  rightEl: { marginLeft: 8 },
  error: { fontSize: SIZES.xs, color: COLORS.danger, marginTop: 4, marginLeft: 4 },
});

// ─── CATEGORY ICON ───────────────────────────────────────────────
export function CategoryIcon({ category, icon, color, size = 40 }) {
  const isEmoji = icon ? !/^[a-zA-Z0-9-]+$/.test(icon) : false;
  const finalIcon = icon || CATEGORY_ICONS[category] || 'star';
  const finalColor = color || CATEGORY_COLORS[category] || COLORS.primary;
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: finalColor + '25', // slightly tinted background based on color
      alignItems: 'center', justifyContent: 'center',
    }}>
      {isEmoji ? (
        <Text style={{ fontSize: size * 0.45 }}>{finalIcon}</Text>
      ) : (
        <Ionicons name={finalIcon} size={size * 0.45} color={finalColor} />
      )}
    </View>
  );
}

// ─── TRANSACTION ROW ─────────────────────────────────────────────
export function TransactionRow({ item, onPress }) {
  const isIncome = item.type === 'income';
  const amtColor = isIncome ? COLORS.success : COLORS.danger;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.72} style={txStyles.row}>
      <CategoryIcon category={item.category_name} icon={item.category_icon} color={item.category_color} size={44} />
      <View style={txStyles.info}>
        <Text style={txStyles.title} numberOfLines={1}>{item.title}</Text>
        <View style={txStyles.metaRow}>
          <Text style={txStyles.sub} numberOfLines={1}>{item.category_name}</Text>
          {item.payment_method_label ? (
            <View style={txStyles.methodBadge}>
              <Text style={txStyles.methodText} numberOfLines={1}>{item.payment_method_label}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={[txStyles.amountBadge, { backgroundColor: amtColor + '12' }]}>
        <Text style={[txStyles.amount, { color: amtColor }]}>
          {isIncome ? '+' : '-'}₹{parseFloat(item.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const txStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  sub: { fontSize: SIZES.sm, color: COLORS.textSecondary, flexShrink: 1 },
  methodBadge: {
    backgroundColor: COLORS.gray100,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  methodText: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary },
  amountBadge: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amount: { fontSize: SIZES.sm, fontWeight: '800' },
});

// ─── DATE SECTION HEADER ─────────────────────────────────────────
export function DateSectionHeader({ date }) {
  let label = date;
  try {
    const d = parseISO(date);  // timezone-safe: avoids UTC-to-local shift on date-only strings
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) label = 'Today';
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else label = format(d, 'd MMM · EEEE');
  } catch (_) {}
  return (
    <View style={dshStyles.row}>
      <Text style={dshStyles.text}>{label}</Text>
      <View style={dshStyles.line} />
    </View>
  );
}
const dshStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 6 },
  text: { fontSize: SIZES.xs, color: COLORS.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  line: { flex: 1, height: 1, backgroundColor: COLORS.border },
});

// ─── BOTTOM SHEET ────────────────────────────────────────────────
export function BottomSheet({ visible, onClose, title, children, snapHeight }) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={bsStyles.overlay} onPress={onClose} />
      <Animated.View style={[bsStyles.sheet, snapHeight && { height: snapHeight }, { transform: [{ translateY: slideAnim }] }]}>
        <View style={bsStyles.handle} />
        {title && (
          <View style={bsStyles.header}>
            <Text style={bsStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
        {children}
      </Animated.View>
    </Modal>
  );
}

const bsStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    minHeight: 200, maxHeight: SCREEN_HEIGHT * 0.85,
    ...SHADOW.lg,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.gray300, alignSelf: 'center',
    marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20,
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.textPrimary },
});

// ─── SELECT LIST ITEM ────────────────────────────────────────────
export function SelectItem({ label, selected, onPress, icon, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[siStyles.row, style]} activeOpacity={0.7}>
      {icon && (
        <View style={siStyles.icon}>
          {!/^[a-zA-Z0-9-]+$/.test(icon) ? (
            <Text style={{ fontSize: 18 }}>{icon}</Text>
          ) : (
            <Ionicons name={icon} size={20} color={COLORS.textPrimary} />
          )}
        </View>
      )}
      <Text style={siStyles.label}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
    </TouchableOpacity>
  );
}

const siStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 16,
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  icon: { marginRight: 14 },
  label: { flex: 1, fontSize: SIZES.md, color: COLORS.textPrimary, fontWeight: '500' },
});

// ─── SKELETON LOADER ─────────────────────────────────────────────
export function Skeleton({ width, height, borderRadius = 8, style }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{ width, height, borderRadius, backgroundColor: COLORS.gray200, opacity: anim }, style]} />
  );
}

// ─── WORKSPACE BADGE ─────────────────────────────────────────────
export function WorkspaceBadge({ name, onPress }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'WS';
  return (
    <TouchableOpacity onPress={onPress} style={wbStyles.row} activeOpacity={0.7}>
      <View style={wbStyles.avatar}><Text style={wbStyles.initials}>{initials}</Text></View>
      <View>
        <Text style={wbStyles.label} numberOfLines={1}>{name}</Text>
      </View>
      <Ionicons name="chevron-down" size={14} color={COLORS.white} style={{ marginLeft: 2 }} />
    </TouchableOpacity>
  );
}

const wbStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  initials: { fontSize: SIZES.sm, fontWeight: '700', color: COLORS.white },
  label: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.white, maxWidth: 120 },
});

// ─── AVATAR CIRCLE ───────────────────────────────────────────────
export function AvatarCircle({ name, size = 56, bg = COLORS.gray200 }) {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '??';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: COLORS.textPrimary }}>{initials}</Text>
    </View>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────
export function EmptyState({ icon = 'receipt-outline', message = 'No data yet', sub }) {
  return (
    <View style={esStyles.wrap}>
      <View style={esStyles.iconWrap}>
        <Ionicons name={icon} size={36} color={COLORS.primary} />
      </View>
      <Text style={esStyles.title}>{message}</Text>
      {sub && <Text style={esStyles.sub}>{sub}</Text>}
    </View>
  );
}
const esStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 52 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  title: { fontSize: SIZES.base, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  sub: { fontSize: SIZES.sm, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40, lineHeight: 20 },
});

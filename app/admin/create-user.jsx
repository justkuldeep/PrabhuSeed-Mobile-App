/**
 * Create User Screen — SUPER_ADMIN only
 * Creates users with employee_id, gmail, and password stored in Supabase DB.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../services/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

// ─── Static options ────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'OWNER',    label: '👑 Owner' },
  { value: 'MANAGER',  label: '👔 Manager' },
  { value: 'FIELD',    label: '🌾 Field Agent' },
  { value: 'ACCOUNTS', label: '💼 Accounts' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh',
];

// ─── Picker modal ──────────────────────────────────────────────────────────────

function PickerModal({ visible, title, options, selected, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.title}>{title}</Text>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {options.map((opt) => {
            const isSelected = opt.value ? opt.value === selected : opt === selected;
            const label = opt.label || opt;
            const value = opt.value || opt;
            return (
              <TouchableOpacity
                key={value}
                style={[pickerStyles.item, isSelected && pickerStyles.itemSelected]}
                onPress={() => { onSelect(value); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[pickerStyles.itemText, isSelected && pickerStyles.itemTextSelected]}>
                  {label}
                </Text>
                {isSelected && <Text style={pickerStyles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: 2,
  },
  itemSelected: { backgroundColor: Colors.primaryMuted },
  itemText: { flex: 1, fontSize: Typography.base, color: Colors.textSecondary },
  itemTextSelected: { color: Colors.primary, fontWeight: Typography.semibold },
  check: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
});

// ─── Select field ─────────────────────────────────────────────────────────────

function SelectField({ label, placeholder, value, displayValue, onPress, error }) {
  return (
    <View style={{ marginBottom: Spacing.base }}>
      {label && <Text style={sfStyles.label}>{label}</Text>}
      <TouchableOpacity
        style={[sfStyles.field, error && sfStyles.fieldError]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Text style={value ? sfStyles.valueText : sfStyles.placeholderText}>
          {displayValue || value || placeholder}
        </Text>
        <Text style={sfStyles.chevron}>›</Text>
      </TouchableOpacity>
      {error && <Text style={sfStyles.errorText}>{error}</Text>}
    </View>
  );
}

const sfStyles = StyleSheet.create({
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    minHeight: 52,
  },
  fieldError: { borderColor: Colors.error },
  valueText: { flex: 1, fontSize: Typography.base, color: Colors.textPrimary },
  placeholderText: { flex: 1, fontSize: Typography.base, color: Colors.textMuted },
  chevron: { fontSize: 22, color: Colors.textMuted, fontWeight: '300' },
  errorText: { fontSize: Typography.xs, color: Colors.error, marginTop: Spacing.xs },
});

// ─── Section divider ──────────────────────────────────────────────────────────

function Section({ title }) {
  return (
    <View style={secStyles.row}>
      <View style={secStyles.line} />
      <Text style={secStyles.text}>{title}</Text>
      <View style={secStyles.line} />
    </View>
  );
}

const secStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.base },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  text: { fontSize: Typography.xs, color: Colors.textMuted, marginHorizontal: Spacing.sm, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CreateUserScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  // Guard: SUPER_ADMIN only
  useEffect(() => {
    if (user?.role?.toUpperCase() !== 'SUPER_ADMIN') {
      Alert.alert('Access Denied', 'Only Super Admins can create users.');
      router.back();
    }
  }, [user]);

  const [form, setForm] = useState({
    employee_id: '',
    name: '',
    surname: '',
    mobile: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
    state: '',
    hq: '',
    manager_id: '',
    ppk_rate: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [picker, setPicker] = useState(null);
  const [managers, setManagers] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  useEffect(() => {
    if (form.role === 'FIELD' || form.role === 'ACCOUNTS') {
      setLoadingManagers(true);
      usersAPI.list({ role: 'MANAGER', limit: 100 })
        .then((res) => setManagers(res.data || []))
        .catch(() => setManagers([]))
        .finally(() => setLoadingManagers(false));
    } else {
      setManagers([]);
      setForm((prev) => ({ ...prev, manager_id: '' }));
    }
  }, [form.role]);

  const set = (key) => (val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  function validate() {
    const e = {};
    if (!form.employee_id.trim()) e.employee_id = 'Employee ID is required';
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) {
      e.email = 'Email (Gmail) is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Enter a valid email address';
    }
    if (!form.password) {
      e.password = 'Password is required';
    } else if (form.password.length < 6) {
      e.password = 'Password must be at least 6 characters';
    }
    if (form.password !== form.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    if (!form.role) e.role = 'Role is required';
    if (form.role === 'FIELD' && !form.manager_id) {
      e.manager_id = 'A manager must be assigned to field agents';
    }
    if (form.mobile && !/^\d{10}$/.test(form.mobile.trim())) {
      e.mobile = 'Enter a valid 10-digit mobile number';
    }
    if (form.ppk_rate && isNaN(Number(form.ppk_rate))) {
      e.ppk_rate = 'PPK Rate must be a number';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload = {
        employee_id: form.employee_id.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      };
      if (form.surname.trim())    payload.surname    = form.surname.trim();
      if (form.mobile.trim())     payload.mobile     = form.mobile.trim();
      if (form.state)             payload.state      = form.state;
      if (form.hq.trim())         payload.hq         = form.hq.trim();
      if (form.manager_id)        payload.manager_id = form.manager_id;
      if (form.ppk_rate.trim())   payload.ppk_rate   = Number(form.ppk_rate.trim());

      await usersAPI.create(payload);

      Alert.alert(
        'User Created',
        `${payload.name} has been added as ${form.role.charAt(0) + form.role.slice(1).toLowerCase()}.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert('Failed to Create User', err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const managerOptions = managers.map((m) => ({
    value: m.id,
    label: `${m.name}${m.surname ? ' ' + m.surname : ''} · ${m.hq || m.state || m.mobile || ''}`,
  }));
  const selectedManagerLabel = managers.find((m) => m.id === form.manager_id)
    ? managers.find((m) => m.id === form.manager_id)?.name
    : '';
  const selectedRoleLabel = ROLE_OPTIONS.find((r) => r.value === form.role)?.label || '';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.navBar, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
          <Text style={styles.backText}>Admin</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Create User</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity ── */}
        <Section title="Identity" />

        <Input
          label="Employee ID *"
          placeholder="e.g. 9 or EMP009"
          value={form.employee_id}
          onChangeText={set('employee_id')}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.employee_id}
          hint="Unique identifier used for login"
        />

        <Input
          label="Full Name *"
          placeholder="e.g. Ramesh Kumar"
          value={form.name}
          onChangeText={set('name')}
          autoCapitalize="words"
          autoCorrect={false}
          error={errors.name}
        />

        <Input
          label="Gmail / Email *"
          placeholder="e.g. ramesh@gmail.com"
          value={form.email}
          onChangeText={set('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
          hint="Used for login and notifications"
        />

        {/* ── Credentials ── */}
        <Section title="Credentials" />

        <Input
          label="Password *"
          placeholder="Minimum 6 characters"
          value={form.password}
          onChangeText={set('password')}
          secureTextEntry
          error={errors.password}
        />

        <Input
          label="Confirm Password *"
          placeholder="Re-enter password"
          value={form.confirmPassword}
          onChangeText={set('confirmPassword')}
          secureTextEntry
          error={errors.confirmPassword}
        />

        {/* ── Role ── */}
        <Section title="Role & Access" />

        <SelectField
          label="Role *"
          placeholder="Select a role"
          value={form.role}
          displayValue={selectedRoleLabel}
          onPress={() => setPicker('role')}
          error={errors.role}
        />

        {/* ── Optional info ── */}
        <Section title="Optional Info" />

        <Input
          label="Surname"
          placeholder="e.g. Sharma"
          value={form.surname}
          onChangeText={set('surname')}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <Input
          label="Mobile Number"
          placeholder="10-digit mobile (optional)"
          value={form.mobile}
          onChangeText={set('mobile')}
          keyboardType="phone-pad"
          maxLength={10}
          error={errors.mobile}
        />

        <Input
          label="HQ / Location"
          placeholder="e.g. Pune"
          value={form.hq}
          onChangeText={set('hq')}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <SelectField
          label="State"
          placeholder="Select state"
          value={form.state}
          onPress={() => setPicker('state')}
        />

        {/* Manager assignment — only for FIELD / ACCOUNTS */}
        {(form.role === 'FIELD' || form.role === 'ACCOUNTS') && (
          <>
            <Section title="Assignment" />
            {loadingManagers ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading managers…</Text>
              </View>
            ) : (
              <SelectField
                label={form.role === 'FIELD' ? 'Assign Manager *' : 'Assign Manager'}
                placeholder="Select a manager"
                value={form.manager_id}
                displayValue={selectedManagerLabel}
                onPress={() => setPicker('manager')}
                error={errors.manager_id}
              />
            )}
          </>
        )}

        {form.role === 'FIELD' && (
          <Input
            label="PPK Rate (₹ per km)"
            placeholder="e.g. 5.50"
            value={form.ppk_rate}
            onChangeText={set('ppk_rate')}
            keyboardType="decimal-pad"
            error={errors.ppk_rate}
            hint="Per-km reimbursement rate for this agent"
          />
        )}

        <View style={styles.submitRow}>
          <Button
            title={submitting ? 'Creating…' : 'Create User'}
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            fullWidth
            size="lg"
          />
        </View>
      </ScrollView>

      <PickerModal
        visible={picker === 'role'}
        title="Select Role"
        options={ROLE_OPTIONS}
        selected={form.role}
        onSelect={set('role')}
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'state'}
        title="Select State"
        options={INDIAN_STATES}
        selected={form.state}
        onSelect={set('state')}
        onClose={() => setPicker(null)}
      />
      <PickerModal
        visible={picker === 'manager'}
        title="Assign Manager"
        options={managerOptions}
        selected={form.manager_id}
        onSelect={set('manager_id')}
        onClose={() => setPicker(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', width: 80 },
  backIcon: { fontSize: 26, color: Colors.primary, marginRight: 2, lineHeight: 30 },
  backText: { fontSize: Typography.base, color: Colors.primary, fontWeight: Typography.medium },
  navTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },

  form: { padding: Spacing.base },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.base },
  loadingText: { fontSize: Typography.sm, color: Colors.textMuted },

  submitRow: { marginTop: Spacing.lg },
});

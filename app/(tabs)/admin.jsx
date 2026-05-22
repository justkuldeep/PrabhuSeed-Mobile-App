/**
 * Admin Panel Tab — SUPER_ADMIN only
 * Shows all users with role, status, and quick actions.
 * Navigates to /admin/create-user to add new users.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../services/authStore';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

const ROLE_META = {
  SUPER_ADMIN: { label: 'Super Admin',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    emoji: '🛡️' },
  OWNER:       { label: 'Owner',        color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',   emoji: '👑' },
  MANAGER:     { label: 'Manager',      color: Colors.info,      bg: 'rgba(59,130,246,0.12)',  emoji: '👔' },
  FIELD:       { label: 'Field Agent',  color: Colors.primary,   bg: 'rgba(34,197,94,0.12)',   emoji: '🌾' },
  ACCOUNTS:    { label: 'Accounts',     color: Colors.warning,   bg: 'rgba(245,158,11,0.12)',  emoji: '💼' },
};

const ROLE_FILTERS = ['ALL', 'SUPER_ADMIN', 'OWNER', 'MANAGER', 'FIELD', 'ACCOUNTS'];

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const isSuperAdmin = user?.role?.toUpperCase() === 'SUPER_ADMIN';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await usersAPI.list({ limit: 300 });
      setUsers(res.data || []);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load])
  );

  const filtered = roleFilter === 'ALL'
    ? users
    : users.filter((u) => u.role?.toUpperCase() === roleFilter);

  const countByRole = (role) => users.filter((u) => u.role?.toUpperCase() === role).length;
  const activeCount = users.filter((u) => u.is_active).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Admin Panel</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Loading…' : `${users.length} users · ${activeCount} active`}
          </Text>
        </View>
        {isSuperAdmin && (
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/admin/create-user')}
            activeOpacity={0.8}
          >
            <Text style={styles.createBtnText}>+ New User</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Stats row ── */}
      {!loading && (
        <View style={styles.statsRow}>
          {[
            { label: 'Owners',   count: countByRole('OWNER'),    color: '#8b5cf6' },
            { label: 'Managers', count: countByRole('MANAGER'),  color: Colors.info },
            { label: 'Field',    count: countByRole('FIELD'),    color: Colors.primary },
            { label: 'Accounts', count: countByRole('ACCOUNTS'), color: Colors.warning },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={[styles.statCount, { color: s.color }]}>{s.count}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Role filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {ROLE_FILTERS.map((r) => {
          const count = r === 'ALL' ? users.length : countByRole(r);
          return (
            <TouchableOpacity
              key={r}
              style={[styles.chip, roleFilter === r && styles.chipActive]}
              onPress={() => setRoleFilter(r)}
            >
              <Text style={[styles.chipText, roleFilter === r && styles.chipTextActive]}>
                {r === 'ALL' ? `All (${count})` : `${ROLE_META[r]?.label || r} (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── User list ── */}
      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading users…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>No users found</Text>
              <Text style={styles.emptyText}>
                Tap "+ New User" to create one.
              </Text>
            </View>
          ) : (
            filtered.map((u) => <UserCard key={u.id} user={u} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

function UserCard({ user: u }) {
  const meta = ROLE_META[u.role?.toUpperCase()] || ROLE_META.FIELD;
  const initials = (u.name || '?').charAt(0).toUpperCase();

  return (
    <View style={[styles.card, !u.is_active && styles.cardInactive]}>
      <View style={[styles.avatar, { backgroundColor: u.is_active ? meta.bg : 'rgba(100,116,139,0.12)' }]}>
        <Text style={[styles.avatarText, { color: u.is_active ? meta.color : Colors.textMuted }]}>
          {initials}
        </Text>
      </View>

      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, !u.is_active && styles.nameInactive]}>
            {u.name}{u.surname ? ` ${u.surname}` : ''}
          </Text>
          <View style={[styles.statusDot, { backgroundColor: u.is_active ? Colors.primary : Colors.error }]} />
        </View>

        <View style={styles.metaRow}>
          <View style={[styles.rolePill, { backgroundColor: meta.bg }]}>
            <Text style={[styles.roleText, { color: meta.color }]}>
              {meta.emoji} {meta.label}
            </Text>
          </View>
          {u.employee_id ? <Text style={styles.hq}>ID: {u.employee_id}</Text> : null}
          {u.hq ? <Text style={styles.hq}>{u.hq}</Text> : null}
          {u.state ? <Text style={styles.hq}>{u.state}</Text> : null}
        </View>

        {u.mobile ? <Text style={styles.mobile}>📱 {u.mobile}</Text> : null}
        {u.email ? <Text style={styles.email}>✉️ {u.email}</Text> : null}

        {!u.is_active && (
          <Text style={styles.inactiveLabel}>⛔ Deactivated</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },

  createBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  createBtnText: {
    color: Colors.textInverse,
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statCount: { fontSize: Typography.xl, fontWeight: Typography.bold },
  statLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },

  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primaryMuted, borderColor: Colors.primary },
  chipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: Colors.primary, fontWeight: '700' },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  loadingText: { fontSize: Typography.sm, color: Colors.textMuted },

  list: { padding: Spacing.base, gap: Spacing.md },

  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl },
  emptyIcon: { fontSize: 44, marginBottom: Spacing.md, opacity: 0.4 },
  emptyTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textSecondary, marginBottom: 4 },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInactive: { opacity: 0.6, borderColor: Colors.error, borderStyle: 'dashed' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: Typography.lg, fontWeight: Typography.bold },
  cardInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  name: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  nameInactive: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: 4 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  roleText: { fontSize: 11, fontWeight: '600' },
  hq: { fontSize: Typography.xs, color: Colors.textMuted },
  mobile: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 2 },
  email: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 2 },
  inactiveLabel: { fontSize: Typography.xs, color: Colors.error, marginTop: 2 },
});

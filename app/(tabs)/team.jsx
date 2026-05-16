/**
 * Team Screen — OWNER / MANAGER only
 * Shows all field agents with:
 *  - Active/Inactive status (is_active)
 *  - Current task workload
 *  - Toggle to activate/deactivate a user (OWNER only)
 *  - Live indicator if the agent is checked in today
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
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usersAPI } from '../../services/api';
import { useAuth } from '../../services/authStore';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

const ROLE_COLORS = {
  FIELD:    { color: Colors.primary,   bg: 'rgba(34,197,94,0.12)' },
  MANAGER:  { color: Colors.info,      bg: 'rgba(59,130,246,0.12)' },
  ACCOUNTS: { color: Colors.textMuted, bg: 'rgba(148,163,184,0.12)' },
};

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const role = user?.role?.toUpperCase();
  const isOwner = role === 'OWNER';

  const [members, setMembers] = useState([]);
  const [workload, setWorkload] = useState({}); // user_id -> active_tasks
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(null); // user_id being toggled
  const [filter, setFilter] = useState('all'); // all | active | inactive

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [usersRes, workloadRes] = await Promise.all([
        usersAPI.list({ limit: 200 }),          // all roles visible to manager/owner
        usersAPI.fieldWorkload(),               // active task counts for FIELD users
      ]);

      // Backend scopes by role:
      //   MANAGER → direct + indirect subordinates only
      //   OWNER   → all non-OWNER users
      setMembers(usersRes.data || []);

      // Build workload map
      const wmap = {};
      (workloadRes.data || []).forEach((u) => {
        wmap[u.id] = u.active_tasks;
      });
      setWorkload(wmap);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load team');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Toggle is_active ──────────────────────────────────────────────────────
  async function handleToggleActive(member) {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only Owners can activate or deactivate users.');
      return;
    }
    const action = member.is_active ? 'deactivate' : 'activate';
    Alert.alert(
      `${member.is_active ? 'Deactivate' : 'Activate'} User`,
      `${action === 'deactivate'
        ? `${member.name} will be unable to log in and will be hidden from task assignment and tracking.`
        : `${member.name} will be able to log in and appear in task assignment and tracking.`
      }\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'deactivate' ? 'Deactivate' : 'Activate',
          style: action === 'deactivate' ? 'destructive' : 'default',
          onPress: async () => {
            setToggling(member.id);
            try {
              await usersAPI.update(member.id, { is_active: !member.is_active });
              // Update local state immediately
              setMembers((prev) =>
                prev.map((m) =>
                  m.id === member.id ? { ...m, is_active: !m.is_active } : m
                )
              );
            } catch (err) {
              Alert.alert('Error', err.message);
            } finally {
              setToggling(null);
            }
          },
        },
      ]
    );
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = members.filter((m) => {
    if (filter === 'active') return m.is_active;
    if (filter === 'inactive') return !m.is_active;
    return true;
  });

  const activeCount = members.filter((m) => m.is_active).length;
  const inactiveCount = members.filter((m) => !m.is_active).length;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Team</Text>
          <Text style={styles.headerSub}>
            {loading ? 'Loading…' : `${activeCount} active · ${inactiveCount} inactive`}
          </Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {[
          { key: 'all',      label: `All (${members.length})` },
          { key: 'active',   label: `🟢 Active (${activeCount})` },
          { key: 'inactive', label: `🔴 Inactive (${inactiveCount})` },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading team…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
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
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No team members found</Text>
            </View>
          ) : (
            filtered.map((member) => {
              const rc = ROLE_COLORS[member.role] || ROLE_COLORS.FIELD;
              const activeTasks = workload[member.id] ?? 0;
              const isToggling = toggling === member.id;

              return (
                <View
                  key={member.id}
                  style={[
                    styles.card,
                    !member.is_active && styles.cardInactive,
                  ]}
                >
                  {/* Avatar + info */}
                  <View style={styles.cardLeft}>
                    <View style={[styles.avatar, { backgroundColor: member.is_active ? rc.bg : 'rgba(148,163,184,0.1)' }]}>
                      <Text style={[styles.avatarText, { color: member.is_active ? rc.color : Colors.textMuted }]}>
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.info}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.name, !member.is_active && styles.nameInactive]}>
                          {member.name}
                        </Text>
                        {/* Active status dot */}
                        <View style={[styles.statusDot, { backgroundColor: member.is_active ? Colors.primary : Colors.error }]} />
                      </View>
                      <View style={styles.metaRow}>
                        <View style={[styles.rolePill, { backgroundColor: rc.bg }]}>
                          <Text style={[styles.roleText, { color: rc.color }]}>
                            {member.role}
                          </Text>
                        </View>
                        {member.hq ? (
                          <Text style={styles.hq}>{member.hq}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.mobile}>📱 {member.mobile}</Text>
                      {/* Task workload */}
                      {member.role === 'FIELD' && member.is_active && (
                        <View style={styles.workloadRow}>
                          <View style={[
                            styles.workloadBadge,
                            activeTasks === 0
                              ? styles.workloadFree
                              : activeTasks <= 2
                              ? styles.workloadMid
                              : styles.workloadBusy,
                          ]}>
                            <Text style={[
                              styles.workloadText,
                              activeTasks === 0
                                ? styles.workloadFreeText
                                : activeTasks <= 2
                                ? styles.workloadMidText
                                : styles.workloadBusyText,
                            ]}>
                              {activeTasks === 0
                                ? '✓ No active tasks'
                                : `${activeTasks} active task${activeTasks > 1 ? 's' : ''}`}
                            </Text>
                          </View>
                        </View>
                      )}
                      {!member.is_active && (
                        <Text style={styles.inactiveLabel}>⛔ Account deactivated</Text>
                      )}
                    </View>
                  </View>

                  {/* Toggle switch — Owner only */}
                  {isOwner && (
                    <View style={styles.toggleContainer}>
                      {isToggling ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <Switch
                          value={member.is_active}
                          onValueChange={() => handleToggleActive(member)}
                          trackColor={{ false: 'rgba(239,68,68,0.3)', true: 'rgba(34,197,94,0.3)' }}
                          thumbColor={member.is_active ? Colors.primary : Colors.error}
                        />
                      )}
                      <Text style={[styles.toggleLabel, { color: member.is_active ? Colors.primary : Colors.error }]}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  )}

                  {/* Manager: read-only status indicator */}
                  {!isOwner && (
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusDotLg, { backgroundColor: member.is_active ? Colors.primary : Colors.error }]} />
                      <Text style={[styles.statusLabel, { color: member.is_active ? Colors.primary : Colors.error }]}>
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  headerSub: { fontSize: Typography.xs, color: Colors.textMuted, marginTop: 2 },
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
  emptyIcon: { fontSize: 40, marginBottom: Spacing.md, opacity: 0.4 },
  emptyText: { fontSize: Typography.sm, color: Colors.textMuted },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInactive: {
    opacity: 0.65,
    borderColor: Colors.error,
    borderStyle: 'dashed',
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: { fontSize: Typography.lg, fontWeight: '700' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 4 },
  name: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  nameInactive: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  roleText: { fontSize: 11, fontWeight: '600' },
  hq: { fontSize: Typography.xs, color: Colors.textMuted },
  mobile: { fontSize: Typography.xs, color: Colors.textMuted, marginBottom: 4 },
  workloadRow: { marginTop: 2 },
  workloadBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  workloadFree: { backgroundColor: 'rgba(34,197,94,0.12)' },
  workloadMid: { backgroundColor: 'rgba(245,158,11,0.12)' },
  workloadBusy: { backgroundColor: 'rgba(239,68,68,0.12)' },
  workloadText: { fontSize: 11, fontWeight: '600' },
  workloadFreeText: { color: '#16a34a' },
  workloadMidText: { color: '#ca8a04' },
  workloadBusyText: { color: '#dc2626' },
  inactiveLabel: { fontSize: Typography.xs, color: Colors.error, marginTop: 2 },
  // Toggle (Owner)
  toggleContainer: { alignItems: 'center', gap: 4, minWidth: 60 },
  toggleLabel: { fontSize: 10, fontWeight: '600' },
  // Status badge (Manager)
  statusBadge: { alignItems: 'center', gap: 4 },
  statusDotLg: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 10, fontWeight: '600' },
});

/**
 * Home Dashboard Screen
 * Shows KPIs, recent tasks, quick actions
 */
import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../services/authStore';
import { useDashboard } from '../../hooks/useDashboard';
import { useTasks } from '../../hooks/useTasks';
import KPICard from '../../components/dashboard/KPICard';
import TaskCard from '../../components/tasks/TaskCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { USER_ROLES } from '../../constants';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data: dashData, loading: dashLoading, fetchDashboard } = useDashboard();
  const { tasks, loading: tasksLoading, fetchTasks } = useTasks();

  const load = useCallback(() => {
    fetchDashboard();
    fetchTasks({ limit: 5 });
  }, [fetchDashboard, fetchTasks]);

  useEffect(() => {
    load();
  }, [load]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isManager = user?.role === 'SUPER_ADMIN' || user?.role === 'OWNER' || user?.role === 'MANAGER';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.base, paddingBottom: insets.bottom + 120 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={dashLoading || tasksLoading}
          onRefresh={load}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
    >
      {/* Header */}
      <LinearGradient
        colors={['#0f2a1a', Colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'Agent'} 👋</Text>
            <Text style={styles.userRole}>
              {USER_ROLES[user?.role] || user?.role}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/(tabs)/notifications')}
          >
            <Text style={styles.notifIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* KPI Grid */}
      <Text style={styles.sectionTitle}>Overview</Text>
      {dashLoading && !dashData ? (
        <LoadingSpinner message="Loading dashboard..." />
      ) : (
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <KPICard
              label="Total Tasks"
              value={dashData?.total_tasks ?? tasks.length}
              icon="📋"
              color={Colors.info}
            />
            <View style={styles.kpiGap} />
            <KPICard
              label="Pending"
              value={dashData?.pending_tasks ?? tasks.filter((t) => t.status === 'pending').length}
              icon="⏳"
              color={Colors.warning}
            />
          </View>
          <View style={[styles.kpiRow, { marginTop: Spacing.md }]}>
            <KPICard
              label="Completed"
              value={dashData?.completed_tasks ?? tasks.filter((t) => t.status === 'completed').length}
              icon="✅"
              color={Colors.primary}
            />
            <View style={styles.kpiGap} />
            <KPICard
              label="Efficiency"
              value={
                dashData?.efficiency != null
                  ? `${dashData.efficiency}%`
                  : '—'
              }
              icon="📈"
              color={Colors.primaryLight}
            />
          </View>
        </View>
      )}

      {/* Quick Actions (manager/owner only) */}
      {isManager && (
        <>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/tasks/create')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#16a34a', '#22c55e']}
                style={styles.actionGradient}
              >
                <Text style={styles.actionIcon}>➕</Text>
                <Text style={styles.actionLabel}>New Task</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/tasks')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionGradient, { backgroundColor: Colors.surface }]}>
                <Text style={styles.actionIcon}>📋</Text>
                <Text style={styles.actionLabel}>All Tasks</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/attendance')}
              activeOpacity={0.8}
            >
              <View style={[styles.actionGradient, { backgroundColor: Colors.surface }]}>
                <Text style={styles.actionIcon}>📍</Text>
                <Text style={styles.actionLabel}>Attendance</Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Recent Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Tasks</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
          <Text style={styles.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {tasksLoading && tasks.length === 0 ? (
        <LoadingSpinner message="Loading tasks..." />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyTasks}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No tasks assigned yet</Text>
        </View>
      ) : (
        tasks.slice(0, 5).map((task) => (
          <TaskCard key={task.id} task={task} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: Spacing.base,
  },
  headerGradient: {
    marginHorizontal: -Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  userName: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  userRole: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.medium,
    marginTop: 2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  seeAll: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.medium,
  },
  kpiGrid: {
    marginBottom: Spacing.base,
  },
  kpiRow: {
    flexDirection: 'row',
  },
  kpiGap: {
    width: Spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  actionCard: {
    flex: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  actionGradient: {
    padding: Spacing.base,
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  emptyTasks: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
});

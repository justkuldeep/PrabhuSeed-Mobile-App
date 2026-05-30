/**
 * Tasks List Screen
 * FlatList with search, status filter, empty/loading states
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../services/authStore';
import TaskCard from '../../components/tasks/TaskCard';
import EmptyState from '../../components/ui/EmptyState';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

const STATUS_FILTERS = [
  { key: null, label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { tasks, meta, loading, error, fetchTasks } = useTasks();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const searchTimer = useRef(null);

  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const load = useCallback(
    (params = {}) => {
      fetchTasks({
        limit: 100,
        status: statusFilter || undefined,
        search: search || undefined,
        ...params,
      });
    },
    [fetchTasks, statusFilter, search],
  );

  useEffect(() => {
    load();
  }, [statusFilter]);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      load({ search: search || undefined });
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchTasks({ limit: 100, status: statusFilter || undefined });
    setRefreshing(false);
  }

  const renderTask = ({ item }) => <TaskCard task={item} />;

  const renderHeader = () => (
    <View>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search tasks..."
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status filter chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.key)}
            onPress={() => setStatusFilter(f.key)}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === f.key && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Meta summary */}
      {meta.total > 0 && (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{meta.total} tasks</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{meta.pending} pending</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={[styles.metaText, { color: Colors.primary }]}>
            {meta.efficiency}% efficiency
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Screen header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} found
          </Text>
        </View>
        {isManager && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/tasks/create')}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error state */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {error}</Text>
          <TouchableOpacity onPress={() => load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Task list */}
      {loading && tasks.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading tasks...</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTask}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              icon={<Text style={{ fontSize: 48 }}>📭</Text>}
              title="No tasks found"
              subtitle={
                search || statusFilter
                  ? 'Try adjusting your filters'
                  : 'Tasks assigned to you will appear here'
              }
              actionLabel={isManager ? 'Create Task' : undefined}
              onAction={isManager ? () => router.push('/tasks/create') : undefined}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  addBtnText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textInverse,
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.errorMuted,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    flex: 1,
  },
  retryText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.semibold,
    marginLeft: Spacing.sm,
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  clearBtn: {
    padding: Spacing.xs,
  },
  clearIcon: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: Typography.semibold,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  metaText: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  metaDot: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});

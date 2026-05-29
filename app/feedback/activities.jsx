/**
 * Activity Listing Screen — per department
 * Route: /feedback/activities?dept=Production
 */
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { activityTypesAPI } from '../../services/api';

const DEPT_CONFIG = {
  Marketing:  { emoji: '📢', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)' },
  Production: { emoji: '🌾', color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)' },
  'R&D':      { emoji: '🔬', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
  Processing: { emoji: '⚙️', color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)' },
};

const ActivityCard = memo(function ActivityCard({ item, dept, onPress }) {
  const cfg = DEPT_CONFIG[dept] || DEPT_CONFIG.Production;
  const hasNumber = item.activity_number != null;

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: cfg.border }]}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.cardLeft}>
        {hasNumber && (
          <View style={[styles.numBadge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.numText, { color: cfg.color }]}>{item.activity_number}</Text>
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        </View>
      </View>
      <View style={[styles.goBtn, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.goText, { color: cfg.color }]}>→</Text>
      </View>
    </TouchableOpacity>
  );
});


function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={[styles.skeletonLine, { width: 32, height: 32, borderRadius: Radius.sm, marginRight: Spacing.sm }]} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skeletonLine, { height: 14, width: '70%' }]} />
        <View style={[styles.skeletonLine, { height: 10, width: '30%' }]} />
      </View>
    </View>
  );
}

export default function ActivitiesScreen() {
  const { dept } = useLocalSearchParams();
  const router = useRouter();
  const cfg = DEPT_CONFIG[dept] || DEPT_CONFIG.Production;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const fetchActivities = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await activityTypesAPI.list({ department: dept });
      const seen = new Set();
      const unique = (res.data || []).filter((a) => {
        if (seen.has(a.name)) return false;
        seen.add(a.name);
        return true;
      });
      setActivities(unique);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dept]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  const filtered = useMemo(() => {
    if (!search.trim()) return activities;
    const q = search.toLowerCase();
    return activities.filter((a) => a.name.toLowerCase().includes(q));
  }, [activities, search]);


  const handlePress = useCallback((activity) => {
    router.push(
      `/feedback/${activity.id}?name=${encodeURIComponent(activity.name)}&dept=${encodeURIComponent(dept || '')}`
    );
  }, [router, dept]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: cfg.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={[styles.deptIcon, { backgroundColor: cfg.bg }]}>
          <Text style={styles.deptEmoji}>{cfg.emoji}</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.deptName, { color: cfg.color }]}>{dept}</Text>
          <Text style={styles.headerSub}>{activities.length} activities</Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { borderColor: cfg.border }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search activities…"
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.skeletonList}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: cfg.color }]} onPress={() => fetchActivities()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={{ fontSize: 40 }}>{cfg.emoji}</Text>
          <Text style={styles.emptyTitle}>No activities found</Text>
          {search ? <Text style={styles.emptyText}>Try a different search term</Text> : null}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ActivityCard item={item} dept={dept} onPress={handlePress} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchActivities(true); }}
              tintColor={cfg.color}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 18,
    color: Colors.textPrimary,
  },
  deptIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deptEmoji: { fontSize: 20 },
  headerInfo: { flex: 1 },
  deptName: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Search
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    margin: Spacing.base,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
  },
  searchIcon: { fontSize: 15, marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  searchClear: {
    color: Colors.textMuted,
    fontSize: 14,
    paddingLeft: Spacing.sm,
  },

  // Sections
  listContent: { padding: Spacing.base, paddingBottom: Spacing.xxl },

  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  numBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  numText: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  goBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
    flexShrink: 0,
  },
  goText: {
    fontSize: 16,
    fontWeight: Typography.bold,
  },

  // Skeleton
  skeletonList: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  skeletonCard: {
    borderColor: Colors.border,
    opacity: 0.5,
  },
  skeletonLine: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
  },

  // Center states
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.base,
  },
  errorIcon: { fontSize: 40 },
  errorText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    textAlign: 'center',
  },
  retryBtn: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    color: '#fff',
    fontWeight: Typography.bold,
    fontSize: Typography.base,
  },
  emptyTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
});

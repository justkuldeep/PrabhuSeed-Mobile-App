/**
 * Department Dashboard — Field Data Entry Module
 * Shows 4 department cards. Tap to browse activities.
 */
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Colors, Spacing, Typography, Radius, Shadows } from '../../constants/theme';
import { activityTypesAPI, feedbackAPI } from '../../services/api';
import { useOfflineQueue } from '../../hooks/useFeedback';
import { useAuth } from '../../services/authStore';

const DEPT_CONFIG = {
  Marketing: {
    emoji: '📢',
    color: '#3b82f6',
    gradient: ['#1e40af', '#3b82f6'],
    bg: 'rgba(59,130,246,0.12)',
    border: 'rgba(59,130,246,0.3)',
    desc: 'Campaigns, meetings, dealer visits',
  },
  Production: {
    emoji: '🌾',
    color: '#22c55e',
    gradient: ['#166534', '#22c55e'],
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.3)',
    desc: 'Seed distribution, field visits, harvesting',
  },
  'R&D': {
    emoji: '🔬',
    color: '#f59e0b',
    gradient: ['#92400e', '#f59e0b'],
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.3)',
    desc: 'Nursery, trials, GOT, threshing',
  },
  Processing: {
    emoji: '⚙️',
    color: '#ef4444',
    gradient: ['#7f1d1d', '#ef4444'],
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
    desc: 'Licensing, intake, processing register',
  },
};

const DepartmentCard = memo(function DepartmentCard({ dept, onPress }) {
  const cfg = DEPT_CONFIG[dept.name] || {
    emoji: '📋',
    color: Colors.primary,
    bg: Colors.primaryMuted,
    border: 'rgba(34,197,94,0.3)',
    desc: '',
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: cfg.border, backgroundColor: cfg.bg }]}
      onPress={() => onPress(dept.name)}
      activeOpacity={0.75}
    >
      <View style={styles.cardTop}>
        <View style={[styles.emojiWrap, { backgroundColor: cfg.bg }]}>
          <Text style={styles.emoji}>{cfg.emoji}</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: cfg.color }]}>
          <Text style={styles.countText}>{dept.activity_count}</Text>
          <Text style={styles.countLabel}> activities</Text>
        </View>
      </View>
      <Text style={[styles.deptName, { color: cfg.color }]}>{dept.name}</Text>
      <Text style={styles.deptDesc} numberOfLines={2}>{cfg.desc || 'Field data collection activities'}</Text>
      <View style={[styles.cardArrow, { backgroundColor: cfg.bg }]}>
        <Text style={[styles.cardArrowText, { color: cfg.color }]}>View Activities →</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function DepartmentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { queueCount, sync, syncing, refreshCount } = useOfflineQueue();

  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const fetchDepts = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await activityTypesAPI.departments();
      setDepartments(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDepts();
    refreshCount();
  }, [fetchDepts, refreshCount]);

  const handlePress = useCallback((deptName) => {
    router.push(`/feedback/activities?dept=${encodeURIComponent(deptName)}`);
  }, [router]);

  const handleDownloadCSV = useCallback(async () => {
    setDownloading(true);
    try {
      const res = await feedbackAPI.exportTodayCSV();
      const csvContent = typeof res.data === 'string' ? res.data : String(res.data);

      if (!csvContent || csvContent.trim().split('\n').length <= 1) {
        Alert.alert('No Data', "You haven't submitted any feedback forms today.");
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const fileName = `field_data_${today}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: `Field Data — ${today}`,
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Saved', `CSV saved to:\n${fileUri}`);
      }
    } catch (err) {
      Alert.alert('Download Failed', err.message || 'Could not download CSV.');
    } finally {
      setDownloading(false);
    }
  }, []);

  const renderItem = useCallback(({ item }) => (
    <DepartmentCard dept={item} onPress={handlePress} />
  ), [handlePress]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Field Data Entry</Text>
          <Text style={styles.subtitle}>Select department to begin</Text>
        </View>
        <View style={styles.headerActions}>
          {queueCount > 0 && (
            <TouchableOpacity style={styles.syncChip} onPress={sync} disabled={syncing}>
              <Text style={styles.syncChipText}>
                {syncing ? '⟳ Syncing…' : `⬆ ${queueCount} pending`}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.csvBtn, downloading && styles.csvBtnDisabled]}
            onPress={handleDownloadCSV}
            disabled={downloading}
            activeOpacity={0.75}
          >
            <Text style={styles.csvBtnText}>
              {downloading ? '⏳' : '⬇ CSV'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Agent name strip */}
      {user?.name && (
        <View style={styles.agentStrip}>
          <Text style={styles.agentText}>👤 {user.name}</Text>
          {user?.department && (
            <View style={[styles.agentDeptBadge, { backgroundColor: (DEPT_CONFIG[user.department] || {}).bg || Colors.primaryMuted }]}>
              <Text style={[styles.agentDeptText, { color: (DEPT_CONFIG[user.department] || {}).color || Colors.primary }]}>
                {user.department}
              </Text>
            </View>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading departments…</Text>
        </View>
      ) : error ? (
        <View style={styles.centerWrap}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDepts()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={departments}
          keyExtractor={(d) => d.name}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchDepts(true); refreshCount(); }}
              tintColor={Colors.primary}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.xxl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  syncChip: {
    backgroundColor: Colors.warningMuted,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  syncChipText: {
    fontSize: Typography.xs,
    color: Colors.warning,
    fontWeight: Typography.semibold,
  },
  csvBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
  },
  csvBtnDisabled: {
    opacity: 0.5,
  },
  csvBtnText: {
    fontSize: Typography.xs,
    color: Colors.textInverse,
    fontWeight: Typography.semibold,
  },
  agentStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  agentText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  agentDeptBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  agentDeptText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
  },
  list: {
    padding: Spacing.base,
    gap: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.base,
    ...Shadows.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  emojiWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 26 },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  countText: {
    fontSize: Typography.base,
    fontWeight: Typography.bold,
    color: '#fff',
  },
  countLabel: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  deptName: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    marginBottom: 4,
  },
  deptDesc: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  cardArrow: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  cardArrowText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
  },
  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
    gap: Spacing.base,
  },
  loadingText: {
    color: Colors.textMuted,
    fontSize: Typography.sm,
  },
  errorIcon: { fontSize: 40 },
  errorText: {
    color: Colors.textSecondary,
    fontSize: Typography.base,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
  },
  retryText: {
    color: Colors.textInverse,
    fontWeight: Typography.bold,
    fontSize: Typography.base,
  },
});

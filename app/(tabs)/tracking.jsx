/**
 * Live Tracking Screen — OWNER / MANAGER only
 * Shows all checked-in field agents on a Google Map with real-time position updates.
 * Polls the backend every 30 seconds.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trackingAPI } from '../../services/api';
import { useAuth } from '../../services/authStore';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

const POLL_INTERVAL_MS = 30_000;

// India center as default region
const INDIA_REGION = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 15,
  longitudeDelta: 15,
};

// Distinct colors for each agent marker
const AGENT_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

export default function TrackingScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const mapRef = useRef(null);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLive = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await trackingAPI.getLive();
      const list = res.data?.employees || [];
      setEmployees(list);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.message || 'Failed to load tracking data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLive();
  }, [fetchLive]);

  // Poll every 30s
  useEffect(() => {
    const timer = setInterval(() => fetchLive(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchLive]);

  // Fit map to show all agents when list changes
  useEffect(() => {
    if (employees.length > 0 && mapRef.current) {
      const coords = employees
        .filter((e) => e.lat !== 0 && e.lng !== 0)
        .map((e) => ({ latitude: e.lat, longitude: e.lng }));
      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 40, bottom: 220, left: 40 },
          animated: true,
        });
      }
    }
  }, [employees]);

  function focusAgent(agent) {
    setSelectedAgent(agent);
    if (agent.lat !== 0 && agent.lng !== 0 && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: agent.lat,
          longitude: agent.lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        },
        500,
      );
    }
  }

  function formatLastSeen(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    const now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  const activeCount = employees.filter((e) => e.lat !== 0 && e.lng !== 0).length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <Text style={styles.headerSub}>
            {loading
              ? 'Loading…'
              : `${activeCount} agent${activeCount !== 1 ? 's' : ''} active · Updated ${
                  lastUpdated
                    ? lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : '—'
                }`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchLive()}
          disabled={loading}
        >
          <Text style={styles.refreshIcon}>{loading ? '⏳' : '🔄'}</Text>
        </TouchableOpacity>
      </View>

      {/* Map — fixed height */}
      <View style={styles.mapContainer}>
        {loading && employees.length === 0 ? (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.mapLoadingText}>Loading map…</Text>
          </View>
        ) : error ? (
          <View style={styles.mapLoading}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchLive()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={INDIA_REGION}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass
            showsScale
            toolbarEnabled={false}
          >
            {employees.map((agent, idx) => {
              if (agent.lat === 0 && agent.lng === 0) return null;
              const color = AGENT_COLORS[idx % AGENT_COLORS.length];
              const isSelected = selectedAgent?.user_id === agent.user_id;
              return (
                <Marker
                  key={agent.user_id}
                  coordinate={{ latitude: agent.lat, longitude: agent.lng }}
                  onPress={() => focusAgent(agent)}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[styles.markerBubble, { backgroundColor: color }, isSelected && styles.markerBubbleSelected]}>
                    <Text style={styles.markerInitial}>
                      {agent.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Callout tooltip>
                    <View style={styles.callout}>
                      <Text style={styles.calloutName}>{agent.name}</Text>
                      <Text style={styles.calloutDept}>{agent.department}</Text>
                      <Text style={styles.calloutTime}>
                        📍 {formatLastSeen(agent.last_seen)}
                      </Text>
                      {agent.state && agent.state !== '—' && (
                        <Text style={styles.calloutState}>{agent.state}</Text>
                      )}
                    </View>
                  </Callout>
                </Marker>
              );
            })}
          </MapView>
        )}

        {!loading && !error && employees.length === 0 && (
          <View style={styles.noAgentsOverlay}>
            <Text style={styles.noAgentsIcon}>🗺️</Text>
            <Text style={styles.noAgentsText}>No agents checked in</Text>
            <Text style={styles.noAgentsSubtext}>
              Field agents will appear here once they check in
            </Text>
          </View>
        )}
      </View>

      {/* Agent list panel — flex:1 so it fills remaining space and scrolls */}
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>
          Field Agents ({employees.length})
        </Text>
        <ScrollView
          style={styles.agentScroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchLive(); }}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {employees.length === 0 && !loading ? (
            <Text style={styles.emptyList}>No agents checked in today</Text>
          ) : (
            employees.map((agent, idx) => {
              const color = AGENT_COLORS[idx % AGENT_COLORS.length];
              const isSelected = selectedAgent?.user_id === agent.user_id;
              const hasLocation = agent.lat !== 0 && agent.lng !== 0;
              return (
                <TouchableOpacity
                  key={agent.user_id}
                  style={[styles.agentRow, isSelected && styles.agentRowSelected]}
                  onPress={() => focusAgent(agent)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.agentAvatar, { backgroundColor: color }]}>
                    <Text style={styles.agentAvatarText}>
                      {agent.name?.charAt(0)?.toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.agentInfo}>
                    <Text style={styles.agentName}>{agent.name}</Text>
                    <Text style={styles.agentMeta}>
                      {agent.department}
                      {agent.state && agent.state !== '—' ? ` · ${agent.state}` : ''}
                    </Text>
                  </View>
                  <View style={styles.agentStatus}>
                    <View style={[styles.statusDot, { backgroundColor: hasLocation ? Colors.primary : Colors.warning }]} />
                    <Text style={styles.agentTime}>
                      {hasLocation ? formatLastSeen(agent.last_seen) : 'No GPS'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
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
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  refreshIcon: {
    fontSize: 18,
  },
  mapContainer: {
    height: 300,          // fixed height — panel below gets all remaining space
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  mapLoadingText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
  },
  errorIcon: {
    fontSize: 36,
  },
  errorText: {
    fontSize: Typography.sm,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  retryBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryText: {
    color: '#fff',
    fontWeight: Typography.semibold,
    fontSize: Typography.sm,
  },
  noAgentsOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  noAgentsIcon: {
    fontSize: 40,
    marginBottom: Spacing.md,
    opacity: 0.5,
  },
  noAgentsText: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.textSecondary,
  },
  noAgentsSubtext: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  // Marker
  markerBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  markerBubbleSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#fff',
  },
  markerInitial: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  callout: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minWidth: 140,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutName: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  calloutDept: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  calloutTime: {
    fontSize: Typography.xs,
    color: Colors.primary,
    marginTop: 4,
  },
  calloutState: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  // Panel
  panel: {
    flex: 1,                  // takes all space below the map
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  agentScroll: {
    flex: 1,                  // ScrollView must have flex:1 to scroll properly on Android
  },
  panelTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  emptyList: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
  },
  agentRowSelected: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: Radius.md,
    borderBottomColor: 'transparent',
  },
  agentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  agentAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: Typography.base,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  agentMeta: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  agentStatus: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  agentTime: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});

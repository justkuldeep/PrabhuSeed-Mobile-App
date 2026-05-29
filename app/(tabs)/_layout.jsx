/**
 * Tabs layout — CLASS COMPONENT intentionally.
 *
 * On Android with New Architecture (Bridgeless Fabric), Expo Router may wrap
 * layouts in Suspense boundaries. During Suspense retries React's dispatcher
 * can be null, crashing every hook (useState, useEffect, useContext).
 * Class components bypass the dispatcher entirely.
 *
 * Pattern:
 *  - Outer TabsLayout (class) → reads AuthContext via Consumer (no hooks)
 *  - Inner TabsLayoutInner (class) → manages queue count via setState
 */
import React from 'react';
import { Tabs, router } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../../services/authStore';
import { Colors, Typography } from '../../constants/theme';

const QUEUE_KEY = 'feedback_offline_queue';

// ─── Tab icon ─────────────────────────────────────────────────────────────────

function TabIcon({ emoji, label, focused, badge }) {
  return (
    <View style={styles.tabItem}>
      <View>
        <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
        {badge != null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

// ─── Inner tabs renderer (class, no hooks) ────────────────────────────────────

class TabsLayoutInner extends React.Component {
  constructor(props) {
    super(props);
    this.state = { queueCount: 0 };
    this._refreshQueueCount = this._refreshQueueCount.bind(this);
  }

  componentDidMount() {
    this._checkAuth();
    this._refreshQueueCount();
  }

  componentDidUpdate(prevProps) {
    this._checkAuth(prevProps);
  }

  _checkAuth(prevProps = {}) {
    const { loading, isAuthenticated } = this.props;
    const authChanged =
      prevProps.loading !== loading ||
      prevProps.isAuthenticated !== isAuthenticated;
    if ((authChanged || !prevProps) && !loading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }

  async _refreshQueueCount() {
    try {
      const raw = await AsyncStorage.getItem(QUEUE_KEY);
      const queue = raw ? JSON.parse(raw) : [];
      this.setState({ queueCount: queue.length });
    } catch {
      // AsyncStorage unavailable — keep count at 0
    }
  }

  render() {
    const { isAuthenticated, user } = this.props;
    const { queueCount } = this.state;

    if (!isAuthenticated) return null;

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isManager =
      user?.role === 'SUPER_ADMIN' ||
      user?.role === 'OWNER' ||
      user?.role === 'MANAGER';

    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarShowLabel: false,
          tabBarActiveTintColor: Colors.tabActive,
          tabBarInactiveTintColor: Colors.tabInactive,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🏠" label="Home" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="✅" label="Tasks" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="feedback"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon
                emoji="📝"
                label="Field"
                focused={focused}
                badge={queueCount > 0 ? queueCount : null}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="attendance"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="📍" label="Attend" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="tracking"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🗺️" label="Track" focused={focused} />
            ),
            tabBarButton: isManager ? undefined : () => null,
            tabBarItemStyle: isManager ? undefined : { display: 'none', width: 0 },
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="👥" label="Team" focused={focused} />
            ),
            tabBarButton: isManager ? undefined : () => null,
            tabBarItemStyle: isManager ? undefined : { display: 'none', width: 0 },
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="⚙️" label="Admin" focused={focused} />
            ),
            tabBarButton: isSuperAdmin ? undefined : () => null,
            tabBarItemStyle: isSuperAdmin ? undefined : { display: 'none', width: 0 },
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="🔔" label="Alerts" focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            tabBarIcon: ({ focused }) => (
              <TabIcon emoji="👤" label="Profile" focused={focused} />
            ),
          }}
        />
      </Tabs>
    );
  }
}

// ─── Outer class — reads AuthContext via Consumer (zero hooks) ────────────────

export default class TabsLayout extends React.Component {
  render() {
    return (
      <AuthContext.Consumer>
        {({ isAuthenticated, loading, user }) => (
          <TabsLayoutInner
            isAuthenticated={isAuthenticated}
            loading={loading}
            user={user}
          />
        )}
      </AuthContext.Consumer>
    );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.tabInactive,
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.tabActive,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
});

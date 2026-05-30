import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import NavigationReady from '../../services/navigationReady';

/**
 * Feedback tab entry point — class component, zero hooks.
 *
 * Uses NavigationReady.whenReady() to guarantee the Expo Router
 * navigation container is fully mounted before navigating.
 * Never navigates during render or before Root Layout mounts.
 */
export default class FeedbackTab extends React.Component {
  componentDidMount() {
    // Only navigate after Root Layout has called NavigationReady.setReady()
    NavigationReady.whenReady(() => {
      router.replace('/feedback');
    });
  }

  render() {
    return <View />;
  }
}

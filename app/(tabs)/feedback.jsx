import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

/**
 * Feedback tab entry point — class component, zero hooks.
 *
 * Navigation is deferred via setTimeout(0) so it runs AFTER
 * the current call stack (navigation container fully mounted).
 * Calling router.replace() synchronously in componentDidMount
 * triggers "Attempted to navigate before mounting Root Layout".
 */
export default class FeedbackTab extends React.Component {
  componentDidMount() {
    // Defer to next tick — Root Layout must be fully mounted first
    setTimeout(() => {
      router.replace('/feedback');
    }, 0);
  }

  render() {
    // Return an empty view — redirect happens after mount
    return <View />;
  }
}

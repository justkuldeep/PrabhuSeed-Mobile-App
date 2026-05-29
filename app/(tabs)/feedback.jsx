import React from 'react';
import { router } from 'expo-router';

/**
 * Feedback tab entry point.
 * Class component + static router.replace (no hooks) to avoid
 * New Architecture null-dispatcher crash with <Redirect> / useRouter().
 */
export default class FeedbackTab extends React.Component {
  componentDidMount() {
    router.replace('/feedback');
  }
  render() {
    return null;
  }
}

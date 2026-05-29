import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default class FeedbackLayout extends React.Component {
  render() {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="activities" />
        <Stack.Screen name="[activityId]" />
      </Stack>
    );
  }
}

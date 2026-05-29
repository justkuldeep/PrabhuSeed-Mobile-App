import React from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default class AdminLayout extends React.Component {
  render() {
    return (
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="create-user" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
      </Stack>
    );
  }
}

import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { View, Text } from 'react-native';

export const Route = createRoute('/about', {
  component: AboutPage,
});

function AboutPage() {
  return (
    <View>
      <Text>about</Text>
    </View>
  );
}

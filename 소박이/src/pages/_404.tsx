import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createRoute } from '@granite-js/react-native';

export const Route = createRoute('/_404', {
  validateParams: (params) => params,
  component: NotFoundScreen,
});

function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>404</Text>
      <Text style={styles.message}>페이지를 찾을 수 없어요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#999',
  },
  message: {
    fontSize: 16,
    marginTop: 8,
    color: '#aaa',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createRoute } from '@granite-js/react-native';

// `_404` is the framework's catch-all fallback, resolved at runtime via the
// _404.tsx file convention. Granite's generated router types (router.gen.ts)
// intentionally omit it from RegisterScreenInput, so the typed createRoute
// overload can't accept the path. Suppress the known mismatch rather than
// casting generated types — the runtime export stays unchanged.
// @ts-expect-error -- '/_404' is a special route absent from the generated registry
export const Route = createRoute('/_404', {
  validateParams: (params: Record<string, unknown>) => params,
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

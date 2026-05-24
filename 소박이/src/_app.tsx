import { AppsInToss } from '@apps-in-toss/framework';
import { InitialProps } from '@granite-js/react-native';
import { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { context } from '../require.context';
import { useAppInit } from './hooks/useAppInit';

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  // App-init / AppState lifecycle lives on the always-mounted root container.
  // AppContainer wraps every screen as `children` and never unmounts on
  // navigation, so the foreground visit-date refresh and one-time hydration
  // stay alive regardless of which screen is active. The module-level
  // `appInitialized` guard keeps the heavy init from running more than once.
  useAppInit();
  return <View style={{ flex: 1, backgroundColor: '#FAF6EE' }}>{children}</View>;
}

export default AppsInToss.registerApp(AppContainer, { context });

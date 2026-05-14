import { AppsInToss } from '@apps-in-toss/framework';
import { InitialProps } from '@granite-js/react-native';
import { PropsWithChildren } from 'react';
import { View } from 'react-native';
import { context } from '../require.context';

function AppContainer({ children }: PropsWithChildren<InitialProps>) {
  return <View style={{ flex: 1, backgroundColor: '#FAF6EE' }}>{children}</View>;
}

export default AppsInToss.registerApp(AppContainer, { context });

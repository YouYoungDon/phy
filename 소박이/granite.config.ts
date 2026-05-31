import { appsInToss } from '@apps-in-toss/framework/plugins';
import { router } from '@granite-js/plugin-router';
import { defineConfig } from '@granite-js/react-native/config';

export default defineConfig({
  appName: 'pockeksobak',
  scheme: 'intoss',
  plugins: [
    router(),
    appsInToss({
      brand: {
        displayName: '소박이',
        primaryColor: '#6B7C4A',
        icon: 'https://static.toss.im/appsintoss/33565/c393e5d1-4648-47cd-8b44-41b43102f890.png',
      },
      permissions: [],
    }),
  ],
});

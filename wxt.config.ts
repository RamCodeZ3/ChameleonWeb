import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'ChameleonWeb',
    description: 'Extract and preview color palettes on any website',
    permissions: ['activeTab'],
  },
  webExt: {
    chromiumBinary: '/usr/bin/brave-browser',
  },
});

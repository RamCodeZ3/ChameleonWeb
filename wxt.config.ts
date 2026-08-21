import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
 modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
 vite: () => ({ plugins: [tailwindcss()] }),
 manifest: {
  name: 'ChameleonWeb',
  description: 'Extract and preview color palettes on any website',
  permissions: ['activeTab', 'storage'],
  host_permissions: ['<all_urls>'],
  action: {},
 },
 webExt: {
  chromiumBinary: '/usr/bin/brave-browser',
 },
});

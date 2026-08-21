import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
 modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
 vite: () => ({ plugins: [tailwindcss()] }),
 manifest: {
  name: 'ChameleonWeb',
  description: 'ChameleonWeb is a browser extension that lets you create CSS style prototypes in real time without having to use DevTools.',
  permissions: ['activeTab', 'storage'],
  host_permissions: ['<all_urls>'],
  action: {},
 },
 webExt: {
  chromiumBinary: '/usr/bin/brave-browser',
 },
});

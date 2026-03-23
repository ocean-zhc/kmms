import { defineConfig } from 'umi';

export default defineConfig({
  hash: true,
  title: '幼儿园食谱管理系统',
  favicons: ['/favicon.svg'],
  plugins: ['@umijs/plugins/dist/antd'],
  antd: {},
  proxy: {
    '/api': {
      target: 'http://0.0.0.0:8080',
      changeOrigin: true,
      timeout: 120000,
      proxyTimeout: 120000,
    },
  },
  routes: [
    {
      path: '/',
      component: '@/layouts/PublicLayout',
      routes: [
        { path: '/', component: '@/pages/public/index' },
        { path: '/history', component: '@/pages/public/history' },
      ],
    },
    { path: '/admin/login', component: '@/pages/admin/login' },
    {
      path: '/admin',
      component: '@/layouts/AdminLayout',
      routes: [
        { path: '/admin', redirect: '/admin/weeks' },
        { path: '/admin/weeks', component: '@/pages/admin/weeks/index' },
        { path: '/admin/weeks/new', component: '@/pages/admin/weeks/edit' },
        { path: '/admin/weeks/edit/:id', component: '@/pages/admin/weeks/edit' },
        { path: '/admin/dishes', component: '@/pages/admin/dishes/index' },
        { path: '/admin/ai', component: '@/pages/admin/ai/index' },
        { path: '/admin/visits', component: '@/pages/admin/visits/index' },
        { path: '/admin/profile', component: '@/pages/admin/profile/index' },
      ],
    },
  ],
  theme: {
    'primary-color': '#52c41a',
  },
});

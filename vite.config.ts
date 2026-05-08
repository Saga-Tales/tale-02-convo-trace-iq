import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  base: '/tale-02-convo-trace-iq/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'convo·trace',
        short_name: 'convo·trace',
        description: '영어 회화 학습 모먼트 박제 도구. 회화의 흔적을 따라가며 표현·단어를 박제하고 다음 회화에 자연스럽게 회상.',
        start_url: '/tale-02-convo-trace-iq/',
        scope: '/tale-02-convo-trace-iq/',
        display: 'standalone',
        background_color: '#fff8ee',
        theme_color: '#ec4899',
        lang: 'ko',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // SPA fallback (404.html 라우팅과 함께 작동)
        navigateFallback: '/tale-02-convo-trace-iq/index.html',
        // Anthropic API는 절대 SW가 가로채지 않도록 deny
        navigateFallbackDenylist: [/^\/api/, /api\.anthropic\.com/],
        // 모든 빌드 자산 precache
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,ttf}'],
        runtimeCaching: [
          // Anthropic API: 절대 캐시 X
          {
            urlPattern: /^https:\/\/api\.anthropic\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          // 외부 폰트
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1년
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Pretendard CDN
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-cdn',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 90, // 90일
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false, // dev 모드에서는 SW 비활성 (HMR 충돌 방지)
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

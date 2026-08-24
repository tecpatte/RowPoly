// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// The whole app is a client-only React SPA that talks to the NestJS backend over
// REST + Socket.IO, so the Astro layer needs no server logic.
//   - On Vercel (VERCEL=1): build a pure STATIC site → served from the CDN, no
//     serverless functions, no WebSockets needed here (those live on the backend).
//   - Locally / in Docker: a standalone Node server (unchanged) on :4321.
const onVercel = !!process.env.VERCEL;

export default defineConfig(
  onVercel
    ? {
        output: 'static',
        integrations: [react(), tailwind()],
      }
    : {
        output: 'server',
        adapter: node({ mode: 'standalone' }),
        server: { host: true, port: 4321 },
        integrations: [react(), tailwind()],
      },
);

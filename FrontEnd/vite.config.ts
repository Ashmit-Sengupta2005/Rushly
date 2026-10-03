import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Link previews (WhatsApp, LinkedIn, Slack) need an ABSOLUTE og:image URL, so
// it's injected at build time: VITE_SITE_URL if set, else Vercel's production
// domain (exposed to builds automatically). Without either, no image tag.
function ogImage(siteUrl: string | undefined): Plugin {
  return {
    name: 'rushly-og-image',
    transformIndexHtml(html) {
      if (!siteUrl) return html
      const image = `${siteUrl.replace(/\/$/, '')}/og.png`
      return html.replace(
        '</head>',
        `  <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:image" content="${image}" />
  </head>`,
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteUrl =
    env.VITE_SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)

  return {
    plugins: [react(), tailwindcss(), ogImage(siteUrl)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})

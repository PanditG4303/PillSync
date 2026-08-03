import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const SW_CONFIG_KEYS = {
  VITE_FIREBASE_API_KEY: 'apiKey',
  VITE_FIREBASE_AUTH_DOMAIN: 'authDomain',
  VITE_FIREBASE_PROJECT_ID: 'projectId',
  VITE_FIREBASE_STORAGE_BUCKET: 'storageBucket',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId',
  VITE_FIREBASE_APP_ID: 'appId',
  VITE_FIREBASE_MEASUREMENT_ID: 'measurementId',
}

// Generates sw-config.js so firebase-messaging-sw.js gets the Firebase config
// (the same VITE_FIREBASE_* values the app uses) without hardcoding secrets in
// the service worker. Served in dev, emitted as an asset at build time.
function pillsyncSwConfig() {
  const serialize = (env) => {
    const lines = Object.entries(SW_CONFIG_KEYS).map(([envKey, configKey]) => {
      const value = (env[envKey] || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
      return `  ${configKey}: '${value}',`
    })
    return `self.__FIREBASE_CONFIG__ = self.__FIREBASE_CONFIG__ || {\n${lines.join('\n')}\n}\n`
  }
  let env = {}
  return {
    name: 'pillsync-sw-config',
    configResolved(config) {
      env = loadEnv(config.mode, process.cwd(), '')
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.split('?')[0] === '/sw-config.js') {
          res.setHeader('Content-Type', 'application/javascript')
          res.end(serialize(env))
          return
        }
        next()
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sw-config.js', source: serialize(env) })
    },
  }
}

export default defineConfig({
  plugins: [react(), pillsyncSwConfig()],
})

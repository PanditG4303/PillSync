import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import API from './api'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

let messaging = null
let firebaseApp = null
let swRegistration = null

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && vapidKey)
}

export function initFirebase() {
  if (firebaseApp) return messaging
  if (!isFirebaseConfigured()) {
    console.warn('[FCM] Firebase env not configured — push disabled')
    return null
  }
  try {
    firebaseApp = initializeApp(firebaseConfig)
    messaging = getMessaging(firebaseApp)
    console.log('[FCM] Initialized')
    return messaging
  } catch (e) {
    console.warn('[FCM] Init failed', e)
    return null
  }
}

export async function registerServiceWorker() {
  if (swRegistration) return swRegistration
  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM] Service workers not supported')
    return null
  }
  try {
    swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    console.log('[FCM] Service worker registered')
    return swRegistration
  } catch (e) {
    console.warn('[FCM] Service worker registration failed', e)
    return null
  }
}

export function getSwRegistration() {
  return swRegistration
}

export async function requestNotificationPermission() {
  if (!isFirebaseConfigured()) return null
  if (!('Notification' in window)) return null

  const currentPerm = Notification.permission
  if (currentPerm === 'denied') return null
  if (currentPerm === 'default') {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return null
  }

  if (!messaging) initFirebase()
  if (!messaging) return null

  await registerServiceWorker()

  try {
    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swRegistration,
    })
    if (currentToken) {
      await API.post('/fcm/register', {
        fcm_token: currentToken,
        device_type: 'web',
      })
    }
    return currentToken
  } catch (e) {
    console.warn('[FCM] Token error:', e)
    return null
  }
}

export function onForegroundMessage(callback) {
  if (!messaging) return
  onMessage(messaging, (payload) => callback(payload))
}

export function hasPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

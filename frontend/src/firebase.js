import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import API from './api'

const firebaseConfig = {
  apiKey: "AIzaSyDUJ-9J8WzjH9DZ85XERx4Z6S9I1m_ODzA",
  authDomain: "pillsync-a9d6f.firebaseapp.com",
  projectId: "pillsync-a9d6f",
  storageBucket: "pillsync-a9d6f.firebasestorage.app",
  messagingSenderId: "438282937227",
  appId: "1:438282937227:web:5e4df8f40ba8400765058e",
  measurementId: "G-KD2FERG7EK",
}

let messaging = null
let firebaseApp = null
let swRegistration = null

export function initFirebase() {
  if (firebaseApp) return messaging
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('[FCM] Firebase config missing')
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
  console.log('[FCM] Starting setup')
  if (!('Notification' in window)) {
    console.warn('[FCM] Notifications not supported')
    return null
  }

  const currentPerm = Notification.permission
  if (currentPerm === 'denied') {
    console.warn('[FCM] Notification permission denied')
    return null
  }

  if (currentPerm === 'default') {
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      console.warn('[FCM] Permission: denied')
      return null
    }
  }

  console.log('[FCM] Permission: granted')

  if (!messaging) {
    initFirebase()
  }
  if (!messaging) {
    return null
  }

  await registerServiceWorker()

  try {
    const currentToken = await getToken(messaging, {
      vapidKey: 'BIYW-edv9wpZdKl6VYShugyZLMas7eTfMBa-QZXqgpFzI0TJZqiOxs5KIHqq3JSLy_k5OnVt6aePDXYft6e7FXU',
      serviceWorkerRegistration: swRegistration,
    })
    if (currentToken) {
      console.log('[FCM] Token generated')
      let userId = null
      try {
        const stored = localStorage.getItem('pillsync_user')
        if (stored) userId = JSON.parse(stored).id
      } catch {}
      if (userId) {
        console.log(`[FCM] Registering device for user: ${userId}`)
      }
      await API.post('/fcm/register', {
        fcm_token: currentToken,
        device_type: 'web',
      })
      console.log('[FCM] Device registered successfully')
    } else {
      console.warn('[FCM] Token not generated')
    }
    return currentToken
  } catch (e) {
    console.warn('[FCM] Token error:', e)
    return null
  }
}

export function onForegroundMessage(callback) {
  if (!messaging) {
    console.warn('[FCM] Messaging not initialized for foreground handler')
    return
  }
  onMessage(messaging, (payload) => {
    console.log('[FCM] Foreground message received')
    callback(payload)
  })
}

export function hasPermission() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

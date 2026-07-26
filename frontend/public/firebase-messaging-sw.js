importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyDUJ-9J8WzjH9DZ85XERx4Z6S9I1m_ODzA",
  authDomain: "pillsync-a9d6f.firebaseapp.com",
  projectId: "pillsync-a9d6f",
  storageBucket: "pillsync-a9d6f.firebasestorage.app",
  messagingSenderId: "438282937227",
  appId: "1:438282937227:web:5e4df8f40ba8400765058e",
  measurementId: "G-KD2FERG7EK",
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.data || {}
  self.registration.showNotification(title || 'Medicine Reminder', {
    body: body || 'Time to take your medicine',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
  })
})

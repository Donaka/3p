importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDFK_jc_iAqH0k2TQ6zWjnPY-v9gyB6iSA",
  authDomain: "pchickenpops.firebaseapp.com",
  projectId: "pchickenpops",
  storageBucket: "pchickenpops.firebasestorage.app",
  messagingSenderId: "335909286449",
  appId: "1:335909286449:web:ce00da23665835cc16db10"
});

function saveNotificationToDB(payload) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('3PNotificationsDB', 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notifications')) {
        db.createObjectStore('notifications', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = event => {
      const db = event.target.result;
      const tx = db.transaction('notifications', 'readwrite');
      const store = tx.objectStore('notifications');
      store.add({
        title: payload.notification?.title || "Notification",
        body: payload.notification?.body || "",
        timestamp: Date.now(),
        read: false
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = event => reject(event.target.error);
  });
}

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || "",
    icon: payload.notification?.icon || payload.data?.icon || '/logo-3p.png',
    badge: payload.notification?.badge || payload.data?.badge || '/icon.svg',
    image: payload.notification?.image || payload.data?.image || null,
    data: {
      ...(payload.data || {}),
      url: payload.data?.url || '/'
    },
    tag: payload.data?.tag || '3p-notification',
    renotify: true
  };

  const showPromise = self.registration.showNotification(notificationTitle, notificationOptions);

  
  // Wait for both saving and showing to finish to prevent SW termination
  return Promise.all([showPromise, saveNotificationToDB(payload).catch(console.error)]);
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});


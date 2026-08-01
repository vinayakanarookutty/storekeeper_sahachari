importScripts(
  "https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyBR4BFQmXwMuTGkQBH6dGYDNP-nCbo9mgw",
  authDomain: "sahachari-32fca.firebaseapp.com",
  projectId: "sahachari-32fca",
  storageBucket: "sahachari-32fca.firebasestorage.app",
  messagingSenderId: "208738624417",
  appId: "1:208738624417:web:7ce0942d495761c31ca1e0",
  measurementId: "G-GMGZV524TE"
});

const messaging =
  firebase.messaging();
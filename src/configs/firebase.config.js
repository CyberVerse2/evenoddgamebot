require('dotenv').config();
const { initializeApp } = require('firebase/app');

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: 'evenoddgamebot.firebaseapp.com',
  projectId: 'evenoddgamebot',
  storageBucket: 'evenoddgamebot.appspot.com',
  messagingSenderId: '372082013091',
  appId: '1:372082013091:web:07ddecdfe5536e2db06016',
  measurementId: 'G-6RRD1FVK8N'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

module.exports = app;

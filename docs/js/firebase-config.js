// ======================================================
// إعدادات Firebase - فريق شمال واسط
// ======================================================

const firebaseConfig = {
  apiKey: 'AIzaSyABMSlnJJHEIEQMA-HCoXTwQHu86DrKZ6k',
  authDomain: 'shamal-wasit-team.firebaseapp.com',
  projectId: 'shamal-wasit-team',
  storageBucket: 'shamal-wasit-team.firebasestorage.app',
  messagingSenderId: '913857477715',
  appId: '1:913857477715:web:82ce2b4bdb85dc7da09aa6'
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

try {
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
} catch (e) {}

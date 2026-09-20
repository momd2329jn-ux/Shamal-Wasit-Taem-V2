// ======================================================
// app.js - الهيدر الذكي
// ======================================================

(function () {
  function applyNav(user) {
    var authLink = document.querySelector('[data-nav="auth"]');
    var member = document.querySelector('[data-nav="member"]');
    var admin = document.querySelector('[data-nav="admin"]');

    if (!authLink || !member || !admin) return;

    if (!user || user.isAnonymous === true) {
      authLink.removeAttribute('hidden');
      member.setAttribute('hidden', '');
      admin.setAttribute('hidden', '');
      return;
    }

    // المستخدم مسجل - نخفي تسجيل الدخول ونظهر حسابي
    authLink.setAttribute('hidden', '');
    member.removeAttribute('hidden');

    // نقرأ الدور من Firestore
    db.collection('users').doc(user.uid).get()
      .then(function (snap) {
        var role = snap.exists
          ? String(snap.data().role || 'user').trim().toLowerCase()
          : 'user';

        if (role === 'admin' || role === 'supervisor') {
          admin.removeAttribute('hidden');
        } else {
          admin.setAttribute('hidden', '');
        }
      })
      .catch(function (e) {
        console.error('NAV ROLE ERROR:', e);
        admin.setAttribute('hidden', '');
      });
  }

  // انتظار Firebase
  function waitFirebase() {
    if (window.auth && window.db) {
      auth.onAuthStateChanged(applyNav);
    } else {
      setTimeout(waitFirebase, 100);
    }
  }

  // قائمة الجوال
  function initMenu() {
    var b = document.getElementById('menuButton');
    var n = document.getElementById('mainNav');
    if (!n) return;
    if (b) b.addEventListener('click', function () {
      n.classList.toggle('open');
    });
    n.addEventListener('click', function (e) {
      if (e.target.closest('a')) n.classList.remove('open');
    });
  }

  function start() {
    initMenu();
    waitFirebase();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();

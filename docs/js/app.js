// ======================================================
// app.js - الهيدر الذكي
// ======================================================

(function () {

  function applyNav(user) {
    var authLink = document.querySelector('[data-nav="auth"]');
    var member = document.querySelector('[data-nav="member"]');
    var admin = document.querySelector('[data-nav="admin"]');

    if (!authLink || !member || !admin) {
      console.log('NAV: عناصر الهيدر مو موجودة');
      return;
    }

    // زائر: تسجيل الدخول ظاهر، الباقي مخفي
    if (!user || user.isAnonymous === true) {
      authLink.removeAttribute('hidden');
      member.setAttribute('hidden', '');
      admin.setAttribute('hidden', '');
      console.log('NAV: زائر');
      return;
    }

    // مسجّل: تسجيل الدخول مخفي، حسابي ظاهر
    authLink.setAttribute('hidden', '');
    member.removeAttribute('hidden');
    console.log('NAV: مسجل - UID:', user.uid);

    // نقرأ الدور
    db.collection('users').doc(user.uid).get()
      .then(function (snap) {
        var role = snap.exists
          ? String(snap.data().role || 'user').trim().toLowerCase()
          : 'user';

        console.log('NAV: الدور =', role);

        if (role === 'admin' || role === 'supervisor') {
          admin.removeAttribute('hidden');
          console.log('NAV: لوحة التحكم ظاهرة');
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
      console.log('NAV: Firebase جاهز');
      auth.onAuthStateChanged(applyNav);
    } else {
      setTimeout(waitFirebase, 100);
    }
  }

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
    console.log('NAV: app.js بدأ');
    initMenu();
    waitFirebase();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
})();


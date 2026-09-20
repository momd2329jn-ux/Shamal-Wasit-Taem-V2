// ======================================================
// app.js - الهيدر الذكي
// فريق شمال واسط
// ======================================================

(function () {

  function setHidden(element, hidden) {
    if (!element) return;

    if (hidden) {
      element.setAttribute('hidden', '');
    } else {
      element.removeAttribute('hidden');
    }
  }

  function applyNav(user) {
    const authLink = document.querySelector('[data-nav="auth"]');
    const memberLink = document.querySelector('[data-nav="member"]');
    const adminLink = document.querySelector('[data-nav="admin"]');

    if (!authLink || !memberLink || !adminLink) {
      return;
    }

    // ==============================
    // زائر
    // ==============================
    if (!user || user.isAnonymous === true) {
      setHidden(authLink, false);
      setHidden(memberLink, true);
      setHidden(adminLink, true);
      return;
    }

    // ==============================
    // عضو مسجل
    // ==============================
    setHidden(authLink, true);
    setHidden(memberLink, false);
    setHidden(adminLink, true);

    if (!window.db) {
      return;
    }

    // ==============================
    // التحقق من صلاحية المستخدم
    // ==============================
    db.collection('users')
      .doc(user.uid)
      .get()
      .then(function (snap) {

        const role = snap.exists
          ? String(snap.data().role || 'user')
              .trim()
              .toLowerCase()
          : 'user';

        if (role === 'admin' || role === 'supervisor') {
          setHidden(adminLink, false);
        } else {
          setHidden(adminLink, true);
        }

      })
      .catch(function (error) {

        console.error('NAV ROLE ERROR:', error);
        setHidden(adminLink, true);

      });
  }

  // ==============================
  // انتظار Firebase
  // ==============================
  function waitForFirebase() {

    if (window.auth && window.db) {
      auth.onAuthStateChanged(applyNav);
      return;
    }

    setTimeout(waitForFirebase, 100);
  }

  // ==============================
  // قائمة الهاتف
  // ==============================
  function initMenu() {

    const button = document.getElementById('menuButton');
    const nav = document.getElementById('mainNav');

    if (!nav) {
      return;
    }

    if (button) {

      button.addEventListener('click', function () {

        nav.classList.toggle('open');

        const opened =
          nav.classList.contains('open');

        button.setAttribute(
          'aria-expanded',
          String(opened)
        );

      });

    }

    nav.addEventListener('click', function (event) {

      const link =
        event.target.closest('a');

      if (!link) {
        return;
      }

      nav.classList.remove('open');

      if (button) {
        button.setAttribute(
          'aria-expanded',
          'false'
        );
      }

    });
  }

  // ==============================
  // تشغيل
  // ==============================
  function start() {

    initMenu();
    waitForFirebase();

  }

  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      start
    );

  } else {

    start();

  }

  // ==============================
  // Service Worker
  // ==============================
  if ('serviceWorker' in navigator) {

    window.addEventListener('load', function () {

      navigator.serviceWorker
        .register('sw.js')
        .catch(function (error) {
          console.warn('SW:', error);
        });

    });

  }

})();

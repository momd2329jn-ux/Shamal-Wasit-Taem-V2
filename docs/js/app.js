// ======================================================
// app.js - الهيدر الذكي + زر تثبيت التطبيق
// فريق شمال واسط
// ======================================================

(function () {

  // ====================================================
  // إخفاء / إظهار العناصر
  // ====================================================

  function setHidden(element, hidden) {
    if (!element) return;

    if (hidden) {
      element.setAttribute('hidden', '');
    } else {
      element.removeAttribute('hidden');
    }
  }


  // ====================================================
  // تحديث الهيدر حسب حالة تسجيل الدخول والصلاحية
  // ====================================================

  function applyNav(user) {

    const authLink =
      document.querySelector('[data-nav="auth"]');

    const memberLink =
      document.querySelector('[data-nav="member"]');

    const adminLink =
      document.querySelector('[data-nav="admin"]');

    if (!authLink || !memberLink || !adminLink) {
      return;
    }

    // ------------------------------------------
    // زائر
    // ------------------------------------------

    if (!user || user.isAnonymous === true) {

      setHidden(authLink, false);
      setHidden(memberLink, true);
      setHidden(adminLink, true);

      return;
    }

    // ------------------------------------------
    // مستخدم مسجل
    // ------------------------------------------

    setHidden(authLink, true);
    setHidden(memberLink, false);
    setHidden(adminLink, true);

    // ------------------------------------------
    // Firebase
    // ------------------------------------------

    if (typeof db === 'undefined') {
      return;
    }

    db.collection('users')
      .doc(user.uid)
      .get()

      .then(function (snap) {

        const role = snap.exists
          ? String(
              snap.data().role || 'user'
            ).trim().toLowerCase()
          : 'user';

        // المدير أو المشرف
        if (
          role === 'admin' ||
          role === 'supervisor'
        ) {

          setHidden(adminLink, false);

        } else {

          setHidden(adminLink, true);

        }

      })

      .catch(function (error) {

        console.error(
          'NAV ROLE ERROR:',
          error
        );

        setHidden(adminLink, true);

      });
  }


  // ====================================================
  // انتظار Firebase
  // ====================================================

  function waitForFirebase() {

    if (
      typeof auth !== 'undefined' &&
      typeof db !== 'undefined'
    ) {

      auth.onAuthStateChanged(
        applyNav
      );

      return;
    }

    setTimeout(
      waitForFirebase,
      100
    );
  }


  // ====================================================
  // قائمة الهاتف
  // ====================================================

  function initMenu() {

    const button =
      document.getElementById('menuButton');

    const nav =
      document.getElementById('mainNav');

    if (!nav) {
      return;
    }

    if (button) {

      button.addEventListener(
        'click',
        function () {

          nav.classList.toggle('open');

          const opened =
            nav.classList.contains('open');

          button.setAttribute(
            'aria-expanded',
            String(opened)
          );

        }
      );

    }

    nav.addEventListener(
      'click',
      function (event) {

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

      }
    );
  }


  // ====================================================
  // زر تثبيت التطبيق
  // ====================================================

  let deferredInstallPrompt = null;

  function createInstallButton() {

    // لا ننشئ الزر أكثر من مرة
    if (
      document.getElementById(
        'installAppButton'
      )
    ) {
      return;
    }

    const button =
      document.createElement('button');

    button.id =
      'installAppButton';

    button.type =
      'button';

    button.textContent =
      '📲 تثبيت التطبيق';

    // ------------------------------------------
    // تصميم الزر
    // ------------------------------------------

    button.style.position =
      'fixed';

    button.style.bottom =
      '20px';

    button.style.right =
      '20px';

    button.style.zIndex =
      '9999';

    button.style.border =
      '0';

    button.style.borderRadius =
      '14px';

    button.style.padding =
      '12px 18px';

    button.style.background =
      '#35d2cf';

    button.style.color =
      '#06151b';

    button.style.fontFamily =
      'inherit';

    button.style.fontSize =
      '15px';

    button.style.fontWeight =
      '700';

    button.style.cursor =
      'pointer';

    button.style.boxShadow =
      '0 8px 25px rgba(0,0,0,.30)';

    button.style.display =
      'none';

    // ------------------------------------------
    // الضغط على زر التثبيت
    // ------------------------------------------

    button.addEventListener(
      'click',
      async function () {

        if (!deferredInstallPrompt) {
          return;
        }

        deferredInstallPrompt.prompt();

        try {

          const choice =
            await deferredInstallPrompt.userChoice;

          console.log(
            'INSTALL CHOICE:',
            choice.outcome
          );

        } catch (error) {

          console.warn(
            'INSTALL PROMPT:',
            error
          );

        }

        deferredInstallPrompt =
          null;

        button.style.display =
          'none';

      }
    );

    document.body.appendChild(
      button
    );
  }


  // ====================================================
  // مراقبة إمكانية تثبيت التطبيق
  // ====================================================

  function initInstallPrompt() {

    createInstallButton();

    const button =
      document.getElementById(
        'installAppButton'
      );

    if (!button) {
      return;
    }

    // ------------------------------------------
    // المتصفح أصبح يسمح بالتثبيت
    // ------------------------------------------

    window.addEventListener(
      'beforeinstallprompt',
      function (event) {

        // منع Chrome من إظهار النافذة
        // بشكل تلقائي
        event.preventDefault();

        deferredInstallPrompt =
          event;

        button.style.display =
          'block';

      }
    );

    // ------------------------------------------
    // بعد تثبيت التطبيق
    // ------------------------------------------

    window.addEventListener(
      'appinstalled',
      function () {

        deferredInstallPrompt =
          null;

        button.style.display =
          'none';

        console.log(
          'APP INSTALLED'
        );

      }
    );

    // ------------------------------------------
    // إذا كان الموقع مفتوحاً كتطبيق
    // فلا نعرض زر التثبيت
    // ------------------------------------------

    const standalone =
      window.matchMedia &&
      window.matchMedia(
        '(display-mode: standalone)'
      ).matches;

    const iosStandalone =
      window.navigator.standalone === true;

    if (
      standalone ||
      iosStandalone
    ) {

      button.style.display =
        'none';
    }
  }


  // ====================================================
  // تشغيل
  // ====================================================

  function start() {

    initMenu();
    waitForFirebase();
    initInstallPrompt();

  }


  if (
    document.readyState === 'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      start
    );

  } else {

    start();

  }


  // ====================================================
  // Service Worker
  // ====================================================

  if (
    'serviceWorker' in navigator
  ) {

    window.addEventListener(
      'load',
      function () {

        navigator.serviceWorker
          .register('sw.js')
          .catch(function (error) {

            console.warn(
              'SW:',
              error
            );

          });

      }
    );

  }

})();

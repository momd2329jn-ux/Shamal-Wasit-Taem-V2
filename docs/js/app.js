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

  let installButton = null;


  // ====================================================
  // إنشاء زر التثبيت داخل الهيدر
  // ====================================================

  function createInstallButton() {

    // إذا الزر موجود مسبقاً لا ننشئ واحد ثاني
    if (
      document.getElementById(
        'installAppButton'
      )
    ) {

      installButton =
        document.getElementById(
          'installAppButton'
        );

      return;
    }


    const nav =
      document.getElementById('mainNav');

    if (!nav) {
      return;
    }


    // ------------------------------------------
    // إنشاء الزر
    // ------------------------------------------

    const button =
      document.createElement('button');

    button.id =
      'installAppButton';

    button.type =
      'button';

    button.textContent =
      '📲 تثبيت التطبيق';


    // ------------------------------------------
    // تنسيق الزر
    // ------------------------------------------

    button.style.border =
      '1px solid rgba(53,210,207,.45)';

    button.style.borderRadius =
      '10px';

    button.style.padding =
      '9px 13px';

    button.style.margin =
      '4px 0';

    button.style.background =
      'rgba(53,210,207,.12)';

    button.style.color =
      '#35d2cf';

    button.style.fontFamily =
      'inherit';

    button.style.fontSize =
      '14px';

    button.style.fontWeight =
      '700';

    button.style.cursor =
      'pointer';

    button.style.whiteSpace =
      'nowrap';

    button.style.display =
      'none';


    // ------------------------------------------
    // الضغط على الزر
    // ------------------------------------------

    button.addEventListener(
      'click',
      async function () {

        if (!deferredInstallPrompt) {
          return;
        }


        // إظهار نافذة التثبيت الأصلية
        deferredInstallPrompt.prompt();


        try {

          const choice =
            await deferredInstallPrompt.userChoice;

          console.log(
            'INSTALL CHOICE:',
            choice.outcome
          );


          // إذا المستخدم اختار التثبيت
          if (
            choice.outcome ===
            'accepted'
          ) {

            button.style.display =
              'none';
          }

        } catch (error) {

          console.warn(
            'INSTALL PROMPT ERROR:',
            error
          );

        }


        // لا نعيد استخدام نفس الطلب
        deferredInstallPrompt =
          null;

      }
    );


    // ------------------------------------------
    // نضيفه داخل قائمة الهيدر
    // ------------------------------------------

    nav.appendChild(
      button
    );


    installButton =
      button;
  }


  // ====================================================
  // فحص هل الموقع مفتوح كتطبيق مثبت
  // ====================================================

  function isAppInstalled() {

    const standalone =
      window.matchMedia &&
      window.matchMedia(
        '(display-mode: standalone)'
      ).matches;


    const iosStandalone =
      window.navigator.standalone === true;


    return (
      standalone ||
      iosStandalone
    );
  }


  // ====================================================
  // تشغيل نظام التثبيت
  // ====================================================

  function initInstallPrompt() {

    createInstallButton();


    if (!installButton) {
      return;
    }


    // ------------------------------------------
    // إذا التطبيق مثبت مسبقاً
    // ------------------------------------------

    if (isAppInstalled()) {

      installButton.style.display =
        'none';

      return;
    }


    // ------------------------------------------
    // Chrome أصبح جاهزاً للتثبيت
    // ------------------------------------------

    window.addEventListener(
      'beforeinstallprompt',
      function (event) {

        // نمنع Chrome من إظهار
        // نافذة التثبيت تلقائياً

        event.preventDefault();


        deferredInstallPrompt =
          event;


        // إظهار الزر داخل الهيدر

        installButton.style.display =
          'inline-block';

      }
    );


    // ------------------------------------------
    // تم تثبيت التطبيق
    // ------------------------------------------

    window.addEventListener(
      'appinstalled',
      function () {

        deferredInstallPrompt =
          null;


        if (installButton) {

          installButton.style.display =
            'none';

        }


        console.log(
          'APP INSTALLED'
        );

      }
    );
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

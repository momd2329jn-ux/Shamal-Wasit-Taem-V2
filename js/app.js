// ======================================================
// app.js - الهيدر الذكي + Service Worker
// فريق شمال واسط
// ======================================================

document.addEventListener('DOMContentLoaded', () => {
  const b = document.getElementById('menuButton');
  const n = document.getElementById('mainNav');
  if (!n) return;

  // فتح/إغلاق القائمة في الجوال
  if (b) b.addEventListener('click', () => {
    n.classList.toggle('open');
    b.setAttribute('aria-expanded', n.classList.contains('open') ? 'true' : 'false');
  });

  n.addEventListener('click', e => {
    if (e.target.closest('a')) n.classList.remove('open');
  });

  // عناصر الهيدر
  const authLink = n.querySelector('[data-nav="auth"]');
  const member = n.querySelector('[data-nav="member"]');
  const admin = n.querySelector('[data-nav="admin"]');

  // ضبط الهيدر حسب حالة المستخدم
  // - زائر: تسجيل الدخول ظاهر
  // - عضو: "حسابي" ظاهر
  // - مدير/مشرف: "حسابي" + "لوحة التحكم"
  const setNav = (signed, role = 'user') => {
    if (authLink) authLink.hidden = signed;
    if (member) member.hidden = !signed;
    if (admin) {
      admin.hidden = !(signed && (role === 'admin' || role === 'supervisor'));
    }
  };

  // قراءة الدور من Firestore
  const applyNav = async (user) => {
    if (!user || user.isAnonymous === true) {
      setNav(false);
      return;
    }

    try {
      const snap = await db.collection('users').doc(user.uid).get();
      const role = snap.exists
        ? String(snap.data().role || 'user').trim().toLowerCase()
        : 'user';
      setNav(true, role);
    } catch (e) {
      console.error('NAV ROLE CHECK ERROR:', e);
      setNav(true, 'user');
    }
  };

  // الانتظار حتى Firebase يكون جاهز
  const initNav = () => {
    if (window.auth && window.db) {
      auth.onAuthStateChanged(applyNav);
    } else {
      setTimeout(initNav, 100);
    }
  };
  initNav();

  // تسجيل Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

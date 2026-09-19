// ======================================================
// site-icons.js - عرض أيقونات الفريق في الفوتر
// فريق شمال واسط
// ======================================================

(function(){
  async function loadSiteIcons(){
    const container = document.querySelector('.footer-socials');
    if (!container) return;

    try {
      // نحاول نقرأ الأيقونات من Firestore
      const snap = await db.collection('siteIcons')
        .where('active', '==', true)
        .orderBy('order', 'asc')
        .get();

      // إذا ما في أيقونات في Firestore، نستخدم الأيقونات الافتراضية
      if (snap.empty) return;

      container.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `<span class="social-icon" title="${d.label || ''}" aria-label="${d.label || ''}">${d.symbol || '●'}</span>`;
      }).join('');

    } catch (e) {
      // نتجاهل الأخطاء — الأيقونات الافتراضية تبقى
      console.warn('تعذر تحميل أيقونات الفريق، سيتم استخدام الأيقونات الافتراضية.', e);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    // ننتظر حتى يكون db جاهز
    const wait = setInterval(() => {
      if (window.db) {
        clearInterval(wait);
        loadSiteIcons();
      }
    }, 100);
    setTimeout(() => clearInterval(wait), 5000);
  });
})();

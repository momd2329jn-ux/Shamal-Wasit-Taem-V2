// ======================================================
// site-icons.js
// تحميل أيقونات الفريق من Firestore
// فريق شمال واسط
// ======================================================

(function () {

  function escapeHtml(value) {

    return String(value || '')
      .replace(/[&<>'"]/g, function (char) {

        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          "'": '&#39;',
          '"': '&quot;'
        }[char];

      });

  }

  async function loadSiteIcons() {

    const container =
      document.querySelector('.footer-socials');

    if (!container) {
      return;
    }

    try {

      const snap = await db
        .collection('siteIcons')
        .where('active', '==', true)
        .get();

      if (snap.empty) {
        return;
      }

      const icons = snap.docs
        .map(function (doc) {

          const data = doc.data();

          return {
            label: data.label || '',
            symbol: data.symbol || '●',
            order: Number(data.order || 0)
          };

        })
        .sort(function (a, b) {

          return a.order - b.order;

        });

      container.innerHTML = icons
        .map(function (icon) {

          return `
            <span
              class="social-icon"
              title="${escapeHtml(icon.label)}"
              aria-label="${escapeHtml(icon.label)}"
            >${escapeHtml(icon.symbol)}</span>
          `;

        })
        .join('');

    } catch (error) {

      console.warn(
        'تعذر تحميل أيقونات الفريق، سيتم استخدام الأيقونات الافتراضية.',
        error
      );

    }

  }

  function start() {

    if (!window.db) {
      setTimeout(start, 100);
      return;
    }

    loadSiteIcons();

  }

  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      start
    );

  } else {

    start();

  }

})();

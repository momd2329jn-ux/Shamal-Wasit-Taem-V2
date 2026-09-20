// ======================================================
// أقسام الموقع الديناميكية
// فريق شمال واسط
// ======================================================

(function () {

  function esc(value) {
    return String(value || '').replace(/[&<>'"]/g, function (char) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[char];
    });
  }

  async function loadSiteCategories() {

    const container = document.querySelector('.category-grid');

    if (!container || typeof db === 'undefined') return;

    try {

      const snap = await db
        .collection('siteCategories')
        .where('active', '==', true)
        .get();

      // إذا ماكو بيانات، نخلي الأقسام الأصلية الموجودة بالكود
      if (snap.empty) return;

      const categories = snap.docs
        .map(function (doc) {
          const data = doc.data();

          return {
            title: data.title || '',
            icon: data.icon || '●',
            description: data.description || '',
            link: data.link || '#',
            order: Number(data.order || 0)
          };
        })
        .sort(function (a, b) {
          return a.order - b.order;
        });

      if (!categories.length) return;

      container.innerHTML = categories.map(function (category) {

        return `
          <a class="category-card" href="${esc(category.link)}">

            <div class="category-icon">
              ${esc(category.icon)}
            </div>

            <h3>${esc(category.title)}</h3>

            <p>${esc(category.description)}</p>

            <span>
              عرض المحتوى ←
            </span>

          </a>
        `;

      }).join('');

    } catch (error) {

      // إذا صار أي خطأ، تبقى الأقسام الأصلية الموجودة في index.html
      console.warn(
        'تعذر تحميل أقسام الموقع الديناميكية، سيتم استخدام الأقسام الافتراضية.',
        error
      );

    }
  }

  function start() {
    loadSiteCategories();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();

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

    const container =
      document.querySelector('.category-grid');

    if (
      !container ||
      typeof db === 'undefined'
    ) {
      return;
    }

    try {

      const snap = await db
        .collection('siteCategories')
        .where('type', '==', 'custom')
        .where('active', '==', true)
        .get();

      const categories =
        snap.docs
          .map(function (doc) {

            const data = doc.data();

            return {
              id: doc.id,
              title: data.title || '',
              icon: data.icon || '●',
              description:
                data.description || '',
              order:
                Number(data.order || 0)
            };

          })
          .sort(function (a, b) {
            return a.order - b.order;
          });

      categories.forEach(function (category) {

        const card =
          document.createElement('a');

        card.className =
          'category-card';

        card.href =
          'category.html?id=' +
          encodeURIComponent(category.id);

        card.innerHTML = `

          <div class="category-icon">
            ${esc(category.icon)}
          </div>

          <h3>
            ${esc(category.title)}
          </h3>

          <p>
            ${esc(category.description)}
          </p>

          <span>
            عرض المحتوى ←
          </span>

        `;

        container.appendChild(card);

      });

    } catch (error) {

      console.warn(
        'تعذر تحميل الأقسام الجديدة.',
        error
      );
    }
  }

  window.loadCustomCategories =
    loadSiteCategories;

  function start() {
    loadSiteCategories();
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

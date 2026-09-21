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

    if (!container || typeof db === 'undefined') {
      return;
    }

    try {

      const snap = await db.collection('siteCategories')
        .where('type', '==', 'custom')
        .where('active', '==', true)
        .get();

      const customCategories = snap.docs.map(function (doc) {

        const data = doc.data();

        return {
          id: doc.id,
          title: data.title || '',
          icon: data.icon || '●',
          description: data.description || '',
          order: Math.max(1, Number(data.order || 999999)),
          createdAt: data.createdAt
        };

      });

      if (!customCategories.length) {
        return;
      }

      /*
       * الأقسام الأصلية الموجودة في index.html
       * نعتبر ترتيبها الحالي هو ترتيبها الأساسي.
       */

      const fixedCards = Array.from(
        container.querySelectorAll('.category-card')
      );

      /*
       * نبني قائمة موحدة.
       *
       * الأقسام الأصلية:
       * الأخبار = 1
       * الفعاليات = 2
       * المقالات = 3
       * الصحة = 4
       * البيئة = 5
       * الاستفسارات = 6
       * تواصل معنا = 7
       */

      let items = fixedCards.map(function (card, index) {

        return {
          element: card,
          order: index + 1,
          fixed: true,
          originalIndex: index
        };

      });

      /*
       * نضيف الأقسام المخصصة حسب الرقم الذي اختاره المدير.
       */

      customCategories.forEach(function (category, index) {

        const card = document.createElement('a');

        card.className = 'category-card';

        card.href =
          'category.html?id=' +
          encodeURIComponent(category.id);

        card.innerHTML = `
          <div class="category-icon">
            ${esc(category.icon)}
          </div>

          <h3>${esc(category.title)}</h3>

          <p>${esc(category.description)}</p>

          <span>عرض المحتوى ←</span>
        `;

        items.push({
          element: card,
          order: category.order,
          fixed: false,
          originalIndex: fixedCards.length + index
        });

      });

      /*
       * ترتيب الأقسام حسب الرقم.
       *
       * القسم المخصص إذا أخذ نفس رقم قسم موجود،
       * يأتي مكانه ويدفع الباقي بعده.
       */

      items.sort(function (a, b) {

        if (a.order !== b.order) {
          return a.order - b.order;
        }

        /*
         * عند تساوي الرقم:
         * القسم المخصص يكون أولًا،
         * وبعده القسم القديم.
         */

        if (!a.fixed && b.fixed) {
          return -1;
        }

        if (a.fixed && !b.fixed) {
          return 1;
        }

        return a.originalIndex - b.originalIndex;

      });

      /*
       * إعادة ترتيب البطاقات داخل الصفحة.
       */

      container.innerHTML = '';

      items.forEach(function (item) {
        container.appendChild(item.element);
      });

    } catch (error) {

      console.error(
        'تعذر تحميل وترتيب الأقسام الجديدة:',
        error
      );

    }

  }

  window.loadCustomCategories = loadSiteCategories;

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

// ======================================================
// صفحة القسم الديناميكي
// فريق شمال واسط
// ======================================================

(function () {

  const params =
    new URLSearchParams(
      window.location.search
    );

  const categoryId =
    params.get('id');

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

  function showError(message) {

    const title =
      document.getElementById(
        'categoryTitle'
      );

    const description =
      document.getElementById(
        'categoryDescription'
      );

    const posts =
      document.getElementById(
        'categoryPosts'
      );

    if (title) {
      title.textContent =
        'تعذر فتح القسم';
    }

    if (description) {
      description.textContent =
        message;
    }

    if (posts) {
      posts.innerHTML =
        '<div class="empty-state">' +
        esc(message) +
        '</div>';
    }
  }

  async function loadCategory() {

    if (!categoryId) {

      showError(
        'رابط القسم غير صحيح.'
      );

      return;
    }

    try {

      const categorySnap =
        await db
          .collection('siteCategories')
          .doc(categoryId)
          .get();

      if (!categorySnap.exists) {

        showError(
          'القسم غير موجود.'
        );

        return;
      }

      const category =
        categorySnap.data();

      if (
        category.type !== 'custom' ||
        category.active === false
      ) {

        showError(
          'هذا القسم غير متاح حاليًا.'
        );

        return;
      }

      const title =
        category.title || 'القسم';

      const icon =
        category.icon || '●';

      const description =
        category.description || '';

      document.title =
        title +
        ' | فريق شمال واسط';

      document.getElementById(
        'categoryIcon'
      ).textContent = icon;

      document.getElementById(
        'categoryTitle'
      ).textContent = title;

      document.getElementById(
        'categoryDescription'
      ).textContent = description;

      await loadPosts(
        categoryId,
        title,
        icon
      );

    } catch (error) {

      console.error(error);

      showError(
        'تعذر تحميل القسم.'
      );
    }
  }

  async function loadPosts(
    id,
    categoryTitle,
    categoryIcon
  ) {

    const box =
      document.getElementById(
        'categoryPosts'
      );

    try {

      const snap =
        await db
          .collection('siteCategoryPosts')
          .where(
            'categoryId',
            '==',
            id
          )
          .get();

      const posts =
        snap.docs
          .sort(function (a, b) {

            return (
              b.data().createdAt
                ?.toMillis?.() || 0
            ) -
            (
              a.data().createdAt
                ?.toMillis?.() || 0
            );

          });

      if (!posts.length) {

        box.innerHTML =
          '<div class="empty-state">' +
          'لا توجد منشورات في هذا القسم حاليًا.' +
          '</div>';

        return;
      }

      box.innerHTML =
        posts.map(function (doc) {

          const d =
            doc.data();

          const image =
            d.imageData ||
            d.imageUrl ||
            '';

          return `

            <article class="post-card">

              ${
                image
                  ? `
                    <img
                      src="${esc(image)}"
                      alt=""
                      loading="lazy"
                    >
                  `
                  : ''
              }

              <div class="post-card-body">

                <div class="post-meta">
                  ${esc(categoryIcon)}
                  ${esc(categoryTitle)}

                  ${
                    d.createdAt
                      ? ' • ' +
                        esc(
                          d.createdAt
                            .toDate()
                            .toLocaleDateString('ar-IQ')
                        )
                      : ''
                  }
                </div>

                <h3>
                  ${esc(
                    d.title ||
                    'بدون عنوان'
                  )}
                </h3>

                <p>
                  ${esc(
                    d.content || ''
                  )}
                </p>

              </div>

            </article>

          `;

        }).join('');

    } catch (error) {

      console.error(error);

      box.innerHTML =
        '<div class="empty-state">' +
        'تعذر تحميل منشورات القسم.' +
        '</div>';
    }
  }

  function start() {

    if (
      typeof db === 'undefined'
    ) {

      setTimeout(
        start,
        100
      );

      return;
    }

    loadCategory();
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

})();

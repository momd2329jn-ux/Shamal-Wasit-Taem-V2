// ======================================================
// إدارة أقسام الموقع
// فريق شمال واسط
// ======================================================

(function () {

  const DEFAULT_CATEGORIES = [
    {
      title: 'الأخبار',
      icon: '📰',
      description: 'آخر أخبار ونشاطات الفريق.',
      link: 'news.html',
      order: 1,
      active: true
    },
    {
      title: 'الفعاليات',
      icon: '📅',
      description: 'الفعاليات والمبادرات القادمة والسابقة.',
      link: 'events.html',
      order: 2,
      active: true
    },
    {
      title: 'المقالات',
      icon: '📚',
      description: 'مقالات ومواضيع معرفية ومجتمعية.',
      link: 'articles.html',
      order: 3,
      active: true
    },
    {
      title: 'الصحة',
      icon: '🩺',
      description: 'محتوى صحي وتوعوي موثوق.',
      link: 'health.html',
      order: 4,
      active: true
    },
    {
      title: 'البيئة',
      icon: '🌱',
      description: 'مبادرات وأفكار لحماية بيئتنا.',
      link: 'environment.html',
      order: 5,
      active: true
    },
    {
      title: 'استفسارات المواطنين',
      icon: '💬',
      description: 'أرسل استفسارك وتابع الرد من الفريق.',
      link: 'inquiry.html',
      order: 6,
      active: true
    },
    {
      title: 'تواصل معنا',
      icon: '📱',
      description: 'تابعنا وتواصل معنا عبر منصات التواصل الاجتماعي.',
      link: 'contact.html',
      order: 7,
      active: true
    }
  ];

  const $ = id => document.getElementById(id);

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

  function isAdmin() {
    return typeof currentUserRole !== 'undefined'
      && currentUserRole === 'admin';
  }

  async function seedDefaultCategories() {
    const snap = await db.collection('siteCategories').limit(1).get();

    if (!snap.empty) return;

    const batch = db.batch();

    DEFAULT_CATEGORIES.forEach(function (category) {
      const ref = db.collection('siteCategories').doc();

      batch.set(ref, {
        title: category.title,
        icon: category.icon,
        description: category.description,
        link: category.link,
        order: category.order,
        active: category.active,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });

    await batch.commit();
  }

  function resetForm() {
    $('siteCategoryId').value = '';
    $('siteCategoryTitle').value = '';
    $('siteCategoryIcon').value = '';
    $('siteCategoryDescription').value = '';
    $('siteCategoryLink').value = '';
    $('siteCategoryOrder').value = '1';
    $('siteCategoryActive').checked = true;

    $('saveSiteCategory').textContent = 'حفظ القسم';

    if ($('cancelSiteCategory')) {
      $('cancelSiteCategory').hidden = true;
    }
  }

  function editCategory(doc) {
    const data = doc.data();

    $('siteCategoryId').value = doc.id;
    $('siteCategoryTitle').value = data.title || '';
    $('siteCategoryIcon').value = data.icon || '';
    $('siteCategoryDescription').value = data.description || '';
    $('siteCategoryLink').value = data.link || '';
    $('siteCategoryOrder').value = Number(data.order || 1);
    $('siteCategoryActive').checked = data.active !== false;

    $('saveSiteCategory').textContent = 'حفظ التعديل';

    if ($('cancelSiteCategory')) {
      $('cancelSiteCategory').hidden = false;
    }

    $('siteCategoriesCard').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  async function deleteCategory(id) {
    if (!confirm('هل تريد حذف هذا القسم من الموقع؟')) return;

    try {
      await db.collection('siteCategories').doc(id).delete();
      await loadCategories();

      $('siteCategoryMessage').textContent = 'تم حذف القسم بنجاح.';
    } catch (error) {
      console.error(error);
      $('siteCategoryMessage').textContent =
        'تعذر حذف القسم. تأكد من صلاحيات المدير.';
    }
  }

  async function toggleCategory(id, active) {
    try {
      await db.collection('siteCategories').doc(id).update({
        active: active,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await loadCategories();
    } catch (error) {
      console.error(error);
      alert('تعذر تغيير حالة القسم.');
    }
  }

  async function loadCategories() {
    const box = $('siteCategoriesList');
    if (!box) return;

    box.innerHTML =
      '<div class="empty-state">جاري تحميل الأقسام...</div>';

    try {
      const snap = await db
        .collection('siteCategories')
        .orderBy('order', 'asc')
        .get();

      if (snap.empty) {
        box.innerHTML =
          '<div class="empty-state">لا توجد أقسام.</div>';
        return;
      }

      box.innerHTML = snap.docs.map(function (doc) {
        const data = doc.data();

        return `
          <article class="site-category-admin-item" data-id="${esc(doc.id)}">

            <div class="site-category-admin-icon">
              ${esc(data.icon || '●')}
            </div>

            <div class="site-category-admin-info">
              <h4>${esc(data.title || 'بدون اسم')}</h4>
              <p>${esc(data.description || '')}</p>

              <small>
                الرابط: ${esc(data.link || '—')}
                • الترتيب: ${Number(data.order || 0)}
              </small>
            </div>

            <div class="site-category-admin-actions">

              <label class="category-active-toggle">
                <input
                  type="checkbox"
                  class="category-active"
                  ${data.active !== false ? 'checked' : ''}
                >
                ظاهر
              </label>

              <button
                type="button"
                class="btn mini edit-category"
              >
                تعديل
              </button>

              <button
                type="button"
                class="btn mini danger delete-category"
              >
                حذف
              </button>

            </div>

          </article>
        `;
      }).join('');

      snap.docs.forEach(function (doc) {
        const item = box.querySelector(
          '[data-id="' + CSS.escape(doc.id) + '"]'
        );

        if (!item) return;

        const editBtn = item.querySelector('.edit-category');
        const deleteBtn = item.querySelector('.delete-category');
        const activeInput = item.querySelector('.category-active');

        if (editBtn) {
          editBtn.addEventListener('click', function () {
            editCategory(doc);
          });
        }

        if (deleteBtn) {
          deleteBtn.addEventListener('click', function () {
            deleteCategory(doc.id);
          });
        }

        if (activeInput) {
          activeInput.addEventListener('change', function () {
            toggleCategory(doc.id, activeInput.checked);
          });
        }
      });

    } catch (error) {
      console.error(error);

      box.innerHTML =
        '<div class="empty-state">تعذر تحميل الأقسام.</div>';
    }
  }

  async function saveCategory(event) {
    event.preventDefault();

    if (!isAdmin()) {
      alert('هذه العملية متاحة للمدير الكامل فقط.');
      return;
    }

    const id = $('siteCategoryId').value.trim();

    const data = {
      title: $('siteCategoryTitle').value.trim(),
      icon: $('siteCategoryIcon').value.trim(),
      description: $('siteCategoryDescription').value.trim(),
      link: $('siteCategoryLink').value.trim(),
      order: Number($('siteCategoryOrder').value || 1),
      active: $('siteCategoryActive').checked,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!data.title || !data.icon || !data.description || !data.link) {
      $('siteCategoryMessage').textContent =
        'يرجى إكمال جميع الحقول.';
      return;
    }

    const btn = $('saveSiteCategory');
    btn.disabled = true;

    try {
      if (id) {

        await db
          .collection('siteCategories')
          .doc(id)
          .update(data);

        $('siteCategoryMessage').textContent =
          'تم تعديل القسم بنجاح.';

      } else {

        data.createdAt =
          firebase.firestore.FieldValue.serverTimestamp();

        await db
          .collection('siteCategories')
          .add(data);

        $('siteCategoryMessage').textContent =
          'تمت إضافة القسم بنجاح.';
      }

      resetForm();
      await loadCategories();

    } catch (error) {
      console.error(error);

      $('siteCategoryMessage').textContent =
        'تعذر حفظ القسم. تأكد من صلاحيات المدير.';
    } finally {
      btn.disabled = false;
    }
  }

  async function start() {

    if (
      typeof auth === 'undefined' ||
      typeof db === 'undefined'
    ) {
      setTimeout(start, 100);
      return;
    }

    auth.onAuthStateChanged(async function (user) {

      if (!user || user.isAnonymous === true) return;

      try {

        const userSnap = await db
          .collection('users')
          .doc(user.uid)
          .get();

        if (
          !userSnap.exists ||
          userSnap.data().role !== 'admin'
        ) {
          return;
        }

        await seedDefaultCategories();
        await loadCategories();

      } catch (error) {
        console.error(
          'SITE CATEGORIES ADMIN ERROR:',
          error
        );
      }
    });

    const form = $('siteCategoryForm');

    if (form) {
      form.addEventListener('submit', saveCategory);
    }

    const newBtn = $('resetCategoryForm');

    if (newBtn) {
      newBtn.addEventListener('click', resetForm);
    }

    const cancelBtn = $('cancelSiteCategory');

    if (cancelBtn) {
      cancelBtn.addEventListener('click', resetForm);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();

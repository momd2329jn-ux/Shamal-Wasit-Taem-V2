(function () {

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
    return typeof currentUserRole !== 'undefined' &&
      currentUserRole === 'admin';
  }

  function resetForm() {

    $('siteCategoryId').value = '';
    $('siteCategoryTitle').value = '';
    $('siteCategoryIcon').value = '';
    $('siteCategoryDescription').value = '';
    $('siteCategoryOrder').value = '1';
    $('siteCategoryActive').checked = true;

    $('saveSiteCategory').textContent = 'حفظ القسم';

    if ($('cancelSiteCategory')) {
      $('cancelSiteCategory').hidden = true;
    }

    if ($('siteCategoryMessage')) {
      $('siteCategoryMessage').textContent = '';
    }
  }

  function editCategory(doc) {

    const data = doc.data();

    $('siteCategoryId').value = doc.id;
    $('siteCategoryTitle').value = data.title || '';
    $('siteCategoryIcon').value = data.icon || '';
    $('siteCategoryDescription').value =
      data.description || '';

    $('siteCategoryOrder').value =
      Number(data.order || 1);

    $('siteCategoryActive').checked =
      data.active !== false;

    $('saveSiteCategory').textContent =
      'حفظ التعديل';

    if ($('cancelSiteCategory')) {
      $('cancelSiteCategory').hidden = false;
    }

    $('siteCategoriesCard').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  async function deleteCategory(id) {

    if (!confirm(
      'هل تريد حذف هذا القسم ومنشوراته الموجودة داخله؟'
    )) {
      return;
    }

    try {

      const postsSnap = await db
        .collection('siteCategoryPosts')
        .where('categoryId', '==', id)
        .get();

      let batch = db.batch();
      let count = 0;

      for (const doc of postsSnap.docs) {

        batch.delete(
          db.collection('siteCategoryPosts').doc(doc.id)
        );

        count++;

        if (count === 450) {
          await batch.commit();
          batch = db.batch();
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      await db
        .collection('siteCategories')
        .doc(id)
        .delete();

      await loadCategories();

      if (typeof window.loadCustomCategories === 'function') {
        await window.loadCustomCategories();
      }

      $('siteCategoryMessage').textContent =
        'تم حذف القسم ومنشوراته بنجاح.';

    } catch (error) {

      console.error(error);

      $('siteCategoryMessage').textContent =
        'تعذر حذف القسم. تأكد من صلاحيات المدير.';
    }
  }

  async function toggleCategory(id, active) {

    try {

      await db
        .collection('siteCategories')
        .doc(id)
        .update({
          active: active,
          updatedAt:
            firebase.firestore.FieldValue.serverTimestamp()
        });

      await loadCategories();

      if (typeof window.loadCustomCategories === 'function') {
        await window.loadCustomCategories();
      }

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
        .where('type', '==', 'custom')
        .get();

      const docs = snap.docs.sort(function (a, b) {

        return Number(a.data().order || 0) -
          Number(b.data().order || 0);

      });

      if (!docs.length) {

        box.innerHTML =
          '<div class="empty-state">' +
          'لا توجد أقسام جديدة حاليًا.' +
          '</div>';

        return;
      }

      box.innerHTML = docs.map(function (doc) {

        const data = doc.data();

        return `
          <article
            class="site-category-admin-item"
            data-id="${esc(doc.id)}"
          >

            <div class="site-category-admin-icon">
              ${esc(data.icon || '●')}
            </div>

            <div class="site-category-admin-info">

              <h4>
                ${esc(data.title || 'بدون اسم')}
              </h4>

              <p>
                ${esc(data.description || '')}
              </p>

              <small>
                الترتيب: ${Number(data.order || 0)}
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

      docs.forEach(function (doc) {

        const item = box.querySelector(
          '[data-id="' + CSS.escape(doc.id) + '"]'
        );

        if (!item) return;

        const editBtn =
          item.querySelector('.edit-category');

        const deleteBtn =
          item.querySelector('.delete-category');

        const activeInput =
          item.querySelector('.category-active');

        if (editBtn) {
          editBtn.addEventListener(
            'click',
            function () {
              editCategory(doc);
            }
          );
        }

        if (deleteBtn) {
          deleteBtn.addEventListener(
            'click',
            function () {
              deleteCategory(doc.id);
            }
          );
        }

        if (activeInput) {
          activeInput.addEventListener(
            'change',
            function () {
              toggleCategory(
                doc.id,
                activeInput.checked
              );
            }
          );
        }

      });

    } catch (error) {

      console.error(error);

      box.innerHTML =
        '<div class="empty-state">' +
        'تعذر تحميل الأقسام.' +
        '</div>';
    }
  }

  async function saveCategory(event) {

    event.preventDefault();

    if (!isAdmin()) {

      alert(
        'هذه العملية متاحة للمدير الكامل فقط.'
      );

      return;
    }

    const id =
      $('siteCategoryId').value.trim();

    const title =
      $('siteCategoryTitle').value.trim();

    const icon =
      $('siteCategoryIcon').value.trim();

    const description =
      $('siteCategoryDescription').value.trim();

    const order =
      Number(
        $('siteCategoryOrder').value || 1
      );

    const active =
      $('siteCategoryActive').checked;

    if (!title || !icon || !description) {

      $('siteCategoryMessage').textContent =
        'يرجى إكمال جميع الحقول.';

      return;
    }

    const btn =
      $('saveSiteCategory');

    btn.disabled = true;

    try {

      const data = {

        title: title,
        icon: icon,
        description: description,
        order: order,
        active: active,
        type: 'custom',

        updatedAt:
          firebase.firestore.FieldValue
            .serverTimestamp()

      };

      if (id) {

        await db
          .collection('siteCategories')
          .doc(id)
          .update(data);

        $('siteCategoryMessage').textContent =
          'تم تعديل القسم بنجاح.';

      } else {

        data.createdAt =
          firebase.firestore.FieldValue
            .serverTimestamp();

        await db
          .collection('siteCategories')
          .add(data);

        $('siteCategoryMessage').textContent =
          'تمت إضافة القسم بنجاح.';
      }

      resetForm();

      await loadCategories();

      if (typeof window.loadCustomCategories === 'function') {
        await window.loadCustomCategories();
      }

      if (typeof window.loadPosts === 'function') {
        await window.loadPosts();
      }

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

    auth.onAuthStateChanged(
      async function (user) {

        if (!user || user.isAnonymous === true) {
          return;
        }

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

          await loadCategories();

        } catch (error) {

          console.error(
            'SITE CATEGORIES ADMIN ERROR:',
            error
          );
        }
      }
    );

    const form =
      $('siteCategoryForm');

    if (form) {
      form.addEventListener(
        'submit',
        saveCategory
      );
    }

    const newBtn =
      $('resetCategoryForm');

    if (newBtn) {
      newBtn.addEventListener(
        'click',
        resetForm
      );
    }

    const cancelBtn =
      $('cancelSiteCategory');

    if (cancelBtn) {
      cancelBtn.addEventListener(
        'click',
        resetForm
      );
    }
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

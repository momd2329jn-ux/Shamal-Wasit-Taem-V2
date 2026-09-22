// ======================================================
// admin.js - إدارة المنشورات + رفع الصور + الاستفسارات
// + الأقسام الديناميكية
// فريق شمال واسط
// ======================================================

function canManage(key) {
  return currentUserRole === 'admin' ||
    (currentPermissions || []).includes(key);
}

let currentUserRole = 'user';
let currentPermissions = [];
let stopAdminNotifications = null;
let currentUser = null;

// ======================================================
// الأقسام الأساسية - لا يتم تغييرها
// ======================================================

const ADMIN_CATEGORIES = {
  news: {
    title: 'الأخبار',
    icon: '📰',
    collection: 'news'
  },

  events: {
    title: 'الفعاليات',
    icon: '📅',
    collection: 'events'
  },

  articles: {
    title: 'المقالات',
    icon: '📚',
    collection: 'articles'
  },

  health: {
    title: 'الصحة',
    icon: '🩺',
    collection: 'health'
  },

  environment: {
    title: 'البيئة',
    icon: '🌱',
    collection: 'environment'
  }
};

// ======================================================
// الأقسام الجديدة الديناميكية
// ======================================================

const CUSTOM_CATEGORIES = {};

const $ = id => document.getElementById(id);

const esc = v => String(v || '').replace(/[&<>'"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[c]));

// ======================================================
// تحميل الأقسام الجديدة
// ======================================================

async function loadCustomCategories() {

  try {

    const snap = await db
      .collection('siteCategories')
      .where('type', '==', 'custom')
      .get();

    Object.keys(CUSTOM_CATEGORIES).forEach(key => {
      delete CUSTOM_CATEGORIES[key];
    });

    snap.forEach(doc => {

      const d = doc.data();

      CUSTOM_CATEGORIES['custom:' + doc.id] = {
        title: d.title || 'قسم جديد',
        icon: d.icon || '●',
        collection: 'siteCategoryPosts',
        categoryId: doc.id,
        active: d.active !== false
      };

    });

    updateCategorySelectors();

  } catch (error) {

    console.error(
      'LOAD CUSTOM CATEGORIES ERROR:',
      error
    );

  }
}

// ======================================================
// تحديث قائمة اختيار القسم
// ======================================================

function updateCategorySelectors() {

  const categorySelect = $('category');
  const filterSelect = $('filterCategory');

  if (!categorySelect || !filterSelect) {
    return;
  }

  // ----------------------------------------------------
  // الاحتفاظ بالقيمة الحالية
  // ----------------------------------------------------

  const currentCategory =
    categorySelect.value;

  const currentFilter =
    filterSelect.value;

  // ----------------------------------------------------
  // الأقسام الأساسية
  // ----------------------------------------------------

  const baseCategoryOptions = [
    {
      value: 'news',
      label: '📰 الأخبار'
    },
    {
      value: 'events',
      label: '📅 الفعاليات'
    },
    {
      value: 'articles',
      label: '📚 المقالات'
    },
    {
      value: 'health',
      label: '🩺 الصحة'
    },
    {
      value: 'environment',
      label: '🌱 البيئة'
    }
  ];

  // ----------------------------------------------------
  // إعادة بناء قائمة المنشور
  // ----------------------------------------------------

  categorySelect.innerHTML =
    baseCategoryOptions.map(option => `
      <option value="${option.value}">
        ${option.label}
      </option>
    `).join('');

  // ----------------------------------------------------
  // الأقسام الجديدة - المدير فقط
  // ----------------------------------------------------

  if (currentUserRole === 'admin') {

    Object.keys(CUSTOM_CATEGORIES)
      .sort((a, b) =>
        CUSTOM_CATEGORIES[a].title.localeCompare(
          CUSTOM_CATEGORIES[b].title,
          'ar'
        )
      )
      .forEach(key => {

        const cfg =
          CUSTOM_CATEGORIES[key];

        if (cfg.active === false) {
          return;
        }

        const option =
          document.createElement('option');

        option.value = key;

        option.textContent =
          cfg.icon + ' ' + cfg.title;

        categorySelect.appendChild(option);

      });
  }

  // ----------------------------------------------------
  // فلتر المنشورات
  // ----------------------------------------------------

  filterSelect.innerHTML = `
    <option value="all">
      الكل
    </option>

    ${baseCategoryOptions.map(option => `
      <option value="${option.value}">
        ${option.label}
      </option>
    `).join('')}

    ${
      currentUserRole === 'admin'
        ? Object.keys(CUSTOM_CATEGORIES)
            .sort((a, b) =>
              CUSTOM_CATEGORIES[a].title.localeCompare(
                CUSTOM_CATEGORIES[b].title,
                'ar'
              )
            )
            .map(key => {

              const cfg =
                CUSTOM_CATEGORIES[key];

              return `
                <option value="${key}">
                  ${cfg.icon} ${esc(cfg.title)}
                </option>
              `;

            }).join('')
        : ''
    }
  `;

  // ----------------------------------------------------
  // استرجاع القيم السابقة إذا كانت ما زالت موجودة
  // ----------------------------------------------------

  if (
    [...categorySelect.options]
      .some(o => o.value === currentCategory)
  ) {
    categorySelect.value =
      currentCategory;
  }

  if (
    [...filterSelect.options]
      .some(o => o.value === currentFilter)
  ) {
    filterSelect.value =
      currentFilter;
  }

  // ----------------------------------------------------
  // إذا لم تكن القيمة موجودة
  // ----------------------------------------------------

  if (!categorySelect.value) {
    categorySelect.value = 'news';
  }

  if (!filterSelect.value) {
    filterSelect.value = 'all';
  }

  $('eventDateWrap').hidden =
    categorySelect.value !== 'events';
}

// ======================================================
// الصور - ضغط قوي لضمان الحجم أقل من 1MB
// ======================================================

let selectedImageData = null;
let removeExistingImage = false;

function clearImageState() {

  selectedImageData = null;
  removeExistingImage = false;

  const input = $('imageFile');

  if (input) {
    input.value = '';
  }

  const preview = $('imagePreview');
  const previewImg = $('imagePreviewImg');

  if (preview) {
    preview.hidden = true;
  }

  if (previewImg) {
    previewImg.removeAttribute('src');
  }
}

function showImagePreview(src) {

  const preview = $('imagePreview');
  const previewImg = $('imagePreviewImg');

  if (!preview || !previewImg) {
    return;
  }

  previewImg.src = src;
  preview.hidden = false;
}

// ======================================================
// ضغط الصور - Firestore Base64
// ======================================================

async function compressImage(file) {

  if (!file || !file.type.startsWith('image/')) {
    throw new Error('الملف المختار ليس صورة.');
  }

  const originalUrl =
    URL.createObjectURL(file);

  try {

    const img = new Image();

    await new Promise(function (resolve, reject) {

      img.onload = resolve;

      img.onerror = function () {
        reject(
          new Error('تعذر فتح الصورة.')
        );
      };

      img.src = originalUrl;

    });

    const dimensions = [
      900,
      800,
      700,
      600
    ];

    const qualities = [
      0.72,
      0.62,
      0.52,
      0.42,
      0.32
    ];

    const MAX_BLOB_SIZE =
      250 * 1024;

    for (const MAX_SIZE of dimensions) {

      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (
        width > MAX_SIZE ||
        height > MAX_SIZE
      ) {

        if (width >= height) {

          height = Math.round(
            height *
            (MAX_SIZE / width)
          );

          width = MAX_SIZE;

        } else {

          width = Math.round(
            width *
            (MAX_SIZE / height)
          );

          height = MAX_SIZE;
        }
      }

      const canvas =
        document.createElement('canvas');

      canvas.width = width;
      canvas.height = height;

      const ctx =
        canvas.getContext('2d');

      if (!ctx) {
        throw new Error(
          'تعذر تجهيز الصورة.'
        );
      }

      ctx.fillStyle = '#ffffff';

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      for (const quality of qualities) {

        const blob =
          await new Promise(function (resolve) {

            canvas.toBlob(
              resolve,
              'image/jpeg',
              quality
            );

          });

        if (!blob) {
          continue;
        }

        if (
          blob.size <= MAX_BLOB_SIZE
        ) {

          const dataUrl =
            await new Promise(
              function (resolve, reject) {

                const reader =
                  new FileReader();

                reader.onload = function () {
                  resolve(reader.result);
                };

                reader.onerror = function () {
                  reject(
                    new Error(
                      'تعذر قراءة الصورة.'
                    )
                  );
                };

                reader.readAsDataURL(blob);

              }
            );

          return dataUrl;
        }
      }
    }

    throw new Error(
      'الصورة كبيرة جدًا. جرّب صورة أصغر.'
    );

  } finally {

    URL.revokeObjectURL(
      originalUrl
    );
  }
}

// ======================================================
// اختيار صورة من الجهاز
// ======================================================

const imageFileInput =
  $('imageFile');

if (imageFileInput) {

  imageFileInput.addEventListener(
    'change',
    async () => {

      const file =
        imageFileInput.files?.[0];

      if (!file) return;

      if (!file.type.startsWith('image/')) {

        alert(
          'الرجاء اختيار صورة فقط.'
        );

        imageFileInput.value = '';

        return;
      }

      try {

        showMessage(
          'جاري تجهيز الصورة...'
        );

        selectedImageData =
          await compressImage(file);

        removeExistingImage =
          false;

        showImagePreview(
          selectedImageData
        );

        showMessage(
          'تم تجهيز الصورة، اضغط حفظ المنشور.',
          true
        );

      } catch (e) {

        console.error(e);

        selectedImageData =
          null;

        imageFileInput.value = '';

        alert(
          'تعذر تجهيز الصورة. جرّب صورة أصغر.'
        );
      }
    }
  );
}

// ======================================================
// إزالة الصورة
// ======================================================

const removeImageButton =
  $('removeImage');

if (removeImageButton) {

  removeImageButton.addEventListener(
    'click',
    () => {

      selectedImageData =
        null;

      removeExistingImage =
        true;

      const input =
        $('imageFile');

      if (input) {
        input.value = '';
      }

      const preview =
        $('imagePreview');

      if (preview) {
        preview.hidden = true;
      }

      const previewImg =
        $('imagePreviewImg');

      if (previewImg) {
        previewImg.removeAttribute('src');
      }

      showMessage(
        'تمت إزالة الصورة. احفظ المنشور لتأكيد التغيير.',
        true
      );
    }
  );
}

// ======================================================
// الرسائل والنموذج
// ======================================================

function showMessage(
  text,
  ok = false
) {

  const el =
    $('formMessage');

  if (!el) return;

  el.textContent =
    text;

  el.className =
    'form-message ' +
    (ok ? 'success' : 'error');
}

function resetForm() {

  $('postForm').reset();

  $('editingId').value = '';

  $('formTitle').textContent =
    'إضافة منشور جديد';

  $('saveBtn').textContent =
    'حفظ المنشور';

  $('cancelEdit').hidden =
    true;

  $('eventDateWrap').hidden =
    $('category').value !== 'events';

  clearImageState();

  showMessage('');

  updateCategorySelectors();
}

function dateText(d) {

  return d?.toDate
    ? d.toDate().toLocaleString('ar-IQ')
    : d || '';
}

// ======================================================
// الحصول على إعداد قسم
// ======================================================

function getCategoryConfig(key) {

  if (ADMIN_CATEGORIES[key]) {
    return ADMIN_CATEGORIES[key];
  }

  if (CUSTOM_CATEGORIES[key]) {
    return CUSTOM_CATEGORIES[key];
  }

  return null;
}

// ======================================================
// هل القسم ديناميكي؟
// ======================================================

function isCustomCategory(key) {

  return Boolean(
    CUSTOM_CATEGORIES[key]
  );
}

// ======================================================
// المنشورات
// ======================================================

function postItem(doc, key) {

  const d =
    doc.data();

  const cfg =
    getCategoryConfig(key) ||
    ADMIN_CATEGORIES.news;

  const image =
    d.imageData ||
    d.imageUrl ||
    '';

  return `
    <div class="admin-post">

      <div>

        ${
          image
            ? `
              <img
                src="${esc(image)}"
                alt=""
                loading="lazy"
                style="width:90px;height:65px;object-fit:cover;border-radius:10px;margin-bottom:10px;display:block;"
              >
            `
            : ''
        }

        <div class="post-meta">

          ${esc(cfg.icon)}
          ${esc(cfg.title)}

          ${
            d.createdAt
              ? '• ' +
                esc(dateText(d.createdAt))
              : ''
          }

        </div>

        <h4>
          ${esc(d.title || 'بدون عنوان')}
        </h4>

        <p>
          ${esc(d.content || '')}
        </p>

      </div>

      <div class="admin-post-actions">

        <button
          type="button"
          class="btn mini edit-post"
          data-id="${esc(doc.id)}"
          data-category="${esc(key)}"
        >
          تعديل
        </button>

        <button
          type="button"
          class="btn mini danger delete-post"
          data-id="${esc(doc.id)}"
          data-category="${esc(key)}"
        >
          حذف
        </button>

      </div>

    </div>
  `;
}

// ======================================================
// تحميل المنشورات
// ======================================================

async function loadPosts() {

  const box =
    $('postsList');

  if (!box) return;

  const filter =
    $('filterCategory').value;

  box.innerHTML =
    '<div class="empty-state">جاري التحميل...</div>';

  try {

    let all = [];

    // --------------------------------------------------
    // الأقسام الأساسية
    // --------------------------------------------------

    const baseKeys =
      (
        filter === 'all'
          ? Object.keys(ADMIN_CATEGORIES)
          : ADMIN_CATEGORIES[filter]
            ? [filter]
            : []
      ).filter(canManage);

    for (const key of baseKeys) {

      const snap =
        await db
          .collection(
            ADMIN_CATEGORIES[key].collection
          )
          .orderBy(
            'createdAt',
            'desc'
          )
          .get();

      snap.forEach(doc => {

        all.push({
          doc,
          key
        });

      });
    }

    // --------------------------------------------------
    // الأقسام الجديدة
    // المدير فقط
    // --------------------------------------------------

    if (
      currentUserRole === 'admin' &&
      (
        filter === 'all' ||
        isCustomCategory(filter)
      )
    ) {

      let customSnap =
        await db
          .collection('siteCategoryPosts')
          .orderBy(
            'createdAt',
            'desc'
          )
          .get();

      customSnap.forEach(doc => {

        const data =
          doc.data();

        const key =
          data.category ||
          (
            data.categoryId
              ? 'custom:' +
                data.categoryId
              : ''
          );

        if (
          !key ||
          !CUSTOM_CATEGORIES[key]
        ) {
          return;
        }

        if (
          filter !== 'all' &&
          filter !== key
        ) {
          return;
        }

        all.push({
          doc,
          key
        });

      });
    }

    // --------------------------------------------------
    // ترتيب الكل حسب التاريخ
    // --------------------------------------------------

    all.sort((a, b) =>
      (
        b.doc.data()
          .createdAt
          ?.toMillis?.() || 0
      ) -
      (
        a.doc.data()
          .createdAt
          ?.toMillis?.() || 0
      )
    );

    box.innerHTML =
      all.length
        ? all
            .map(x =>
              postItem(
                x.doc,
                x.key
              )
            )
            .join('')
        : `
          <div class="empty-state">
            لا توجد منشورات حاليًا
          </div>
        `;

  } catch (e) {

    console.error(e);

    box.innerHTML =
      '<div class="empty-state">' +
      'تعذر تحميل المنشورات.' +
      '</div>';
  }
}

// ======================================================
// تعديل منشور
// ======================================================

async function loadForEdit(
  id,
  key
) {

  try {

    const cfg =
      getCategoryConfig(key);

    if (!cfg) {

      alert(
        'تعذر العثور على القسم.'
      );

      return;
    }

    const snap =
      await db
        .collection(
          cfg.collection
        )
        .doc(id)
        .get();

    if (!snap.exists) {
      return;
    }

    const d =
      snap.data();

    $('editingId').value =
      id;

    $('category').value =
      key;

    $('title').value =
      d.title || '';

    $('content').value =
      d.content || '';

    $('eventDate').value =
      d.eventDate || '';

    $('eventDateWrap').hidden =
      key !== 'events';

    $('formTitle').textContent =
      'تعديل المنشور';

    $('saveBtn').textContent =
      'حفظ التعديلات';

    $('cancelEdit').hidden =
      false;

    selectedImageData =
      null;

    removeExistingImage =
      false;

    const existingImage =
      d.imageData ||
      d.imageUrl ||
      '';

    if (existingImage) {

      showImagePreview(
        existingImage
      );

    } else {

      const preview =
        $('imagePreview');

      if (preview) {
        preview.hidden = true;
      }
    }

    // --------------------------------------------------
    // منع تغيير القسم أثناء التعديل
    // --------------------------------------------------

    $('category').disabled =
      true;

    window.scrollTo({
      top:
        document.querySelector(
          '.admin-section'
        ).offsetTop - 90,

      behavior: 'smooth'
    });

  } catch (e) {

    console.error(e);

    alert(
      'تعذر فتح المنشور للتعديل.'
    );
  }
}

// ======================================================
// حذف منشور
// ======================================================

async function deletePost(
  id,
  key
) {

  if (
    !confirm(
      'هل أنت متأكد من حذف هذا المنشور؟'
    )
  ) {
    return;
  }

  try {

    const cfg =
      getCategoryConfig(key);

    if (!cfg) {

      alert(
        'تعذر العثور على القسم.'
      );

      return;
    }

    await db
      .collection(
        cfg.collection
      )
      .doc(id)
      .delete();

    await loadPosts();

    if (
      typeof refreshDashboard ===
      'function'
    ) {
      await refreshDashboard();
      }

  } catch (e) {

    console.error(e);

    alert(
      'تعذر حذف المنشور.'
    );
  }
}

// ======================================================
// الاستفسارات
// ======================================================

async function loadInquiries() {

  const box =
    $('inquiriesList');

  box.innerHTML =
    '<div class="empty-state">جاري تحميل الاستفسارات...</div>';

  try {

    const snap =
      await db
        .collection('inquiries')
        .get();

    const rows =
      snap.docs.sort((a, b) =>
        (
          b.data()
            .createdAt
            ?.toMillis?.() || 0
        ) -
        (
          a.data()
            .createdAt
            ?.toMillis?.() || 0
        )
      );

    if (!rows.length) {

      box.innerHTML =
        '<div class="empty-state">' +
        'لا توجد استفسارات حاليًا.' +
        '</div>';

      return;
    }

    const unseen =
      rows.filter(doc =>
        doc.data().adminSeen !== true &&
        doc.data().status === 'new'
      );

    if (unseen.length) {

      await Promise.all(
        unseen.map(doc =>
          db
            .collection('inquiries')
            .doc(doc.id)
            .update({
              adminSeen: true
            })
        )
      );
    }

    const users = {};

    for (const doc of rows) {

      const uid =
        doc.data().userId;

      if (uid && !users[uid]) {

        const u =
          await db
            .collection('users')
            .doc(uid)
            .get();

        users[uid] =
          u.exists
            ? u.data()
            : {};
      }
    }

    box.innerHTML =
      rows.map(doc => {

        const d =
          doc.data();

        const u =
          users[d.userId] || {};

        return `
          <article
            class="admin-inquiry"
            data-inquiry-id="${doc.id}"
          >

            <div>

              <div class="post-meta">

                ${esc(d.type)}

                ${
                  d.createdAt
                    ? '• ' +
                      esc(
                        dateText(
                          d.createdAt
                        )
                      )
                    : ''
                }

              </div>

              <h4>
                ${esc(d.title)}
              </h4>

              <p>
                ${esc(d.message)}
              </p>

              <small>
                المستخدم:
                ${esc(
                  u.fullName ||
                  'عضو'
                )}
                —
                ${esc(u.email || '')}
              </small>

              ${
                d.reply
                  ? `
                    <div class="inquiry-reply">

                      <strong>
                        الرد الحالي
                      </strong>

                      <p>
                        ${esc(d.reply)}
                      </p>

                    </div>
                  `
                  : ''
              }

            </div>

            <div class="inquiry-actions">

              <textarea
                class="reply-input"
                rows="4"
                placeholder="اكتب رد الفريق..."
              >${esc(d.reply || '')}</textarea>

              <button
                class="btn primary reply-inquiry"
                data-id="${doc.id}"
              >
                ${
                  d.reply
                    ? 'تحديث الرد'
                    : 'إرسال الرد'
                }
              </button>

              <button
                class="btn mini danger delete-inquiry"
                data-id="${doc.id}"
              >
                حذف
              </button>

            </div>

          </article>
        `;

      }).join('');

  } catch (e) {

    console.error(e);

    box.innerHTML =
      '<div class="empty-state">' +
      'تعذر تحميل الاستفسارات.' +
      '</div>';
  }
}
// ======================================================
// أعضاء الفريق
// ======================================================

async function loadMembers() {

  const box = $('membersList');

  if (!box) return;

  box.innerHTML =
    '<div class="empty-state">جاري تحميل الأعضاء...</div>';

  try {

    // --------------------------------------------------
    // الأعضاء متاحون للمدير الكامل فقط
    // --------------------------------------------------

    if (currentUserRole !== 'admin') {

      box.innerHTML =
        '<div class="empty-state">' +
        'لا تملك صلاحية عرض أعضاء الفريق.' +
        '</div>';

      return;
    }

    const snap =
      await db
        .collection('users')
        .get();

    const members =
      snap.docs
        .map(doc => ({
          id: doc.id,
          data: doc.data()
        }))
        .filter(member =>
          member.data.role !== 'admin'
        )
        .sort((a, b) => {

          const aTime =
            a.data.createdAt?.toMillis?.() || 0;

          const bTime =
            b.data.createdAt?.toMillis?.() || 0;

          return bTime - aTime;
        });

    if (!members.length) {

      box.innerHTML =
        '<div class="empty-state">' +
        'لا يوجد أعضاء مسجلون حاليًا.' +
        '</div>';

      return;
    }

    box.innerHTML =
      members.map(member => {

        const d = member.data;

        const role =
          String(d.role || 'user')
            .trim()
            .toLowerCase();

        let roleText = 'عضو';

        if (role === 'supervisor') {
          roleText = 'مشرف متخصص';
        }

        if (role === 'admin') {
          roleText = 'مدير كامل';
        }

        return `
          <article class="admin-member">

            <div class="admin-member-info">

              <div class="admin-member-head">

                <div class="admin-member-avatar">
                  👤
                </div>

                <div>
                  <h4>
                    ${esc(d.fullName || 'بدون اسم')}
                  </h4>

                  <span class="post-meta">
                    ${esc(roleText)}
                  </span>
                </div>

              </div>

              <div class="admin-member-details">

                <div>
                  <strong>📱 الهاتف</strong>
                  <span>
                    ${esc(d.phone || 'غير مسجل')}
                  </span>
                </div>

                <div>
                  <strong>📧 البريد الإلكتروني</strong>
                  <span>
                    ${esc(d.email || 'غير مسجل')}
                  </span>
                </div>

                <div>
                  <strong>🎓 الاختصاص</strong>
                  <span>
                    ${esc(d.specialization || 'غير مسجل')}
                  </span>
                </div>

                <div>
                  <strong>💼 المهنة</strong>
                  <span>
                    ${esc(d.profession || 'غير مسجل')}
                  </span>
                </div>

                <div>
                  <strong>🎂 تاريخ الميلاد</strong>
                  <span>
                    ${esc(d.birthDate || 'غير مسجل')}
                  </span>
                </div>

                <div>
                  <strong>📚 المستوى التعليمي</strong>
                  <span>
                    ${esc(d.education || 'غير مسجل')}
                  </span>
                </div>

                <div>
                  <strong>📅 تاريخ التسجيل</strong>
                  <span>
                    ${
                      d.createdAt
                        ? esc(dateText(d.createdAt))
                        : 'غير معروف'
                    }
                  </span>
                </div>

              </div>

            </div>

          </article>
        `;

      }).join('');

  } catch (error) {

    console.error(
      'LOAD MEMBERS ERROR:',
      error
    );

    box.innerHTML =
      '<div class="empty-state">' +
      'تعذر تحميل بيانات الأعضاء.' +
      '</div>';
  }
}
// ======================================================
// الأحداث
// ======================================================
const refreshMembersButton = $('refreshMembers');

if (refreshMembersButton) {
  refreshMembersButton.addEventListener('click', loadMembers);
}

$('category').addEventListener(
  'change',
  () => {

    $('eventDateWrap').hidden =
      $('category').value !== 'events';

  }
);

$('filterCategory').addEventListener(
  'change',
  loadPosts
);

$('cancelEdit').addEventListener(
  'click',
  resetForm
);

$('refreshInquiries').addEventListener(
  'click',
  loadInquiries
);

// ======================================================
// أزرار المنشورات
// ======================================================

$('postsList').addEventListener(
  'click',
  e => {

    const edit =
      e.target.closest('.edit-post');

    const del =
      e.target.closest('.delete-post');

    if (edit) {

      loadForEdit(
        edit.dataset.id,
        edit.dataset.category
      );
    }

    if (del) {

      deletePost(
        del.dataset.id,
        del.dataset.category
      );
    }
  }
);

// ======================================================
// الاستفسارات - رد وحذف
// ======================================================

$('inquiriesList').addEventListener(
  'click',
  async e => {

    const reply =
      e.target.closest(
        '.reply-inquiry'
      );

    const del =
      e.target.closest(
        '.delete-inquiry'
      );

    if (reply) {

      const card =
        reply.closest(
          '.admin-inquiry'
        );

      const text =
        card
          .querySelector(
            '.reply-input'
          )
          .value
          .trim();

      if (!text) {

        alert(
          'اكتب الرد أولًا.'
        );

        return;
      }

      reply.disabled =
        true;

      try {

        await db
          .collection('inquiries')
          .doc(reply.dataset.id)
          .update({

            reply: text,

            repliedAt:
              firebase.firestore
                .FieldValue
                .serverTimestamp(),

            status:
              'replied'

          });

        await loadInquiries();

      } catch (err) {

        console.error(err);

        alert(
          'تعذر حفظ الرد.'
        );

      } finally {

        reply.disabled =
          false;
      }
    }

    if (del) {

      if (
        !confirm(
          'حذف الاستفسار نهائيًا؟'
        )
      ) {
        return;
      }

      try {

        await db
          .collection('inquiries')
          .doc(
            del.dataset.id
          )
          .delete();

        await loadInquiries();

      } catch (err) {

        console.error(err);

        alert(
          'تعذر حذف الاستفسار.'
        );
      }
    }
  }
);

// ======================================================
// حفظ المنشور
// ======================================================

$('postForm').addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    showMessage(
      'جاري الحفظ...'
    );

    const key =
      $('category').value;

    const cfg =
      getCategoryConfig(key);

    const id =
      $('editingId').value.trim();

    if (!cfg) {

      showMessage(
        'تعذر العثور على القسم.'
      );

      return;
    }

    // --------------------------------------------------
    // الصلاحيات
    // --------------------------------------------------

    if (
      isCustomCategory(key)
    ) {

      if (
        currentUserRole !== 'admin'
      ) {

        showMessage(
          'الأقسام الجديدة متاحة للمدير الكامل فقط.'
        );

        return;
      }

    } else if (!canManage(key)) {

      showMessage(
        'ليست لديك صلاحية لإدارة هذا القسم.'
      );

      return;
    }

    const data = {

      title:
        $('title').value.trim(),

      content:
        $('content').value.trim(),

      category:
        key,

      updatedAt:
        firebase.firestore.FieldValue
          .serverTimestamp()

    };

    // --------------------------------------------------
    // بيانات القسم الجديد
    // --------------------------------------------------

    if (
      isCustomCategory(key)
    ) {

      data.categoryId =
        cfg.categoryId;

      data.categoryTitle =
        cfg.title;

    }

    // --------------------------------------------------
    // تاريخ الفعالية
    // --------------------------------------------------

    if (
      key === 'events' &&
      $('eventDate').value
    ) {

      data.eventDate =
        $('eventDate').value;

    } else if (
      key === 'events'
    ) {

      data.eventDate =
        '';

    }

    try {

      // =================================================
      // حفظ الصورة
      // =================================================

      if (selectedImageData) {

        data.imageData =
          selectedImageData;

        if (id) {

          data.imageUrl =
            firebase.firestore
              .FieldValue
              .delete();
        }

      } else if (
        id &&
        removeExistingImage
      ) {

        data.imageData =
          firebase.firestore
            .FieldValue
            .delete();

        data.imageUrl =
          firebase.firestore
            .FieldValue
            .delete();
      }

      // =================================================
      // الحفظ في المجموعة الصحيحة
      // =================================================

      if (id) {

        await db
          .collection(
            cfg.collection
          )
          .doc(id)
          .update(data);

      } else {

        data.createdAt =
          firebase.firestore
            .FieldValue
            .serverTimestamp();

        data.authorId =
          currentUser.uid;

        await db
          .collection(
            cfg.collection
          )
          .add(data);
      }

      showMessage(
        id
          ? 'تم تعديل المنشور بنجاح.'
          : 'تمت إضافة المنشور بنجاح.',
        true
      );

      resetForm();

      await loadPosts();

      if (
        typeof refreshDashboard ===
        'function'
      ) {

        await refreshDashboard();
      }

    } catch (err) {

      console.error(
        'SAVE POST ERROR:',
        err
      );

      const code =
        err?.code || '';

      const message =
        String(
          err?.message || ''
        );

      if (
        code ===
          'resource-exhausted' ||
        message
          .toLowerCase()
          .includes('1 mib') ||
        message
          .toLowerCase()
          .includes('maximum')
      ) {

        showMessage(
          'الصورة كبيرة جدًا. اختر صورة أصغر وحاول مرة أخرى.'
        );

      } else if (
        code ===
        'permission-denied'
      ) {

        showMessage(
          'لا توجد صلاحية لحفظ المنشور في هذا القسم.'
        );

      } else if (
        code ===
        'failed-precondition'
      ) {

        showMessage(
          'يوجد إعداد ناقص في Firestore.'
        );

      } else {

        showMessage(
          'خطأ الحفظ: ' +
          (
            message ||
            code ||
            'خطأ غير معروف'
          )
        );
      }

      alert(
        'خطأ الحفظ الحقيقي:\n\n' +
        (
          message ||
          code ||
          'خطأ غير معروف'
        )
      );
    }
  }
);

// ======================================================
// تسجيل الخروج
// ======================================================

$('logoutBtn').addEventListener(
  'click',
  async () => {

    await auth.signOut();

    location.href =
      'index.html';
  }
);

// ======================================================
// إشعارات الإدارة
// ======================================================

function updateAdminNotificationBadge(
  count
) {

  const b =
    document.getElementById(
      'adminNotificationBadge'
    );

  if (!b) return;

  b.textContent =
    count > 0
      ? '🔔 ' +
        count +
        ' استفسار جديد'
      : '🔔 لا توجد استفسارات جديدة';

  b.classList.toggle(
    'has-alert',
    count > 0
  );
}

// ======================================================
// التحقق من الحساب والصلاحيات
// ======================================================

auth.onAuthStateChanged(
  async user => {

    console.log(
      'ADMIN AUTH CHECK:',
      user
        ? user.uid
        : 'NO USER'
    );

    if (!user) {

      location.href =
        'login.html?next=admin.html';

      return;
    }

    currentUser =
      user;

    try {

      console.log(
        'ADMIN: جاري قراءة بيانات المستخدم...'
      );

      const doc =
        await db
          .collection('users')
          .doc(user.uid)
          .get();

      console.log(
        'ADMIN USER DOC:',
        doc.exists
          ? doc.data()
          : 'DOCUMENT NOT FOUND'
      );

      if (!doc.exists) {

        $('adminGate').innerHTML =
          'لم يتم العثور على بيانات المشرف في قاعدة البيانات.<br>' +
          '<a class="btn primary" href="index.html">العودة للرئيسية</a>';

        return;
      }

      const userData =
        doc.data();

      const role =
        String(
          userData.role ||
          'user'
        )
          .trim()
          .toLowerCase();

      console.log(
        'ADMIN ROLE:',
        role
      );

      if (
        ![
          'admin',
          'supervisor'
        ].includes(role)
      ) {

        $('adminGate').innerHTML =
          'ليس لديك صلاحية للوصول إلى لوحة الإدارة.<br>' +
          '<a class="btn primary" href="index.html">العودة للرئيسية</a>';

        return;
      }

      currentUserRole =
        role;

      currentPermissions =
        Array.isArray(
          userData.permissions
        )
          ? userData.permissions
          : [];

      $('adminGate').hidden =
        true;

      $('adminApp').hidden =
        false;

      $('adminEmail').textContent =
        'المشرف: ' +
        (user.email || '') +
        ' — ' +
        (
          currentUserRole === 'admin'
            ? 'مدير كامل'
            : 'مشرف متخصص'
        );

      // =================================================
      // تحميل الأقسام الجديدة
      // =================================================

      await loadCustomCategories();

      // =================================================
      // المشرف المتخصص
      // =================================================

      if (
        currentUserRole !== 'admin'
      ) {

        $('filterCategory')
          .querySelectorAll('option')
          .forEach(o => {

            if (
              o.value !== 'all' &&
              !canManage(o.value)
            ) {

              o.hidden =
                true;
            }
          });

        $('category')
          .querySelectorAll('option')
          .forEach(o => {

            if (
              !canManage(o.value)
            ) {

              o.remove();
            }
          });

        $('supervisorsCard').hidden =
          true;

        const inquiriesCard =
          $('inquiriesList')
            .closest(
              '.admin-wide-card'
            );

        if (inquiriesCard) {

          inquiriesCard.hidden =
            !canManage(
              'inquiries'
            );
        }

        const canManagePosts =
          Object.keys(
            ADMIN_CATEGORIES
          ).some(
            canManage
          );

        $('postForm').hidden =
          !canManagePosts;

        const postsCard =
          $('postsList')
            .closest(
              '.admin-card'
            );

        if (postsCard) {

          postsCard.hidden =
            !canManagePosts;
        }
      }

      // =================================================
      // تحميل المنشورات
      // =================================================

      console.log(
        'ADMIN: جاري تحميل المنشورات...'
      );

      await loadPosts();

      console.log(
        'ADMIN: تم تحميل المنشورات.'
      );

      // =================================================
      // الاستفسارات
      // =================================================

      if (
        canManage('inquiries')
      ) {

        await loadInquiries();

        if (
          window.WasitNotifications
        ) {

          stopAdminNotifications =
            WasitNotifications
              .listenAdminInquiries(
                user,
                updateAdminNotificationBadge
              );
        }
      }

      // =================================================
      // المشرفون
      // =================================================

      if (
        typeof loadSupervisors ===
          'function' &&
        currentUserRole ===
          'admin'
      ) {

        await loadSupervisors();
      }
// =================================================
// أعضاء الفريق
// =================================================

if (
  currentUserRole === 'admin'
) {

  await loadMembers();
}
      // =================================================
      // لوحة الإحصائيات
      // =================================================

      if (
        typeof refreshDashboard ===
          'function'
      ) {

        await refreshDashboard();
      }

      console.log(
        'ADMIN: تم فتح لوحة التحكم بنجاح.'
      );

    } catch (e) {

      console.error(
        'ADMIN ACCESS ERROR:',
        e
      );

      $('adminGate').innerHTML =
        'حدث خطأ أثناء التحقق من صلاحيات المشرف.<br><br>' +
        '<small>' +
        (
          e?.message ||
          e?.code ||
          'خطأ غير معروف'
        ) +
        '</small>';
    }
  }
);

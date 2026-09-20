// ======================================================
// admin.js - إدارة المنشورات + رفع الصور + الاستفسارات
// فريق شمال واسط
// ======================================================

function canManage(key){
  return currentUserRole === 'admin' || (currentPermissions || []).includes(key);
}

let currentUserRole = 'user';
let currentPermissions = [];
let stopAdminNotifications = null;
let currentUser = null;

const ADMIN_CATEGORIES = {
  news: { title: 'الأخبار', icon: '📰', collection: 'news' },
  events: { title: 'الفعاليات', icon: '📅', collection: 'events' },
  articles: { title: 'المقالات', icon: '📚', collection: 'articles' },
  health: { title: 'الصحة', icon: '🩺', collection: 'health' },
  environment: { title: 'البيئة', icon: '🌱', collection: 'environment' }
};

const $ = id => document.getElementById(id);

const esc = v => String(v || '').replace(/[&<>'"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[c]));


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


    // أحجام الصورة التي سيتم تجربتها
    const dimensions = [
      900,
      800,
      700,
      600
    ];

    // مستويات الضغط
    const qualities = [
      0.72,
      0.62,
      0.52,
      0.42,
      0.32
    ];

    // حجم الصورة الثنائية قبل Base64
    // حتى تبقى داخل الحد الآمن لـ Firestore
    const MAX_BLOB_SIZE = 250 * 1024;


    for (const MAX_SIZE of dimensions) {

      let width = img.naturalWidth;
      let height = img.naturalHeight;


      if (
        width > MAX_SIZE ||
        height > MAX_SIZE
      ) {

        if (width >= height) {

          height = Math.round(
            height * (MAX_SIZE / width)
          );

          width = MAX_SIZE;

        } else {

          width = Math.round(
            width * (MAX_SIZE / height)
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


      // خلفية بيضاء للصور الشفافة
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
// اختيار صورة من الجهاز
const imageFileInput = $('imageFile');

if (imageFileInput) {
  imageFileInput.addEventListener('change', async () => {
    const file = imageFileInput.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('الرجاء اختيار صورة فقط.');
      imageFileInput.value = '';
      return;
    }

    try {
      showMessage('جاري تجهيز الصورة...');
      selectedImageData = await compressImage(file);
      removeExistingImage = false;
      showImagePreview(selectedImageData);
      showMessage('تم تجهيز الصورة، اضغط حفظ المنشور.', true);
    } catch (e) {
      console.error(e);
      selectedImageData = null;
      imageFileInput.value = '';
      alert('تعذر تجهيز الصورة. جرّب صورة أصغر.');
    }
  });
}

// إزالة الصورة
const removeImageButton = $('removeImage');

if (removeImageButton) {
  removeImageButton.addEventListener('click', () => {
    selectedImageData = null;
    removeExistingImage = true;
    const input = $('imageFile');
    if (input) input.value = '';
    const preview = $('imagePreview');
    if (preview) preview.hidden = true;
    const previewImg = $('imagePreviewImg');
    if (previewImg) previewImg.removeAttribute('src');
    showMessage('تمت إزالة الصورة. احفظ المنشور لتأكيد التغيير.', true);
  });
}


// ======================================================
// الرسائل والنموذج
// ======================================================

function showMessage(text, ok = false){
  const el = $('formMessage');
  if (!el) return;
  el.textContent = text;
  el.className = 'form-message ' + (ok ? 'success' : 'error');
}

function resetForm(){
  $('postForm').reset();
  $('editingId').value = '';
  $('formTitle').textContent = 'إضافة منشور جديد';
  $('saveBtn').textContent = 'حفظ المنشور';
  $('cancelEdit').hidden = true;
  $('eventDateWrap').hidden = $('category').value !== 'events';
  clearImageState();
  showMessage('');
}

function dateText(d){
  return d?.toDate ? d.toDate().toLocaleString('ar-IQ') : d || '';
}


// ======================================================
// المنشورات
// ======================================================

function postItem(doc){
  const d = doc.data();
  const key = d.category || 'news';
  const cfg = ADMIN_CATEGORIES[key] || ADMIN_CATEGORIES.news;
  const image = d.imageData || d.imageUrl || '';

  return `
    <div class="admin-post">
      <div>
        ${image ? `
          <img src="${esc(image)}" alt="" loading="lazy"
            style="width:90px;height:65px;object-fit:cover;border-radius:10px;margin-bottom:10px;display:block;">
        ` : ''}
        <div class="post-meta">
          ${cfg.icon} ${cfg.title}
          ${d.createdAt ? '• ' + esc(dateText(d.createdAt)) : ''}
        </div>
        <h4>${esc(d.title || 'بدون عنوان')}</h4>
        <p>${esc(d.content || '')}</p>
      </div>
      <div class="admin-post-actions">
        <button type="button" class="btn mini edit-post" data-id="${doc.id}" data-category="${key}">تعديل</button>
        <button type="button" class="btn mini danger delete-post" data-id="${doc.id}" data-category="${key}">حذف</button>
      </div>
    </div>
  `;
}

async function loadPosts(){
  const box = $('postsList');
  const filter = $('filterCategory').value;
  box.innerHTML = '<div class="empty-state">جاري التحميل...</div>';

  try {
    let all = [];
    const keys = (filter === 'all' ? Object.keys(ADMIN_CATEGORIES) : [filter]).filter(canManage);

    for (const key of keys) {
      const snap = await db.collection(ADMIN_CATEGORIES[key].collection).orderBy('createdAt', 'desc').get();
      snap.forEach(doc => { all.push({ doc, key }); });
    }

    all.sort((a, b) =>
      (b.doc.data().createdAt?.toMillis?.() || 0) -
      (a.doc.data().createdAt?.toMillis?.() || 0)
    );

    box.innerHTML = all.length
      ? all.map(x => postItem(x.doc)).join('')
      : '<div class="empty-state">لا توجد منشورات حاليًا</div>';

  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty-state">تعذر تحميل المنشورات.</div>';
  }
}


// ======================================================
// تعديل منشور
// ======================================================

async function loadForEdit(id, key){
  try {
    const snap = await db.collection(ADMIN_CATEGORIES[key].collection).doc(id).get();
    if (!snap.exists) return;

    const d = snap.data();
    $('editingId').value = id;
    $('category').value = key;
    $('title').value = d.title || '';
    $('content').value = d.content || '';
    $('eventDate').value = d.eventDate || '';
    $('eventDateWrap').hidden = key !== 'events';
    $('formTitle').textContent = 'تعديل المنشور';
    $('saveBtn').textContent = 'حفظ التعديلات';
    $('cancelEdit').hidden = false;

    selectedImageData = null;
    removeExistingImage = false;

    const existingImage = d.imageData || d.imageUrl || '';
    if (existingImage) {
      showImagePreview(existingImage);
    } else {
      const preview = $('imagePreview');
      if (preview) preview.hidden = true;
    }

    window.scrollTo({
      top: document.querySelector('.admin-section').offsetTop - 90,
      behavior: 'smooth'
    });

  } catch (e) {
    console.error(e);
    alert('تعذر فتح المنشور للتعديل.');
  }
}


// ======================================================
// حذف منشور
// ======================================================

async function deletePost(id, key){
  if (!confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
  try {
    await db.collection(ADMIN_CATEGORIES[key].collection).doc(id).delete();
    await loadPosts();
  } catch (e) {
    console.error(e);
    alert('تعذر حذف المنشور.');
  }
}


// ======================================================
// الاستفسارات
// ======================================================

async function loadInquiries(){
  const box = $('inquiriesList');
  box.innerHTML = '<div class="empty-state">جاري تحميل الاستفسارات...</div>';

  try {
    const snap = await db.collection('inquiries').get();
    const rows = snap.docs.sort((a, b) =>
      (b.data().createdAt?.toMillis?.() || 0) -
      (a.data().createdAt?.toMillis?.() || 0)
    );

    if (!rows.length) {
      box.innerHTML = '<div class="empty-state">لا توجد استفسارات حاليًا.</div>';
      return;
    }

    const unseen = rows.filter(doc =>
      doc.data().adminSeen !== true && doc.data().status === 'new'
    );

    if (unseen.length) {
      await Promise.all(unseen.map(doc =>
        db.collection('inquiries').doc(doc.id).update({ adminSeen: true })
      ));
    }

    const users = {};
    for (const doc of rows) {
      const uid = doc.data().userId;
      if (uid && !users[uid]) {
        const u = await db.collection('users').doc(uid).get();
        users[uid] = u.exists ? u.data() : {};
      }
    }

    box.innerHTML = rows.map(doc => {
      const d = doc.data();
      const u = users[d.userId] || {};
      return `
        <article class="admin-inquiry" data-inquiry-id="${doc.id}">
          <div>
            <div class="post-meta">
              ${esc(d.type)}
              ${d.createdAt ? '• ' + esc(dateText(d.createdAt)) : ''}
            </div>
            <h4>${esc(d.title)}</h4>
            <p>${esc(d.message)}</p>
            <small>المستخدم: ${esc(u.fullName || 'عضو')} — ${esc(u.email || '')}</small>
            ${d.reply ? `
              <div class="inquiry-reply">
                <strong>الرد الحالي</strong>
                <p>${esc(d.reply)}</p>
              </div>
            ` : ''}
          </div>
          <div class="inquiry-actions">
            <textarea class="reply-input" rows="4" placeholder="اكتب رد الفريق...">${esc(d.reply || '')}</textarea>
            <button class="btn primary reply-inquiry" data-id="${doc.id}">
              ${d.reply ? 'تحديث الرد' : 'إرسال الرد'}
            </button>
            <button class="btn mini danger delete-inquiry" data-id="${doc.id}">حذف</button>
          </div>
        </article>
      `;
    }).join('');

  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty-state">تعذر تحميل الاستفسارات.</div>';
  }
}


// ======================================================
// الأحداث
// ======================================================

$('category').addEventListener('change', () => {
  $('eventDateWrap').hidden = $('category').value !== 'events';
});

$('filterCategory').addEventListener('change', loadPosts);
$('cancelEdit').addEventListener('click', resetForm);
$('refreshInquiries').addEventListener('click', loadInquiries);


// ======================================================
// أزرار المنشورات
// ======================================================

$('postsList').addEventListener('click', e => {
  const edit = e.target.closest('.edit-post');
  const del = e.target.closest('.delete-post');
  if (edit) loadForEdit(edit.dataset.id, edit.dataset.category);
  if (del) deletePost(del.dataset.id, del.dataset.category);
});


// ======================================================
// الاستفسارات - رد وحذف
// ======================================================

$('inquiriesList').addEventListener('click', async e => {
  const reply = e.target.closest('.reply-inquiry');
  const del = e.target.closest('.delete-inquiry');

  if (reply) {
    const card = reply.closest('.admin-inquiry');
    const text = card.querySelector('.reply-input').value.trim();
    if (!text) { alert('اكتب الرد أولًا.'); return; }

    reply.disabled = true;
    try {
      await db.collection('inquiries').doc(reply.dataset.id).update({
        reply: text,
        repliedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'replied'
      });
      await loadInquiries();
    } catch (err) {
      console.error(err);
      alert('تعذر حفظ الرد.');
    } finally {
      reply.disabled = false;
    }
  }

  if (del) {
    if (!confirm('حذف الاستفسار نهائيًا؟')) return;
    try {
      await db.collection('inquiries').doc(del.dataset.id).delete();
      await loadInquiries();
    } catch (err) {
      console.error(err);
      alert('تعذر حذف الاستفسار.');
    }
  }
});


// ======================================================
// حفظ المنشور
// ======================================================

$('postForm').addEventListener('submit', async e => {
  e.preventDefault();
  showMessage('جاري الحفظ...');

  const key = $('category').value;
  const cfg = ADMIN_CATEGORIES[key];
  const id = $('editingId').value.trim();

  if (!canManage(key)) {
    showMessage('ليست لديك صلاحية لإدارة هذا القسم.');
    return;
  }

  const data = {
    title: $('title').value.trim(),
    content: $('content').value.trim(),
    category: key,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (key === 'events' && $('eventDate').value) {
    data.eventDate = $('eventDate').value;
  } else if (key === 'events') {
    data.eventDate = '';
  }

  try {
    // صورة جديدة
    if (selectedImageData) {
      data.imageData = selectedImageData;
      data.imageUrl = firebase.firestore.FieldValue.delete();
    }
    // إزالة الصورة
    else if (id && removeExistingImage) {
      data.imageData = firebase.firestore.FieldValue.delete();
      data.imageUrl = firebase.firestore.FieldValue.delete();
    }

    // منشور جديد أو تعديل
    if (id) {
      await db.collection(cfg.collection).doc(id).update(data);
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.authorId = currentUser.uid;
      await db.collection(cfg.collection).add(data);
    }

    showMessage(id ? 'تم تعديل المنشور بنجاح.' : 'تمت إضافة المنشور بنجاح.', true);
    resetForm();
    await loadPosts();

  } catch (err) {
    console.error(err);

    if (
      err?.code === 'resource-exhausted' ||
      String(err?.message || '').toLowerCase().includes('1 mib') ||
      String(err?.message || '').toLowerCase().includes('maximum')
    ) {
      showMessage('الصورة كبيرة جدًا. اختر صورة أصغر وحاول مرة أخرى.');
    } else {
      showMessage('تعذر حفظ المنشور.');
    }
  }
});


// ======================================================
// تسجيل الخروج - يرجع للرئيسية
// ======================================================

$('logoutBtn').addEventListener('click', async () => {
  await auth.signOut();
  location.href = 'index.html';
});


// ======================================================
// إشعارات الإدارة
// ======================================================

function updateAdminNotificationBadge(count){
  const b = document.getElementById('adminNotificationBadge');
  if (!b) return;
  b.textContent = count > 0
    ? '🔔 ' + count + ' استفسار جديد'
    : '🔔 لا توجد استفسارات جديدة';
  b.classList.toggle('has-alert', count > 0);
}


// ======================================================
// التحقق من الحساب والصلاحيات
// ======================================================

auth.onAuthStateChanged(async user => {
  if (!user) {
    location.href = 'login.html?next=admin.html';
    return;
  }

  currentUser = user;

  try {
    const doc = await db.collection('users').doc(user.uid).get();

    if (!doc.exists || !['admin', 'supervisor'].includes(doc.data().role)) {
      $('adminGate').innerHTML =
        'ليس لديك صلاحية للوصول إلى لوحة الإدارة.<br>' +
        '<a class="btn primary" href="index.html">العودة للرئيسية</a>';
      return;
    }

    currentUserRole = doc.data().role || 'user';
    currentPermissions = Array.isArray(doc.data().permissions) ? doc.data().permissions : [];

    $('adminGate').hidden = true;
    $('adminApp').hidden = false;
    $('adminEmail').textContent = 'المشرف: ' + user.email + ' — ' +
      (currentUserRole === 'admin' ? 'مدير كامل' : 'مشرف متخصص');

    if (currentUserRole !== 'admin') {
      $('filterCategory').querySelectorAll('option').forEach(o => {
        if (o.value !== 'all' && !canManage(o.value)) o.hidden = true;
      });
      $('category').querySelectorAll('option').forEach(o => {
        if (!canManage(o.value)) o.remove();
      });
      $('supervisorsCard').hidden = true;
      $('inquiriesList').closest('.admin-wide-card').hidden = !canManage('inquiries');
      $('postForm').hidden = !Object.keys(ADMIN_CATEGORIES).some(canManage);
      $('postsList').closest('.admin-card').hidden = !Object.keys(ADMIN_CATEGORIES).some(canManage);
    }

    await loadPosts();

    if (canManage('inquiries')) {
      await loadInquiries();
      if (window.WasitNotifications) {
        stopAdminNotifications = WasitNotifications.listenAdminInquiries(user, updateAdminNotificationBadge);
      }
    }

    if (typeof loadSupervisors === 'function' && currentUserRole === 'admin') {
      await loadSupervisors();
    }

    if (typeof refreshDashboard === 'function') {
      await refreshDashboard();
    }

  } catch (e) {
    console.error(e);
    $('adminGate').textContent = 'تعذر التحقق من صلاحيات الحساب.';
  }
});

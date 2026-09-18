// ======================================================
// site-icons-admin.js - إدارة أيقونات الفريق من لوحة التحكم
// فريق شمال واسط
// ======================================================

(function(){
  const $ = id => document.getElementById(id);

  const escIcons = v => String(v || '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));

  function showIconMessage(text, ok = false){
    const el = $('iconFormMessage');
    if (!el) return;
    el.textContent = text;
    el.className = 'form-message ' + (ok ? 'success' : 'error');
  }

  function resetIconForm(){
    const form = $('iconForm');
    if (!form) return;
    form.reset();
    $('iconEditingId').value = '';
    $('iconOrder').value = 100;
    $('iconActive').checked = true;
    $('saveIconBtn').textContent = 'إضافة الأيقونة';
    $('cancelIconEdit').hidden = true;
    showIconMessage('');
  }

  async function loadIcons(){
    const box = $('iconsList');
    if (!box) return;

    box.innerHTML = '<div class="empty-state">جاري التحميل...</div>';

    try {
      const snap = await db.collection('siteIcons').orderBy('order', 'asc').get();

      if (snap.empty) {
        box.innerHTML = '<div class="empty-state">لا توجد أيقونات مخصصة بعد. الأيقونات الافتراضية تظهر في الفوتر.</div>';
        return;
      }

      box.innerHTML = snap.docs.map(doc => {
        const d = doc.data();
        return `
          <div class="icon-manager-item" data-id="${doc.id}">
            <div class="icon-manager-preview">
              <span class="social-icon">${escIcons(d.symbol || '●')}</span>
              <strong>${escIcons(d.label || 'بدون اسم')}</strong>
              <small>الترتيب: ${d.order ?? 100} • ${d.active ? 'ظاهرة' : 'مخفية'}</small>
            </div>
            <div class="icon-manager-actions">
              <button type="button" class="btn mini edit-icon" data-id="${doc.id}">تعديل</button>
              <button type="button" class="btn mini danger delete-icon" data-id="${doc.id}">حذف</button>
            </div>
          </div>
        `;
      }).join('');

    } catch (e) {
      console.error(e);
      box.innerHTML = '<div class="empty-state">تعذر تحميل الأيقونات.</div>';
    }
  }

  async function saveIcon(e){
    e.preventDefault();

    const label = $('iconLabel').value.trim();
    const symbol = $('iconSymbol').value.trim();
    const order = parseInt($('iconOrder').value, 10) || 100;
    const active = $('iconActive').checked;
    const editingId = $('iconEditingId').value.trim();

    if (!label || !symbol) {
      showIconMessage('يرجى ملء جميع الحقول.');
      return;
    }

    const btn = $('saveIconBtn');
    btn.disabled = true;

    try {
      const data = {
        label,
        symbol,
        order,
        active,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (editingId) {
        await db.collection('siteIcons').doc(editingId).update(data);
        showIconMessage('تم تعديل الأيقونة بنجاح.', true);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('siteIcons').add(data);
        showIconMessage('تمت إضافة الأيقونة بنجاح.', true);
      }

      resetIconForm();
      await loadIcons();

    } catch (err) {
      console.error(err);
      showIconMessage('تعذر حفظ الأيقونة.');
    } finally {
      btn.disabled = false;
    }
  }

  async function editIcon(id){
    try {
      const doc = await db.collection('siteIcons').doc(id).get();
      if (!doc.exists) return;

      const d = doc.data();

      $('iconEditingId').value = id;
      $('iconLabel').value = d.label || '';
      $('iconSymbol').value = d.symbol || '';
      $('iconOrder').value = d.order ?? 100;
      $('iconActive').checked = d.active !== false;
      $('saveIconBtn').textContent = 'حفظ التعديلات';
      $('cancelIconEdit').hidden = false;

      window.scrollTo({
        top: $('iconsCard').offsetTop - 90,
        behavior: 'smooth'
      });

    } catch (e) {
      console.error(e);
      alert('تعذر فتح الأيقونة للتعديل.');
    }
  }

  async function deleteIcon(id){
    if (!confirm('حذف هذه الأيقونة نهائياً؟')) return;

    try {
      await db.collection('siteIcons').doc(id).delete();
      await loadIcons();
    } catch (e) {
      console.error(e);
      alert('تعذر حذف الأيقونة.');
    }
  }

  function init(){
    const form = $('iconForm');
    if (!form) return;

    form.addEventListener('submit', saveIcon);

    $('cancelIconEdit').addEventListener('click', resetIconForm);
    $('refreshIcons').addEventListener('click', loadIcons);

    $('iconsList').addEventListener('click', e => {
      const edit = e.target.closest('.edit-icon');
      const del = e.target.closest('.delete-icon');
      if (edit) editIcon(edit.dataset.id);
      if (del) deleteIcon(del.dataset.id);
    });

    // ننتظر حتى يكون المستخدم مدير
    auth.onAuthStateChanged(async user => {
      if (!user || user.isAnonymous === true) return;

      try {
        const snap = await db.collection('users').doc(user.uid).get();
        if (!snap.exists) return;

        const role = String(snap.data().role || 'user').toLowerCase();

        if (role === 'admin') {
          $('iconsCard').hidden = false;
          await loadIcons();
        }
      } catch (e) {
        console.error(e);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

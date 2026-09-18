// ======================================================
// permissions.js - إدارة المشرفين والصلاحيات
// فريق شمال واسط
// ======================================================

const ROLE_CONFIG = {
  admin: { title: 'مدير كامل', icon: '👑' },
  supervisor: { title: 'مشرف متخصص', icon: '🛡️' },
  user: { title: 'عضو', icon: '👤' }
};

const PERMISSION_CONFIG = {
  news: 'الأخبار',
  events: 'الفعاليات',
  articles: 'المقالات',
  health: 'الصحة',
  environment: 'البيئة',
  inquiries: 'الاستفسارات',
  members: 'الأعضاء',
  supervisors: 'المشرفون'
};

let supervisorUsers = [];

function permissionLabel(key){ return PERMISSION_CONFIG[key] || key; }
function roleLabel(role){ return ROLE_CONFIG[role]?.title || role || 'عضو'; }

function userItem(doc, currentUid){
  const d = doc.data();
  const role = d.role || 'user';
  const perms = Array.isArray(d.permissions) ? d.permissions : [];
  const full = role === 'admin';
  const checked = k => (full || perms.includes(k)) ? 'checked' : '';
  const disabled = full ? 'disabled' : '';
  const isSelf = doc.id === currentUid;

  return `<article class="supervisor-item" data-uid="${esc(doc.id)}">
    <div class="supervisor-main">
      <div class="supervisor-avatar">${role === 'admin' ? '👑' : role === 'supervisor' ? '🛡️' : '👤'}</div>
      <div>
        <h4>${esc(d.fullName || 'بدون اسم')}</h4>
        <p>${esc(d.email || '—')} ${isSelf ? '<span class="self-badge">حسابك</span>' : ''}</p>
        <span class="role-badge">${roleLabel(role)}</span>
      </div>
    </div>
    <div class="supervisor-controls">
      <label>الدور<select class="role-select">
        <option value="user" ${role === 'user' ? 'selected' : ''}>عضو</option>
        <option value="supervisor" ${role === 'supervisor' ? 'selected' : ''}>مشرف متخصص</option>
        <option value="admin" ${role === 'admin' ? 'selected' : ''}>مدير كامل</option>
      </select></label>
      <div class="permissions-grid">
        ${Object.entries(PERMISSION_CONFIG).map(([k, v]) =>
          `<label class="permission-check"><input type="checkbox" value="${k}" ${checked(k)} ${disabled}> ${v}</label>`
        ).join('')}
      </div>
      <div class="supervisor-actions">
        <button type="button" class="btn mini save-role">حفظ الصلاحيات</button>
        ${role !== 'user' ? `<button type="button" class="btn mini danger revoke-role">إزالة صلاحية المشرف</button>` : ''}
      </div>
    </div>
  </article>`;
}

async function loadSupervisors(){
  const box = document.getElementById('supervisorsList');
  if (!box) return;

  box.innerHTML = '<div class="empty-state">جاري تحميل الأعضاء...</div>';

  try {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
    supervisorUsers = snap.docs;
    box.innerHTML = snap.empty
      ? '<div class="empty-state">لا توجد حسابات أعضاء.</div>'
      : snap.docs.map(d => userItem(d, currentUser.uid)).join('');
  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty-state">تعذر تحميل الأعضاء. تأكد من نشر قواعد Firestore.</div>';
  }
}

async function saveRole(card){
  const uid = card.dataset.uid;
  const role = card.querySelector('.role-select').value;
  let permissions = [...card.querySelectorAll('.permission-check input:checked')].map(x => x.value);

  if (uid === currentUser.uid && role !== 'admin') {
    alert('لا يمكنك إزالة صلاحية المدير الكامل من حسابك بنفسك.');
    return;
  }

  if (role === 'admin') permissions = Object.keys(PERMISSION_CONFIG);
  if (role === 'user') permissions = [];

  const btn = card.querySelector('.save-role');
  btn.disabled = true;

  try {
    await db.collection('users').doc(uid).update({
      role,
      permissions,
      permissionsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      permissionsUpdatedBy: currentUser.uid
    });
    alert('تم حفظ الدور والصلاحيات بنجاح.');
    await loadSupervisors();
  } catch (e) {
    console.error(e);
    alert('تعذر حفظ الصلاحيات.');
  } finally {
    btn.disabled = false;
  }
}

async function revokeRole(card){
  const uid = card.dataset.uid;
  if (uid === currentUser.uid) {
    alert('لا يمكنك إزالة صلاحية المشرف من حسابك بنفسك.');
    return;
  }
  if (!confirm('سيعود هذا الحساب إلى عضو عادي. هل تريد المتابعة؟')) return;

  try {
    await db.collection('users').doc(uid).update({
      role: 'user',
      permissions: [],
      permissionsUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      permissionsUpdatedBy: currentUser.uid
    });
    await loadSupervisors();
  } catch (e) {
    console.error(e);
    alert('تعذر إزالة الصلاحية.');
  }
}

const supervisorsList = document.getElementById('supervisorsList');

if (supervisorsList) {
  supervisorsList.addEventListener('click', e => {
    const card = e.target.closest('.supervisor-item');
    if (!card) return;
    if (e.target.closest('.save-role')) saveRole(card);
    if (e.target.closest('.revoke-role')) revokeRole(card);
  });
}

const refreshSupervisors = document.getElementById('refreshSupervisors');
if (refreshSupervisors) refreshSupervisors.addEventListener('click', loadSupervisors);

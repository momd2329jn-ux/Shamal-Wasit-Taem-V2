// ======================================================
// member.js - عرض بيانات العضو
// فريق شمال واسط
// ======================================================

const $m = id => document.getElementById(id);

function renderMemberNotification(count){
  const b = $m('memberNotificationBadge');
  if (!b) return;
  b.textContent = count > 0 ? '🔔 ' + count + ' رد جديد' : '🔔 لا توجد إشعارات';
  b.classList.toggle('has-alert', count > 0);
}

function listenMemberNotifications(user){
  if (!window.WasitNotifications) return;
  window.WasitNotifications.listenMemberReplies(user, function(count, snap){
    renderMemberNotification(count);
  });
}

auth.onAuthStateChanged(async user => {
  if (!user) {
    location.href = 'login.html?next=member.html';
    return;
  }

  try {
    const snap = await db.collection('users').doc(user.uid).get();

    if (!snap.exists) {
      $m('memberGate').textContent = 'لم يتم العثور على بيانات العضوية.';
      return;
    }

    const d = snap.data();

    $m('memberName').textContent = d.fullName || 'عضو';
    $m('memberRole').textContent =
      d.role === 'admin' ? 'مشرف في فريق شمال واسط' :
      d.role === 'supervisor' ? 'مشرف متخصص في فريق شمال واسط' :
      'عضو في فريق شمال واسط';
    $m('memberPhone').textContent = d.phone || '—';
    $m('memberBirthDate').textContent = d.birthDate || '—';
    $m('memberEducation').textContent = d.education || '—';
    $m('memberSpecialization').textContent = d.specialization || '—';
    $m('memberProfession').textContent = d.profession || '—';
    $m('memberEmail').textContent = d.email || user.email || '—';

    $m('memberGate').hidden = true;
    $m('memberApp').hidden = false;

    listenMemberNotifications(user);

  } catch (e) {
    console.error(e);
    $m('memberGate').textContent = 'تعذر تحميل بيانات الحساب.';
  }
});

$m('logoutButton').addEventListener('click', async () => {
  await auth.signOut();
  location.href = 'login.html';
});

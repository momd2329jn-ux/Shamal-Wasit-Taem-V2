// ======================================================
// inquiry.js - استفسارات المواطنين
// فريق شمال واسط
// ======================================================

let inquiryUser = null;
const $i = id => document.getElementById(id);
const escI = v => String(v ?? '').replace(/[&<>'"]/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;'
}[c]));

function inquiryDate(v){
  return v?.toDate ? v.toDate().toLocaleString('ar-IQ') : v || '';
}

async function loadMyInquiries(){
  const box = $i('myInquiries');
  box.innerHTML = '<div class="empty-state">جاري تحميل الاستفسارات...</div>';

  try {
    const snap = await db.collection('inquiries').where('userId', '==', inquiryUser.uid).get();
    const rows = snap.docs.sort((a, b) =>
      (b.data().createdAt?.toMillis?.() || 0) -
      (a.data().createdAt?.toMillis?.() || 0)
    );

    const unseenReplies = rows.filter(doc =>
      doc.data().status === 'replied' && doc.data().userSeen !== true
    );

    if (unseenReplies.length) {
      await Promise.all(unseenReplies.map(doc =>
        db.collection('inquiries').doc(doc.id).update({ userSeen: true })
      ));
    }

    box.innerHTML = rows.length ? rows.map(doc => {
      const d = doc.data();
      return `
        <article class="inquiry-card">
          <div class="post-meta">
            ${escI(d.type)}
            ${d.createdAt ? '• ' + escI(inquiryDate(d.createdAt)) : ''}
          </div>
          <h3>${escI(d.title)}</h3>
          <p>${escI(d.message)}</p>
          <div class="inquiry-reply">
            <strong>رد الفريق</strong>
            <p>${d.reply ? escI(d.reply) : 'لم يتم الرد على هذا الاستفسار بعد.'}</p>
            ${d.repliedAt ? `<small>${escI(inquiryDate(d.repliedAt))}</small>` : ''}
          </div>
        </article>
      `;
    }).join('') : '<div class="empty-state">لا توجد استفسارات سابقة.</div>';

  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty-state">تعذر تحميل الاستفسارات حاليًا.</div>';
  }
}

$i('inquiryForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $i('inquiryMessage');
  msg.textContent = 'جاري الإرسال...';
  msg.className = 'form-message';

  try {
    if (!inquiryUser) throw new Error('NO_USER');

    const type = $i('inquiryType').value;
    const title = $i('inquiryTitle').value.trim();
    const message = $i('inquiryText').value.trim();

    if (!type || !title || !message) {
      msg.textContent = 'يرجى ملء جميع الحقول.';
      msg.className = 'form-message error';
      return;
    }

    await db.collection('inquiries').add({
      userId: inquiryUser.uid,
      type,
      title,
      message,
      status: 'new',
      adminSeen: false,
      userSeen: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    e.target.reset();
    msg.textContent = 'تم إرسال الاستفسار بنجاح.';
    msg.className = 'form-message success';
    await loadMyInquiries();

  } catch (err) {
    console.error(err);
    msg.textContent = 'تعذر إرسال الاستفسار حاليًا. حاول مرة أخرى.';
    msg.className = 'form-message error';
  }
});

auth.onAuthStateChanged(async user => {
  try {
    if (!user) {
      $i('inquiryGate').hidden = false;
      $i('inquiryGate').innerHTML = '<div class="empty-state">جاري تجهيز حساب الزائر...</div>';
      await auth.signInAnonymously();
      return;
    }

    inquiryUser = user;
    $i('inquiryGate').hidden = true;
    $i('inquiryApp').hidden = false;
    await loadMyInquiries();

  } catch (err) {
    console.error(err);
    $i('inquiryGate').hidden = false;
    $i('inquiryGate').innerHTML = '<div class="empty-state">تعذر تشغيل خدمة الاستفسارات حاليًا.<br>تأكد من تفعيل تسجيل الدخول المجهول في Firebase.</div>';
  }
});

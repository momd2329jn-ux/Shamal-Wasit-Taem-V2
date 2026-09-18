// ======================================================
// register.js - إنشاء حساب جديد
// فريق شمال واسط
// ======================================================

const form = document.getElementById('registerForm');
const msg = document.getElementById('registerMessage');

const fullNameEl = document.getElementById('fullName');
const phoneEl = document.getElementById('phone');
const specializationEl = document.getElementById('specialization');
const professionEl = document.getElementById('profession');
const birthDateEl = document.getElementById('birthDate');
const educationEl = document.getElementById('education');
const emailEl = document.getElementById('email');
const passwordEl = document.getElementById('password');

if (window.auth) {
  auth.onAuthStateChanged(user => {
    if (user && user.isAnonymous !== true) location.href = 'member.html';
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  msg.textContent = 'جاري إنشاء الحساب...';
  msg.className = 'form-message';

  const data = {
    fullName: fullNameEl.value.trim(),
    phone: phoneEl.value.trim(),
    specialization: specializationEl.value.trim(),
    profession: professionEl.value.trim(),
    birthDate: birthDateEl.value,
    education: educationEl.value,
    email: emailEl.value.trim().toLowerCase()
  };

  if (
    !data.fullName ||
    !data.phone ||
    !data.specialization ||
    !data.profession ||
    !data.birthDate ||
    !data.education ||
    !data.email ||
    !passwordEl.value
  ) {
    msg.textContent = 'يرجى ملء جميع الحقول.';
    msg.className = 'form-message error';
    return;
  }

  if (passwordEl.value.length < 6) {
    msg.textContent = 'كلمة المرور يجب أن تكون 6 أحرف أو أكثر.';
    msg.className = 'form-message error';
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(data.email, passwordEl.value);

    await db.collection('users').doc(cred.user.uid).set({
      ...data,
      role: 'user',
      permissions: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    msg.textContent = 'تم إنشاء الحساب بنجاح. جاري فتح حسابك...';
    msg.className = 'form-message success';

    setTimeout(() => {
      location.href = 'member.html';
    }, 500);

  } catch (err) {
    console.error('REGISTER ERROR:', err);

    if (err.code === 'auth/email-already-in-use') {
      msg.textContent = 'هذا البريد الإلكتروني مستخدم مسبقًا.';
    } else if (err.code === 'auth/invalid-email') {
      msg.textContent = 'البريد الإلكتروني غير صحيح.';
    } else if (err.code === 'auth/weak-password') {
      msg.textContent = 'كلمة المرور يجب أن تكون 6 أحرف أو أكثر.';
    } else if (err.code === 'permission-denied') {
      msg.textContent = 'تم إنشاء الحساب لكن تعذر حفظ بيانات العضوية. تحقق من قواعد Firestore.';
    } else {
      msg.textContent = 'حدث خطأ أثناء إنشاء الحساب. حاول مرة أخرى.';
    }

    msg.className = 'form-message error';
  }
});

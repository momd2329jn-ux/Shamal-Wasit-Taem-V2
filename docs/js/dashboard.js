// ======================================================
// dashboard.js - إحصائيات لوحة الإدارة وآخر النشاطات
// فريق شمال واسط
// ======================================================

const DASHBOARD_CATEGORIES = {
  news: { title: 'الأخبار', icon: '📰', collection: 'news', permission: 'news' },
  events: { title: 'الفعاليات', icon: '📅', collection: 'events', permission: 'events' },
  articles: { title: 'المقالات', icon: '📚', collection: 'articles', permission: 'articles' },
  health: { title: 'الصحة', icon: '🩺', collection: 'health', permission: 'health' },
  environment: { title: 'البيئة', icon: '🌱', collection: 'environment', permission: 'environment' }
};

function dashCan(key){
  return typeof canManage === 'function'
    ? canManage(key)
    : currentUserRole === 'admin';
}

function setStat(id, value){
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

async function getCount(collection){
  const snap = await db.collection(collection).get();
  return snap.size;
}

async function loadDashboardStats(){
  const status = document.getElementById('dashboardStatus');
  if (status) status.textContent = 'جاري تحديث الإحصائيات...';

  try {
    const jobs = [];
    for (const [key, cfg] of Object.entries(DASHBOARD_CATEGORIES)) {
      if (dashCan(cfg.permission)) {
        jobs.push(getCount(cfg.collection).then(n => ({ key, n })));
      }
    }

    const results = await Promise.all(jobs);
    const totals = { news: 0, events: 0, articles: 0, health: 0, environment: 0 };
    results.forEach(x => totals[x.key] = x.n);

    setStat('statNews', totals.news);
    setStat('statEvents', totals.events);
    setStat('statArticles', totals.articles);
    setStat('statHealth', totals.health);
    setStat('statEnvironment', totals.environment);
    setStat('statPosts', Object.values(totals).reduce((a, b) => a + b, 0));

    if (dashCan('members')) setStat('statMembers', await getCount('users'));
    else setStat('statMembers', '—');

    if (dashCan('inquiries')) {
      const q = await db.collection('inquiries').get();
      let unanswered = 0, replied = 0;
      q.forEach(d => {
        const x = d.data();
        if (x.status === 'replied' || x.reply) replied++;
        else unanswered++;
      });
      setStat('statInquiries', q.size);
      setStat('statUnanswered', unanswered);
      setStat('statReplied', replied);
    } else {
      setStat('statInquiries', '—');
      setStat('statUnanswered', '—');
      setStat('statReplied', '—');
    }

    if (status) status.textContent = 'تم تحديث الإحصائيات.';

  } catch (e) {
    console.error(e);
    if (status) status.textContent = 'تعذر تحديث بعض الإحصائيات.';
  }
}

async function loadRecentActivity(){
  const box = document.getElementById('recentActivity');
  if (!box) return;

  try {
    const rows = [];

    for (const [key, cfg] of Object.entries(DASHBOARD_CATEGORIES)) {
      if (!dashCan(cfg.permission)) continue;
      const snap = await db.collection(cfg.collection).orderBy('createdAt', 'desc').limit(3).get();
      snap.forEach(doc => {
        const d = doc.data();
        rows.push({ type: 'post', key, title: d.title || 'منشور بدون عنوان', createdAt: d.createdAt });
      });
    }

    if (dashCan('inquiries')) {
      const snap = await db.collection('inquiries').orderBy('createdAt', 'desc').limit(5).get();
      snap.forEach(doc => {
        const d = doc.data();
        rows.push({ type: 'inquiry', key: 'inquiries', title: d.title || 'استفسار جديد', createdAt: d.createdAt });
      });
    }

    rows.sort((a, b) =>
      (b.createdAt?.toMillis?.() || 0) -
      (a.createdAt?.toMillis?.() || 0)
    );

    box.innerHTML = rows.slice(0, 8).map(r => {
      const cfg = r.type === 'inquiry'
        ? { icon: '💬', title: 'استفسار' }
        : DASHBOARD_CATEGORIES[r.key];
      const date = r.createdAt?.toDate
        ? r.createdAt.toDate().toLocaleString('ar-IQ')
        : 'حديثًا';
      return `<div class="activity-item"><span class="activity-icon">${cfg.icon}</span><div><strong>${esc(r.title)}</strong><small>${cfg.title} • ${esc(date)}</small></div></div>`;
    }).join('') || '<div class="empty-state">لا توجد نشاطات بعد.</div>';

  } catch (e) {
    console.error(e);
    box.innerHTML = '<div class="empty-state">تعذر تحميل آخر النشاطات.</div>';
  }
}

async function refreshDashboard(){
  await Promise.all([loadDashboardStats(), loadRecentActivity()]);
}

 // ======================================================
// dashboard.js - إحصائيات لوحة الإدارة وآخر النشاطات
// فريق شمال واسط
// ======================================================

const DASHBOARD_CATEGORIES = {
  news: {
    title: 'الأخبار',
    icon: '📰',
    collection: 'news',
    permission: 'news'
  },
  events: {
    title: 'الفعاليات',
    icon: '📅',
    collection: 'events',
    permission: 'events'
  },
  articles: {
    title: 'المقالات',
    icon: '📚',
    collection: 'articles',
    permission: 'articles'
  },
  health: {
    title: 'الصحة',
    icon: '🩺',
    collection: 'health',
    permission: 'health'
  },
  environment: {
    title: 'البيئة',
    icon: '🌱',
    collection: 'environment',
    permission: 'environment'
  }
};

function dashCan(key) {
  return typeof canManage === 'function'
    ? canManage(key)
    : currentUserRole === 'admin';
}

function isDashboardAdmin() {
  return currentUserRole === 'admin';
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

async function getCount(collection) {
  const snap = await db.collection(collection).get();
  return snap.size;
}

// ======================================================
// تحميل الأقسام المخصصة للمدير
// ======================================================

async function getCustomDashboardCategories() {
  if (!isDashboardAdmin()) return [];

  try {
    const snap = await db.collection('siteCategories')
      .where('type', '==', 'custom')
      .get();

    return snap.docs.map(doc => {
      const d = doc.data();

      return {
        id: doc.id,
        title: d.title || 'قسم مخصص',
        icon: d.icon || '●',
        active: d.active !== false
      };
    });

  } catch (e) {
    console.error('تعذر تحميل الأقسام المخصصة للوحة التحكم:', e);
    return [];
  }
}

// ======================================================
// الإحصائيات
// ======================================================

async function loadDashboardStats() {
  const status = document.getElementById('dashboardStatus');

  if (status) {
    status.textContent = 'جاري تحديث الإحصائيات...';
  }

  try {
    const jobs = [];

    // الأقسام الأساسية
    for (const [key, cfg] of Object.entries(DASHBOARD_CATEGORIES)) {
      if (dashCan(cfg.permission)) {
        jobs.push(
          getCount(cfg.collection).then(n => ({
            key,
            n
          }))
        );
      }
    }

    // الأقسام المخصصة - للمدير فقط
    let customCategories = [];

    if (isDashboardAdmin()) {
      customCategories = await getCustomDashboardCategories();
    }

    const customPostsCountPromise = isDashboardAdmin()
      ? getCount('siteCategoryPosts')
      : Promise.resolve(0);

    const results = await Promise.all(jobs);
    const customPostsCount = await customPostsCountPromise;

    const totals = {
      news: 0,
      events: 0,
      articles: 0,
      health: 0,
      environment: 0
    };

    results.forEach(x => {
      totals[x.key] = x.n;
    });

    // إحصائيات الأقسام الأساسية
    setStat('statNews', totals.news);
    setStat('statEvents', totals.events);
    setStat('statArticles', totals.articles);
    setStat('statHealth', totals.health);
    setStat('statEnvironment', totals.environment);

    // إجمالي المنشورات = الأقسام الأساسية + الأقسام المخصصة
    const fixedPostsTotal = Object.values(totals)
      .reduce((a, b) => a + b, 0);

    setStat(
      'statPosts',
      fixedPostsTotal + customPostsCount
    );

    // عدد الأعضاء
    if (dashCan('members')) {
      setStat('statMembers', await getCount('users'));
    } else {
      setStat('statMembers', '—');
    }

    // الاستفسارات
    if (dashCan('inquiries')) {
      const q = await db.collection('inquiries').get();

      let unanswered = 0;
      let replied = 0;

      q.forEach(d => {
        const x = d.data();

        if (x.status === 'replied' || x.reply) {
          replied++;
        } else {
          unanswered++;
        }
      });

      setStat('statInquiries', q.size);
      setStat('statUnanswered', unanswered);
      setStat('statReplied', replied);

    } else {
      setStat('statInquiries', '—');
      setStat('statUnanswered', '—');
      setStat('statReplied', '—');
    }

    if (status) {
      status.textContent = 'تم تحديث الإحصائيات.';
    }

  } catch (e) {
    console.error(e);

    if (status) {
      status.textContent = 'تعذر تحديث بعض الإحصائيات.';
    }
  }
}

// ======================================================
// آخر النشاطات
// ======================================================

async function loadRecentActivity() {
  const box = document.getElementById('recentActivity');

  if (!box) return;

  try {
    const rows = [];

    // --------------------------------------------------
    // النشاطات من الأقسام الأساسية
    // --------------------------------------------------

    for (const [key, cfg] of Object.entries(DASHBOARD_CATEGORIES)) {
      if (!dashCan(cfg.permission)) continue;

      const snap = await db.collection(cfg.collection)
        .orderBy('createdAt', 'desc')
        .limit(3)
        .get();

      snap.forEach(doc => {
        const d = doc.data();

        rows.push({
          type: 'post',
          key,
          title: d.title || 'منشور بدون عنوان',
          createdAt: d.createdAt,
          icon: cfg.icon,
          categoryTitle: cfg.title
        });
      });
    }

    // --------------------------------------------------
    // النشاطات من الأقسام المخصصة
    // للمدير فقط
    // --------------------------------------------------

    if (isDashboardAdmin()) {
      const customCategories =
        await getCustomDashboardCategories();

      const customCategoryMap = {};

      customCategories.forEach(category => {
        customCategoryMap[category.id] = category;
      });

      const customPostsSnap = await db.collection('siteCategoryPosts')
        .orderBy('createdAt', 'desc')
        .limit(15)
        .get();

      customPostsSnap.forEach(doc => {
        const d = doc.data();

        const category =
          customCategoryMap[d.categoryId] || {
            title: d.categoryTitle || 'قسم مخصص',
            icon: d.categoryIcon || '●'
          };

        rows.push({
          type: 'custom-post',
          key: 'custom:' + (d.categoryId || ''),
          title: d.title || 'منشور بدون عنوان',
          createdAt: d.createdAt,
          icon: category.icon,
          categoryTitle: category.title
        });
      });
    }

    // --------------------------------------------------
    // الاستفسارات
    // --------------------------------------------------

    if (dashCan('inquiries')) {
      const snap = await db.collection('inquiries')
        .orderBy('createdAt', 'desc')
        .limit(5)
        .get();

      snap.forEach(doc => {
        const d = doc.data();

        rows.push({
          type: 'inquiry',
          key: 'inquiries',
          title: d.title || 'استفسار جديد',
          createdAt: d.createdAt,
          icon: '💬',
          categoryTitle: 'استفسار'
        });
      });
    }

    // --------------------------------------------------
    // ترتيب كل النشاطات من الأحدث إلى الأقدم
    // --------------------------------------------------

    rows.sort((a, b) =>
      (b.createdAt?.toMillis?.() || 0) -
      (a.createdAt?.toMillis?.() || 0)
    );

    // --------------------------------------------------
    // عرض آخر 8 نشاطات
    // --------------------------------------------------

    box.innerHTML = rows.slice(0, 8).map(r => {

      const date = r.createdAt?.toDate
        ? r.createdAt.toDate().toLocaleString('ar-IQ')
        : 'حديثًا';

      return `
        <div class="activity-item">
          <span class="activity-icon">${r.icon || '●'}</span>
          <div>
            <strong>${esc(r.title)}</strong>
            <small>${esc(r.categoryTitle)} • ${esc(date)}</small>
          </div>
        </div>
      `;

    }).join('') || `
      <div class="empty-state">
        لا توجد نشاطات بعد.
      </div>
    `;

  } catch (e) {
    console.error(e);

    box.innerHTML = `
      <div class="empty-state">
        تعذر تحميل آخر النشاطات.
      </div>
    `;
  }
}

// ======================================================
// تحديث لوحة التحكم
// ======================================================

async function refreshDashboard() {
  await Promise.all([
    loadDashboardStats(),
    loadRecentActivity()
  ]);
}

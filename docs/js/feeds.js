// ======================================================
// feeds.js - تحميل المنشورات في الصفحات الرئيسية والأقسام
// فريق شمال واسط
// ======================================================

const CATEGORY_CONFIG = {
  news: {
    title: 'الأخبار',
    icon: '📰',
    description: 'آخر أخبار ونشاطات فريق شمال واسط.',
    collection: 'news'
  },
  events: {
    title: 'الفعاليات',
    icon: '📅',
    description: 'الفعاليات والمبادرات القادمة والسابقة.',
    collection: 'events'
  },
  articles: {
    title: 'المقالات',
    icon: '📚',
    description: 'مقالات ومواضيع معرفية ومجتمعية.',
    collection: 'articles'
  },
  health: {
    title: 'الصحة',
    icon: '🩺',
    description: 'محتوى صحي وتوعوي موثوق.',
    collection: 'health'
  },
  environment: {
    title: 'البيئة',
    icon: '🌱',
    description: 'مبادرات وأفكار لحماية بيئتنا.',
    collection: 'environment'
  }
};

function esc(v = '') {
  return String(v).replace(
    /[&<>'"]/g,
    c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[c])
  );
}

function postCard(d, id) {
  const title = esc(d.title || 'منشور بدون عنوان');
  const body = esc(d.content || d.body || '');
  const image = d.imageData || d.imageUrl || '';

  let date = '';
  if (d.createdAt?.toDate) {
    date = d.createdAt.toDate().toLocaleDateString('ar-IQ');
  } else if (d.date) {
    date = esc(d.date);
  }

  return `
    <article class="post-card">
      ${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : ''}
      <div class="post-body">
        <div class="post-meta">${date || 'فريق شمال واسط'}</div>
        <h3>${title}</h3>
        <p>${body}</p>
      </div>
    </article>
  `;
}

async function loadCategoryPage(key, limit = null) {
  const cfg = CATEGORY_CONFIG[key];
  if (!cfg) return;

  const el = document.getElementById('posts');
  if (!el) return;

  el.innerHTML = '<div class="empty-state">جاري تحميل المنشورات...</div>';

  try {
    let snap;
    try {
      let q = db.collection(cfg.collection).orderBy('createdAt', 'desc');
      if (limit) q = q.limit(limit);
      snap = await q.get();
    } catch (orderError) {
      console.warn(`تعذر استخدام createdAt في ${cfg.collection}`, orderError);
      snap = await db.collection(cfg.collection).get();
    }

    let docs = snap.docs;

    docs.sort((a, b) => {
      const at = a.data().createdAt?.toMillis?.() || 0;
      const bt = b.data().createdAt?.toMillis?.() || 0;
      return bt - at;
    });

    if (limit) docs = docs.slice(0, limit);

    if (!docs.length) {
      el.innerHTML = '<div class="empty-state">لا توجد منشورات حاليًا</div>';
      return;
    }

    el.innerHTML = docs.map(doc => postCard(doc.data(), doc.id)).join('');

  } catch (e) {
    console.error(`CATEGORY LOAD ERROR: ${key}`, e);
    el.innerHTML = '<div class="empty-state">تعذر تحميل المنشورات حاليًا.</div>';
  }
}

async function loadHomeFeeds() {
  for (const key of Object.keys(CATEGORY_CONFIG)) {
    const box = document.querySelector(`[data-feed="${key}"]`);
    if (!box) continue;

    try {
      let snap;
      try {
        snap = await db.collection(CATEGORY_CONFIG[key].collection)
          .orderBy('createdAt', 'desc')
          .limit(3)
          .get();
      } catch (orderError) {
        console.warn(`تعذر ترتيب ${key} بواسطة createdAt`, orderError);
        snap = await db.collection(CATEGORY_CONFIG[key].collection).limit(3).get();
      }

      if (snap.empty) {
        box.innerHTML = '<div class="empty-state">لا توجد منشورات حاليًا</div>';
        continue;
      }

      box.innerHTML = snap.docs.map(x => postCard(x.data(), x.id)).join('');

    } catch (e) {
      console.error(`HOME FEED ERROR: ${key}`, e);
      box.innerHTML = '<div class="empty-state">تعذر تحميل المنشورات.</div>';
    }
  }
}

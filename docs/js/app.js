// ======================================================
// app.js - الهيدر الذكي
// فريق شمال واسط
// ======================================================

(function(){
  function initNav(){
    var b = document.getElementById('menuButton');
    var n = document.getElementById('mainNav');
    if (!n) return;

    if (b) b.addEventListener('click', function(){
      n.classList.toggle('open');
    });

    n.addEventListener('click', function(e){
      if (e.target.closest('a')) n.classList.remove('open');
    });

    var authLink = n.querySelector('[data-nav="auth"]');
    var member = n.querySelector('[data-nav="member"]');
    var admin = n.querySelector('[data-nav="admin"]');

    function setNav(signed, role){
      role = role || 'user';
      if (authLink) authLink.hidden = signed;
      if (member) member.hidden = !signed;
      if (admin) admin.hidden = !(signed && (role === 'admin' || role === 'supervisor'));
    }

    function applyNav(user){
      if (!user || user.isAnonymous === true) {
        setNav(false);
        return;
      }
      db.collection('users').doc(user.uid).get().then(function(snap){
        var role = snap.exists ? String(snap.data().role || 'user').trim().toLowerCase() : 'user';
        setNav(true, role);
      }).catch(function(e){
        console.error('NAV ROLE CHECK ERROR:', e);
        setNav(true, 'user');
      });
    }

    // الانتظار حتى Firebase يكون جاهز
    function waitForAuth(){
      if (window.auth && window.db) {
        auth.onAuthStateChanged(applyNav);
      } else {
        setTimeout(waitForAuth, 100);
      }
    }
    waitForAuth();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }

  // Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(function(){});
  }
})();

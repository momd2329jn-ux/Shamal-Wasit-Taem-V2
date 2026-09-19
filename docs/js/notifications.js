// ======================================================
// notifications.js - إشعارات الإدارة والأعضاء
// فريق شمال واسط
// ======================================================

(function(){
  window.WasitNotifications = {
    unreadCount: 0,

    listenAdminInquiries: function(user, onChange){
      if (!user || !window.db) return function(){};

      return db.collection('inquiries')
        .where('status', '==', 'new')
        .onSnapshot(function(snap){
          var count = 0;
          snap.forEach(function(doc){
            if (doc.data().adminSeen !== true) count++;
          });
          WasitNotifications.unreadCount = count;
          if (onChange) onChange(count, snap);
        }, function(err){
          console.error('إشعارات الإدارة', err);
        });
    },

    listenMemberReplies: function(user, onChange){
      if (!user || !window.db) return function(){};

      return db.collection('inquiries')
        .where('userId', '==', user.uid)
        .onSnapshot(function(snap){
          var count = 0;
          snap.forEach(function(doc){
            var d = doc.data();
            if (d.status === 'replied' && d.userSeen !== true) count++;
          });
          WasitNotifications.unreadCount = count;
          if (onChange) onChange(count, snap);
        }, function(err){
          console.error('إشعارات العضو', err);
        });
    },

    markMemberSeen: function(id){
      return db.collection('inquiries').doc(id).update({ userSeen: true });
    }
  };
})();

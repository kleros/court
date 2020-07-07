self.addEventListener('push', event => {
  const options = {
    body: 'Go to court',
    icon: 'stake-kleros-logo.png'
  };
  event.waitUntil(
    self.registration.showNotification(event.data.text(), options)
  );
})

self.addEventListener('notificationclick', function(event) {
  const clickedNotification = event.notification;
  clickedNotification.close();
  let url = 'https://court.kleros.io';
  event.waitUntil(
      clients.matchAll({type: 'window'}).then( windowClients => {
          // Check if there is already a window/tab open with the target URL
          for (var i = 0; i < windowClients.length; i++) {
              var client = windowClients[i];
              // If so, just focus it.
              if (client.url === url && 'focus' in client) {
                  return client.focus();
              }
          }
          // If not, then open the target URL in a new window/tab.
          if (clients.openWindow) {
              return clients.openWindow(url);
          }
      })
  );
});

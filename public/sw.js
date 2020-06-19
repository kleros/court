self.addEventListener('push', event => {
  console.log('New notification', event.data.text())
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
});

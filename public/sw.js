self.addEventListener('push', event => {
  console.log('New notification', event.data.text())
  const options = {
  }
  event.waitUntil(
    self.registration.showNotification(event.data.text(), options)
  );
})

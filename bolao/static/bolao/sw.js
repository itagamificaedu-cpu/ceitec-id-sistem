self.addEventListener("push", function (event) {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || "Confira o Bolão da Copa.",
    icon: "/static/img/logo-ceitec.svg",
    badge: "/static/img/badge-copa.svg",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/bolao/" },
  };
  event.waitUntil(self.registration.showNotification(data.title || "Bolão da Copa", options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

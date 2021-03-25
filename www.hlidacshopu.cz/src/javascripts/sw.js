importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.1.2/workbox-sw.js"
);

addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);

workbox.recipes.pageCache();
workbox.recipes.googleFontsCache();
workbox.recipes.staticResourceCache();
workbox.recipes.imageCache();

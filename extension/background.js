"use strict";

function activateDarkMode() {
  chrome.browserAction.setIcon({
    path: {
      "48": "icons/icon-light-48.png",
      "32": "icons/icon-light-32.png",
      "16": "icons/icon-light-16.png"
    }
  });
}

function activateLightMode() {
  chrome.browserAction.setIcon({
    path: {
      "48": "icons/icon-dark-48.png",
      "32": "icons/icon-dark-32.png",
      "16": "icons/icon-dark-16.png"
    }
  });
}

function setColorScheme() {
  const prefersColorScheme = scheme => window.matchMedia(`(prefers-color-scheme: ${scheme})`);

  const isDarkMode = prefersColorScheme("dark").matches;
  const isLightMode = prefersColorScheme("light").matches;
  const isNotSpecified = prefersColorScheme("no-preference").matches;

  prefersColorScheme("dark")
    .addEventListener("change", e => e.matches && activateDarkMode());
  prefersColorScheme("light")
    .addEventListener("change", e => e.matches && activateLightMode());

  if (isDarkMode) activateDarkMode();
  if (isLightMode) activateLightMode();
}


setColorScheme();

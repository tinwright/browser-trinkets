// Runs as a service worker in Chrome and as an event page in Firefox, so it keeps nothing in
// variables between events: everything lasting goes in chrome.storage.

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return;
  await chrome.storage.local.set({ note: 'Write anything here. It stays until you clear it.' });
});

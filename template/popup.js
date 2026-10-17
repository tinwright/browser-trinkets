// The popup shows the saved note and saves every change. chrome.* works in Firefox too, and in
// Manifest V3 both browsers return promises, so no polyfill is needed.

const note = /** @type {HTMLTextAreaElement} */ (document.querySelector('#note'));
const { note: saved = '' } = await chrome.storage.local.get('note');
note.value = saved;
note.addEventListener('input', () => chrome.storage.local.set({ note: note.value }));

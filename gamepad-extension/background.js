// Background service worker for the extension
// Handles installation and basic setup

chrome.runtime.onInstalled.addListener(() => {
  console.log('Gamepad Browser Controller installed');
  
  // Set default settings
  chrome.storage.local.set({
    enabled: true,
    scrollSpeed: 30
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'log') {
    console.log('[Gamepad Controller]', request.message);
  }
  return true;
});

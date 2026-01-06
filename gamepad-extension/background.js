// ===============================
// background scripting lfggggg
// ===============================

let activeTabId = null;

// CONFIG
const POLL_INTERVAL = 16;      // polling rate (ms)
const DEAD_ZONE = 0.15;        // joystick noise filter
const SPEED = 12;              // cursor speed
const MIN_DELTA = 0.5;         // minimum pixels to move before sending

// State
let lastDX = 0;
let lastDY = 0;

// Utility
function applyDeadZone(v) {
  return Math.abs(v) < DEAD_ZONE ? 0 : v;
}

// Get active tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
  activeTabId = tabId;
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) activeTabId = tabs[0].id;
});

// Main polling loop
setInterval(() => {
  if (!activeTabId) return;

  const pads = navigator.getGamepads();
  if (!pads || !pads[0]) return;

  const gp = pads[0];

  let x = applyDeadZone(gp.axes[0]);
  let y = applyDeadZone(gp.axes[1]);

  // Convert to pixel delta
  let dx = x * SPEED;
  let dy = y * SPEED;

  // Kill useless micro updates
  if (Math.abs(dx) < MIN_DELTA && Math.abs(dy) < MIN_DELTA) {
    lastDX = 0;
    lastDY = 0;
    return;
  }

  // Prevent sending same data repeatedly
  if (dx === lastDX && dy === lastDY) return;

  lastDX = dx;
  lastDY = dy;

  chrome.tabs.sendMessage(activeTabId, {
    type: "MOVE_CURSOR",
    dx,
    dy
  });

  // Button 0 → click
  if (gp.buttons[0].pressed) {
    chrome.tabs.sendMessage(activeTabId, { type: "CLICK" });
  }

  // Button 1 → scroll down
  if (gp.buttons[1].pressed) {
    chrome.tabs.sendMessage(activeTabId, {
      type: "SCROLL",
      amount: 80
    });
  }

  // Button 2 → scroll up
  if (gp.buttons[2].pressed) {
    chrome.tabs.sendMessage(activeTabId, {
      type: "SCROLL",
      amount: -80
    });
  }

}, POLL_INTERVAL);

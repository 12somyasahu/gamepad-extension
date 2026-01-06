// ==================================================
// Gamepad Browser Controller v3 (Keyboard-first)
// ==================================================

// ---------- CONFIG ----------
const POLL_RATE = 16;
const DEADZONE = 0.15;
const CURSOR_SPEED = 14;
const SCROLL_SPEED = 40;

// ---------- STATE ----------
let enabled = true;
let lastButtons = {};
let cursorX = innerWidth / 2;
let cursorY = innerHeight / 2;
let lastX = cursorX;
let lastY = cursorY;

// ---------- CURSOR ----------
const cursor = document.createElement("div");
Object.assign(cursor.style, {
  position: "fixed",
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  background: "white",
  border: "2px solid black",
  pointerEvents: "none",
  zIndex: 999999,
  willChange: "transform",
  display: "none"
});
document.documentElement.appendChild(cursor);

// ---------- HUD ----------
const hud = document.createElement("div");
Object.assign(hud.style, {
  position: "fixed",
  bottom: "20px",
  left: "50%",
  transform: "translateX(-50%)",
  background: "rgba(0,0,0,0.8)",
  color: "white",
  padding: "8px 14px",
  borderRadius: "8px",
  fontSize: "14px",
  zIndex: 999999,
  opacity: 0,
  transition: "opacity 0.2s"
});
document.body.appendChild(hud);

let hudTimer;
function showHUD(text) {
  hud.textContent = text;
  hud.style.opacity = 1;
  clearTimeout(hudTimer);
  hudTimer = setTimeout(() => (hud.style.opacity = 0), 700);
}

// ---------- HELPERS ----------
const dz = v => Math.abs(v) < DEADZONE ? 0 : v;

function sendKey(key, opts = {}) {
  const evt = new KeyboardEvent("keydown", {
    key,
    code: opts.code || key,
    bubbles: true,
    cancelable: true,
    altKey: opts.altKey || false
  });
  document.dispatchEvent(evt);
}

// ---------- BUTTON MAP (KEYBOARD-FIRST) ----------
const buttonActions = {
  0: () => { sendKey(" "); showHUD("A → Play / Pause"); },           // A
  1: () => { sendKey("ArrowLeft", { altKey: true }); showHUD("B → Back"); },
  2: () => { sendKey("m"); showHUD("X → Mute"); },
  3: () => { sendKey("f"); showHUD("Y → Fullscreen"); },
  4: () => { sendKey("MediaTrackPrevious"); showHUD("LB → Previous"); },
  5: () => { sendKey("MediaTrackNext"); showHUD("RB → Next"); },
  10: () => leftClick(),
  11: () => rightClick(),
  12: () => { sendKey("ArrowUp"); showHUD("Vol +"); },
  13: () => { sendKey("ArrowDown"); showHUD("Vol -"); },
  14: () => { sendKey("ArrowLeft"); showHUD("-10s"); },
  15: () => { sendKey("ArrowRight"); showHUD("+10s"); }
};

// ---------- MOUSE ----------
function leftClick() {
  document.elementFromPoint(cursorX, cursorY)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  showHUD("L3 → Click");
}

function rightClick() {
  document.elementFromPoint(cursorX, cursorY)
    ?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
  showHUD("R3 → Right Click");
}

// ---------- LOOP ----------
setInterval(() => {
  if (!enabled) return;

  const gp = navigator.getGamepads().find(g => g);
  if (!gp) return;

  // Buttons (EDGE)
  gp.buttons.forEach((b, i) => {
    if (b.pressed && !lastButtons[i]) {
      buttonActions[i]?.();
    }
    lastButtons[i] = b.pressed;
  });

  // Left stick → scroll
  const ly = dz(gp.axes[1]);
  if (ly) window.scrollBy(0, ly * SCROLL_SPEED);

  // Right stick → cursor
  const rx = dz(gp.axes[2]);
  const ry = dz(gp.axes[3]);
  if (rx || ry) {
    cursor.style.display = "block";
    cursorX = Math.max(0, Math.min(innerWidth, cursorX + rx * CURSOR_SPEED));
    cursorY = Math.max(0, Math.min(innerHeight, cursorY + ry * CURSOR_SPEED));
    if (cursorX !== lastX || cursorY !== lastY) {
      cursor.style.transform = `translate3d(${cursorX}px,${cursorY}px,0)`;
      lastX = cursorX;
      lastY = cursorY;
    }
  }

}, POLL_RATE);

// ---------- ENABLE ----------
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === "toggleEnabled") {
    enabled = msg.enabled;
    cursor.style.display = enabled ? "block" : "none";
  }
});

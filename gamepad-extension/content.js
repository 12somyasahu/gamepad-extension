// ==================================================
// Gamepad Browser Controller v2.2 (FINAL BASELINE)
// ==================================================

// ---------------- CONFIG ----------------
const POLL_RATE = 16; // ms (independent of video)
const DEADZONE = 0.15;
const TRIGGER_DEADZONE = 0.1;
const CURSOR_SPEED = 14;
const SCROLL_SPEED = 35;

// ---------------- STATE ----------------
let enabled = true;
let lastButtons = {};
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let lastX = cursorX;
let lastY = cursorY;
let currentPlaybackSpeed = 1.0;

// ---------------- CURSOR ----------------
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
  transform: "translate3d(0,0,0)",
  willChange: "transform",
  display: "none"
});
document.documentElement.appendChild(cursor);

// ---------------- HUD ----------------
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
  hudTimer = setTimeout(() => (hud.style.opacity = 0), 800);
}

// ---------------- HELPERS ----------------
const dz = v => Math.abs(v) < DEADZONE ? 0 : v;
const media = () => document.querySelector("video, audio");

// ---------------- ACTIONS ----------------
const actions = {
  PLAY_PAUSE() {
    const m = media(); if (!m) return;
    m.paused ? m.play() : m.pause();
    showHUD("A → Play / Pause");
  },

  BACK() {
    if (history.length > 1) history.back();
    showHUD("B → Back");
  },

  MUTE() {
    const m = media(); if (!m) return;
    m.muted = !m.muted;
    showHUD("X → Mute");
  },

  FULLSCREEN() {
    const m = media(); if (!m) return;
    document.fullscreenElement ? document.exitFullscreen() : m.requestFullscreen();
    showHUD("Y → Fullscreen");
  },

  NEXT() {
    document.querySelector(
      ".ytp-next-button, button[data-uia='next-episode-seamless-button']"
    )?.click();
    showHUD("RB → Next");
  },

  PREVIOUS() {
    document.querySelector(
      ".ytp-prev-button, button[data-uia='previous-episode-button']"
    )?.click();
    showHUD("LB → Previous");
  },

  SEEK(delta, label) {
    const m = media(); if (!m) return;
    m.currentTime += delta;
    showHUD(label);
  },

  VOLUME(delta, label) {
    const m = media(); if (!m) return;
    m.volume = Math.min(1, Math.max(0, m.volume + delta));
    showHUD(label);
  },

  LEFT_CLICK() {
    document.elementFromPoint(cursorX, cursorY)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    showHUD("L3 → Left Click");
  },

  RIGHT_CLICK() {
    document.elementFromPoint(cursorX, cursorY)
      ?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    showHUD("R3 → Right Click");
  }
};

// ---------------- INPUT LOOP ----------------
setInterval(() => {
  if (!enabled) return;

  const gp = navigator.getGamepads().find(g => g);
  if (!gp) return;

  // -------- BUTTONS (EDGE TRIGGERED) --------
  gp.buttons.forEach((b, i) => {
    const was = lastButtons[i];

    if (b.pressed && !was) {
      const map = {
        0: actions.PLAY_PAUSE,       // A
        1: actions.BACK,             // B
        2: actions.MUTE,             // X
        3: actions.FULLSCREEN,       // Y
        4: actions.PREVIOUS,         // LB
        5: actions.NEXT,             // RB
        10: actions.LEFT_CLICK,      // L3
        11: actions.RIGHT_CLICK,     // R3
        12: () => actions.VOLUME(0.1, "Vol +"),
        13: () => actions.VOLUME(-0.1, "Vol -"),
        14: () => actions.SEEK(-10, "-10s"),
        15: () => actions.SEEK(10, "+10s"),
      };

      map[i]?.();
    }

    lastButtons[i] = b.pressed;
  });

  // -------- TRIGGERS (ROBUST) --------
  const lt = gp.buttons[6]?.value || 0;
  const rt = gp.buttons[7]?.value || 0;
  const m = media();

  if (m) {
    let target = 1.0;

    if (rt > TRIGGER_DEADZONE) target = 1.0 + rt;           // RT: 1x → 2x
    if (lt > TRIGGER_DEADZONE && rt <= TRIGGER_DEADZONE)
      target = 1.0 - lt * 0.75;                             // LT: 1x → 0.25x

    if (Math.abs(target - currentPlaybackSpeed) > 0.05) {
      currentPlaybackSpeed = target;
      m.playbackRate = target;
      showHUD(`Speed ${target.toFixed(2)}x`);
    }
  }

  // -------- LEFT STICK → SCROLL --------
  const ly = dz(gp.axes[1]);
  if (ly) window.scrollBy(0, ly * SCROLL_SPEED);

  // -------- RIGHT STICK → CURSOR --------
  const rx = dz(gp.axes[2]);
  const ry = dz(gp.axes[3]);

  if (rx || ry) {
    cursor.style.display = "block";

    cursorX = Math.max(0, Math.min(innerWidth, cursorX + rx * CURSOR_SPEED));
    cursorY = Math.max(0, Math.min(innerHeight, cursorY + ry * CURSOR_SPEED));

    if (cursorX !== lastX || cursorY !== lastY) {
      cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
      lastX = cursorX;
      lastY = cursorY;
    }
  }

}, POLL_RATE);

// ---------------- ENABLE / DISABLE ----------------
chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === "toggleEnabled") {
    enabled = msg.enabled;
    cursor.style.display = enabled ? "block" : "none";
  }
});

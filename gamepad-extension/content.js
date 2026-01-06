// ===============================
// Gamepad Browser Controller v2
// ===============================

// ---------- CONFIG ----------
const DEADZONE = 0.15;
const CURSOR_SPEED = 14;
const SCROLL_SPEED = 35;
const TRIGGER_DEADZONE = 0.1;

// ---------- STATE ----------
let enabled = true;
let lastButtons = {};
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let lastCursorX = cursorX;
let lastCursorY = cursorY;
let currentSpeed = 1.0;

// ---------- CURSOR ----------
const cursor = document.createElement("div");
cursor.id = "gp-cursor";
Object.assign(cursor.style, {
  position: "fixed",
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  background: "white",
  border: "2px solid black",
  pointerEvents: "none",
  zIndex: "999999",
  transform: "translate3d(0,0,0)",
  willChange: "transform",
  display: "none"
});
document.documentElement.appendChild(cursor);

// ---------- HELPERS ----------
const dz = v => Math.abs(v) < DEADZONE ? 0 : v;

function media() {
  return document.querySelector("video, audio");
}

function notify(text) {
  const n = document.createElement("div");
  n.textContent = text;
  Object.assign(n.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "rgba(0,0,0,0.8)",
    color: "white",
    padding: "10px 16px",
    borderRadius: "8px",
    zIndex: 999999
  });
  document.body.appendChild(n);
  setTimeout(() => n.remove(), 1200);
}

// ---------- ACTIONS ----------
const actions = {
  playPause() {
    const m = media();
    if (!m) return;
    m.paused ? m.play() : m.pause();
    notify(m.paused ? "⏸ Paused" : "▶ Playing");
  },
  mute() {
    const m = media();
    if (!m) return;
    m.muted = !m.muted;
    notify(m.muted ? "🔇 Muted" : "🔊 Unmuted");
  },
  volume(d) {
    const m = media();
    if (!m) return;
    m.volume = Math.min(1, Math.max(0, m.volume + d));
  },
  seek(d) {
    const m = media();
    if (!m) return;
    m.currentTime += d;
  },
  fullscreen() {
    const m = media();
    if (!m) return;
    document.fullscreenElement ? document.exitFullscreen() : m.requestFullscreen();
  },
  leftClick() {
    document.elementFromPoint(cursorX, cursorY)
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  },
  rightClick() {
    document.elementFromPoint(cursorX, cursorY)
      ?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
  }
};

// ---------- GAMEPAD LOOP ----------
function loop() {
  if (!enabled) return requestAnimationFrame(loop);

  const gp = navigator.getGamepads().find(g => g);
  if (!gp) return requestAnimationFrame(loop);

  // Buttons (EDGE TRIGGERED)
  gp.buttons.forEach((b, i) => {
    const was = lastButtons[i];
    if (b.pressed && !was) {
      ({
        0: actions.playPause,
        2: actions.mute,
        3: () => actions.seek(30),
        12: () => actions.volume(0.1),
        13: () => actions.volume(-0.1),
        14: () => actions.seek(-10),
        15: () => actions.seek(10),
        10: actions.rightClick,
        11: actions.leftClick
      })[i]?.();
    }
    lastButtons[i] = b.pressed;
  });

  // Triggers → playback speed
  const lt = gp.buttons[6]?.value || 0;
  const rt = gp.buttons[7]?.value || 0;
  const m = media();
  if (m) {
    let target = 1.0;
    if (rt > TRIGGER_DEADZONE) target = 1 + rt;
    if (lt > TRIGGER_DEADZONE && rt <= TRIGGER_DEADZONE)
      target = 1 - lt * 0.75;
    if (Math.abs(target - currentSpeed) > 0.05) {
      currentSpeed = target;
      m.playbackRate = target;
    }
  }

  // Left stick → scroll
  const ly = dz(gp.axes[1]);
  if (ly) window.scrollBy(0, ly * SCROLL_SPEED);

  // Right stick → cursor
  const rx = dz(gp.axes[2]);
  const ry = dz(gp.axes[3]);
  if (rx || ry) {
    cursor.style.display = "block";
    cursorX = Math.max(0, Math.min(window.innerWidth, cursorX + rx * CURSOR_SPEED));
    cursorY = Math.max(0, Math.min(window.innerHeight, cursorY + ry * CURSOR_SPEED));
    if (cursorX !== lastCursorX || cursorY !== lastCursorY) {
      cursor.style.transform = `translate3d(${cursorX}px,${cursorY}px,0)`;
      lastCursorX = cursorX;
      lastCursorY = cursorY;
    }
  }

  requestAnimationFrame(loop);
}

chrome.runtime.onMessage.addListener(msg => {
  if (msg.action === "toggleEnabled") {
    enabled = msg.enabled;
    cursor.style.display = enabled ? "block" : "none";
  }
});

loop();


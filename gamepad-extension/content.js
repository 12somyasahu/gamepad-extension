//   Main gamepad controller logic
// big dawggggg

(function () {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────────────────

  const DEADZONE = 0.15;
  const CURSOR_SPEED = 12;
  const SCROLL_SPEED = 8;
  const CLICK_FLASH_MS = 150;

  // Default button-to-action mappings (index = gamepad button index)
  const DEFAULT_MAPPINGS = {
    0:  'playPause',       // A / Cross
    1:  'back',            // B / Circle
    2:  'mute',            // X / Square
    3:  'fullscreen',      // Y / Triangle
    4:  'prevTrack',       // LB
    5:  'nextTrack',       // RB
    8:  'nothing',         // Select / Share
    9:  'nothing',         // Start / Options
    10: 'leftClick',       // L3
    11: 'rightClick',      // R3
    12: 'volumeUp',        // D-Pad Up
    13: 'volumeDown',      // D-Pad Down
    14: 'rewind10',        // D-Pad Left
    15: 'forward10',       // D-Pad Right
  };

  // All available actions
  const ACTIONS = {
    playPause:   'Play / Pause',
    back:        'Go Back',
    mute:        'Mute / Unmute',
    fullscreen:  'Fullscreen',
    prevTrack:   'Previous Track',
    nextTrack:   'Next Track',
    volumeUp:    'Volume Up',
    volumeDown:  'Volume Down',
    rewind10:    'Rewind 10s',
    forward10:   'Forward 10s',
    leftClick:   'Left Click',
    rightClick:  'Right Click',
    nothing:     '(Disabled)',
  };

  // ─── State ───────────────────────────────────────────────────────────────────

  let mappings = { ...DEFAULT_MAPPINGS };
  let cursor = null;
  let cursorX = window.innerWidth / 2;
  let cursorY = window.innerHeight / 2;
  let prevButtons = [];
  let rafId = null;
  let active = false;
  let enabled = true; // contlled by popup toggle

  // ─── Cursor Element ──────────────────────────────────────────────────────────

  function createCursor() {
    if (cursor) return;
    cursor = document.createElement('div');
    cursor.id = '__gamepad_cursor__';
    cursor.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 80, 80, 0.85);
      border: 2px solid white;
      box-shadow: 0 0 10px rgba(255,80,80,0.6), 0 0 20px rgba(255,80,80,0.3);
      pointer-events: none;
      z-index: 2147483647;
      transform: translate(-50%, -50%);
      transition: transform 0.05s ease, box-shadow 0.1s ease;
      display: none;
    `;
    document.body.appendChild(cursor);
  }

  function updateCursorPos() {
    if (!cursor) return;
    cursor.style.left = cursorX + 'px';
    cursor.style.top = cursorY + 'px';
    cursor.style.display = 'block';
  }

  function flashCursor() {
    if (!cursor) return;
    cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
    cursor.style.boxShadow = '0 0 20px rgba(255,255,255,0.9), 0 0 40px rgba(255,80,80,0.8)';
    setTimeout(() => {
      if (cursor) {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        cursor.style.boxShadow = '0 0 10px rgba(255,80,80,0.6), 0 0 20px rgba(255,80,80,0.3)';
      }
    }, CLICK_FLASH_MS);
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  function getVideo() {
    return document.querySelector('video');
  }

  function doAction(action) {
    const video = getVideo();
    switch (action) {
      case 'playPause':
        if (video) video.paused ? video.play() : video.pause();
        break;
      case 'back':
        history.back();
        break;
      case 'mute':
        if (video) video.muted = !video.muted;
        break;
      case 'fullscreen':
        if (!document.fullscreenElement) {
          (video || document.documentElement).requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
        break;
      case 'prevTrack':
        // Try media session prev, or click previous button by aria-label
        if (navigator.mediaSession?.setActionHandler) {
          // trigger via clicking common prev buttons
        }
        clickByAria(['Previous', 'Previous video', 'Previous track', 'Prev', 'Back']);
        break;
      case 'nextTrack':
        clickByAria(['Next', 'Next video', 'Next track', 'Autoplay next']);
        break;
      case 'volumeUp':
        if (video) video.volume = Math.min(1, video.volume + 0.1);
        break;
      case 'volumeDown':
        if (video) video.volume = Math.max(0, video.volume - 0.1);
        break;
      case 'rewind10':
        if (video) video.currentTime = Math.max(0, video.currentTime - 10);
        break;
      case 'forward10':
        if (video) video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
        break;
      case 'leftClick':
        performClick(cursorX, cursorY, false);
        break;
      case 'rightClick':
        performClick(cursorX, cursorY, true);
        break;
      case 'nothing':
      default:
        break;
    }
  }

  function clickByAria(labels) {
    for (const label of labels) {
      const el = document.querySelector(`[aria-label="${label}"]`);
      if (el) { el.click(); return; }
    }
  }

  function performClick(x, y, rightClick) {
    flashCursor();
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const eventType = rightClick ? 'contextmenu' : 'click';
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y };
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent(eventType, opts));
    if (!rightClick && el.tagName === 'A' && el.href) {
      window.location.href = el.href;
    }
  }

  // ─── Trigger Speed Control pew pew ────────────────────────────────────────────────────

  function handleTriggers(gp) {
    const video = getVideo();
    if (!video) return;
    const lt = gp.buttons[6]?.value ?? 0; // LT
    const rt = gp.buttons[7]?.value ?? 0; // RT
    if (lt > DEADZONE) {
      video.playbackRate = 1 - lt * 0.75; // 0.25x to 1x
    } else if (rt > DEADZONE) {
      video.playbackRate = 1 + rt;         // 1x to 2x
    } else {
      if (video.playbackRate !== 1) video.playbackRate = 1;
    }
  }

  // ─── Main Loop ────────────────────────────────────────────────────────────────

  function gameLoop() {
    if (!enabled) {
      // Hide cursor when disabled
      if (cursor) cursor.style.display = 'none';
      prevButtons = [];
      rafId = requestAnimationFrame(gameLoop);
      return;
    }

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(gamepads).find(g => g && g.connected);

    if (gp) {
      if (!active) {
        active = true;
        createCursor();
      }

      // ── Analog sticks ──
      const lx = applyDeadzone(gp.axes[0] || 0);
      const ly = applyDeadzone(gp.axes[1] || 0);
      const rx = applyDeadzone(gp.axes[2] || 0);
      const ry = applyDeadzone(gp.axes[3] || 0);

      // Left stick = scroll
      window.scrollBy(lx * SCROLL_SPEED, ly * SCROLL_SPEED);

      // Right stick = move cursor
      if (rx !== 0 || ry !== 0) {
        cursorX = Math.max(0, Math.min(window.innerWidth, cursorX + rx * CURSOR_SPEED));
        cursorY = Math.max(0, Math.min(window.innerHeight, cursorY + ry * CURSOR_SPEED));
        updateCursorPos();
      }

      // ── Triggers (analog speed) ──
      handleTriggers(gp);

      // ── Buttons (edge detection - only fire on press, not hold) ──
      gp.buttons.forEach((btn, i) => {
        const pressed = btn.pressed;
        const wasPressed = prevButtons[i] || false;
        if (pressed && !wasPressed) {
          const action = mappings[i];
          if (action) doAction(action);
        }
        prevButtons[i] = pressed;
      });
    }

    rafId = requestAnimationFrame(gameLoop);
  }

  function applyDeadzone(val) {
    if (Math.abs(val) < DEADZONE) return 0;
    return val;
  }

  // ─── Load Mappings & Start ────────────────────────────────────────────────────

  function start() {
    chrome.storage.sync.get(['mappings', 'enabled'], (data) => {
      if (data.mappings) {
        // Merge saved mappings over defaults
        mappings = { ...DEFAULT_MAPPINGS, ...data.mappings };
      }
      enabled = data.enabled !== false; // default ON
      rafId = requestAnimationFrame(gameLoop);
    });
  }

  // Listen for mapping updates and enable/disable from popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'updateMappings') {
      mappings = { ...DEFAULT_MAPPINGS, ...msg.mappings };
    }
    if (msg.type === 'setEnabled') {
      enabled = msg.enabled;
    }
  });

  // Clean up cursor if tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && cursor) {
      cursor.style.display = 'none';
    }
  });

  start();

  // Expose for debugging
  window.__gamepadController = { mappings, ACTIONS, DEFAULT_MAPPINGS };

})();

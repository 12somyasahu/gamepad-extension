//   Main gamepad controller logic
// big dawggggg

(function () {
  'use strict';

  // ─── Constants ──────────────────────────────────────────────────────────────

  const DEADZONE = 0.15;
  const CURSOR_SPEED = 12;
  const SCROLL_SPEED = 8;
  const CLICK_FLASH_MS = 150;
  const MISSING_THRESHOLD = 5;

  // Polling rate: rAF (~60fps) when there is active input, slow timeout when idle
  const IDLE_POLL_MS = 50; // ~20fps when nothing is happening

  const DEFAULT_MAPPINGS = {
    0:  'playPause',
    1:  'back',
    2:  'mute',
    3:  'fullscreen',
    4:  'prevTrack',
    5:  'nextTrack',
    8:  'nothing',
    9:  'nothing',
    10: 'leftClick',
    11: 'rightClick',
    12: 'volumeUp',
    13: 'volumeDown',
    14: 'rewind10',
    15: 'forward10',
  };

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
  let timerId = null;
  let active = false;
  let enabled = true;
  let missingFrames = 0;

  // Cached video element — re-queried lazily, not every frame
  let _videoCache = null;
  let _videoCacheTime = 0;
  const VIDEO_CACHE_MS = 2000;

  function getVideo() {
    const now = Date.now();
    if (!_videoCache || now - _videoCacheTime > VIDEO_CACHE_MS) {
      _videoCache = document.querySelector('video');
      _videoCacheTime = now;
    }
    return _videoCache;
  }

  // ─── Cursor ──────────────────────────────────────────────────────────────────

  function createCursor() {
    if (cursor) return;
    cursor = document.createElement('div');
    cursor.id = '__gamepad_cursor__';
    cursor.style.cssText = `
      position:fixed;width:20px;height:20px;border-radius:50%;
      background:rgba(255,80,80,0.85);border:2px solid white;
      box-shadow:0 0 10px rgba(255,80,80,0.6),0 0 20px rgba(255,80,80,0.3);
      pointer-events:none;z-index:2147483647;
      transform:translate(-50%,-50%);
      transition:transform 0.05s ease,box-shadow 0.1s ease;
      display:none;will-change:left,top;
    `;
    document.body.appendChild(cursor);
  }

  function updateCursorPos() {
    if (!cursor) return;
    cursor.style.left = cursorX + 'px';
    cursor.style.top  = cursorY + 'px';
    cursor.style.display = 'block';
  }

  function hideCursor() {
    if (cursor) cursor.style.display = 'none';
  }

  function flashCursor() {
    if (!cursor) return;
    cursor.style.transform = 'translate(-50%,-50%) scale(0.7)';
    cursor.style.boxShadow = '0 0 20px rgba(255,255,255,0.9),0 0 40px rgba(255,80,80,0.8)';
    setTimeout(() => {
      if (cursor) {
        cursor.style.transform = 'translate(-50%,-50%) scale(1)';
        cursor.style.boxShadow = '0 0 10px rgba(255,80,80,0.6),0 0 20px rgba(255,80,80,0.3)';
      }
    }, CLICK_FLASH_MS);
  }

  // ─── Next / Prev Track ───────────────────────────────────────────────────────
  // Tries site-specific selectors first, then keyboard shortcuts as fallback.

  function tryNextTrack() {
    const selectors = [
      '.ytp-next-button',                               // YouTube
      '[data-testid="next-episode-seamless-button"]',   // Netflix
      '[data-a-target="player-skip-forward"]',          // Twitch
      '[aria-label="Next"]',
      '[aria-label="Next video"]',
      '[aria-label="Next track"]',
      '[aria-label="Skip to next"]',
      '[title="Next"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) { el.click(); return; }
    }
    // Keyboard fallback: Shift+N (YouTube next in playlist / autoplay)
    dispatchKey('n', { shiftKey: true });
  }

  function tryPrevTrack() {
    const selectors = [
      '.ytp-prev-button',                               // YouTube
      '[data-testid="previous-episode-button"]',        // Netflix
      '[aria-label="Previous"]',
      '[aria-label="Previous video"]',
      '[aria-label="Previous track"]',
      '[title="Previous"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) { el.click(); return; }
    }
    // Keyboard fallback: Shift+P (YouTube prev in playlist)
    dispatchKey('p', { shiftKey: true });
  }

  function dispatchKey(key, opts = {}) {
    const target = document.activeElement || document.body;
    const base = { key, bubbles: true, cancelable: true, ...opts };
    target.dispatchEvent(new KeyboardEvent('keydown', base));
    target.dispatchEvent(new KeyboardEvent('keyup',   base));
  }

  // ─── Actions ─────────────────────────────────────────────────────────────────

  function doAction(action) {
    const video = getVideo();
    switch (action) {
      case 'playPause':
        if (video) { video.paused ? video.play() : video.pause(); }
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
      case 'prevTrack': tryPrevTrack(); break;
      case 'nextTrack': tryNextTrack(); break;
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
      case 'leftClick':  performClick(cursorX, cursorY, false); break;
      case 'rightClick': performClick(cursorX, cursorY, true);  break;
    }
  }

  function performClick(x, y, rightClick) {
    flashCursor();
    const el = document.elementFromPoint(x, y);
    if (!el) return;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y };
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup',   opts));
    el.dispatchEvent(new MouseEvent(rightClick ? 'contextmenu' : 'click', opts));
    if (!rightClick && el.tagName === 'A' && el.href) {
      window.location.href = el.href;
    }
  }

  // ─── Triggers ────────────────────────────────────────────────────────────────

  let lastPlaybackRate = 1;

  function handleTriggers(gp) {
    const lt = gp.buttons[6]?.value ?? 0;
    const rt = gp.buttons[7]?.value ?? 0;

    let target = 1;
    if (lt > DEADZONE)      target = 1 - lt * 0.75; // 0.25x–1x
    else if (rt > DEADZONE) target = 1 + rt;          // 1x–2x

    // Only touch the DOM if playback rate actually changed
    if (target !== lastPlaybackRate) {
      const video = getVideo();
      if (video) video.playbackRate = target;
      lastPlaybackRate = target;
    }
  }

  // ─── Main Loop ────────────────────────────────────────────────────────────────
  // Runs at rAF speed (~60fps) only when there is active input.
  // Drops to IDLE_POLL_MS (~20fps) when the controller is idle to avoid jank.

  function scheduleNext(hasInput) {
    timerId = hasInput
      ? requestAnimationFrame(gameLoop)
      : setTimeout(gameLoop, IDLE_POLL_MS);
  }

  function gameLoop() {
    if (!enabled) {
      hideCursor();
      prevButtons = [];
      missingFrames = 0;
      timerId = setTimeout(gameLoop, IDLE_POLL_MS);
      return;
    }

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(gamepads).find(g => g && g.connected);

    if (!gp) {
      missingFrames++;
      if (missingFrames >= MISSING_THRESHOLD) {
        hideCursor();
        active = false;
        prevButtons = [];
      }
      timerId = setTimeout(gameLoop, IDLE_POLL_MS);
      return;
    }

    missingFrames = 0;
    if (!active) { active = true; createCursor(); }

    // ── Analog sticks ──
    const lx = applyDeadzone(gp.axes[0] || 0);
    const ly = applyDeadzone(gp.axes[1] || 0);
    const rx = applyDeadzone(gp.axes[2] || 0);
    const ry = applyDeadzone(gp.axes[3] || 0);

    // Guard: only call scrollBy when the stick is actually moving
    if (lx !== 0 || ly !== 0) {
      window.scrollBy(lx * SCROLL_SPEED, ly * SCROLL_SPEED);
    }

    if (rx !== 0 || ry !== 0) {
      cursorX = Math.max(0, Math.min(window.innerWidth,  cursorX + rx * CURSOR_SPEED));
      cursorY = Math.max(0, Math.min(window.innerHeight, cursorY + ry * CURSOR_SPEED));
      updateCursorPos();
    }

    // ── Triggers ──
    handleTriggers(gp);

    // ── Buttons (for loop is faster than forEach + closure) ──
    let anyPressed = false;
    for (let i = 0; i < gp.buttons.length; i++) {
      const pressed = gp.buttons[i].pressed;
      if (pressed && !prevButtons[i]) {
        const action = mappings[i];
        if (action && action !== 'nothing') doAction(action);
      }
      if (pressed) anyPressed = true;
      prevButtons[i] = pressed;
    }

    const lt = gp.buttons[6]?.value ?? 0;
    const rt = gp.buttons[7]?.value ?? 0;
    const hasInput = lx || ly || rx || ry || anyPressed || lt > DEADZONE || rt > DEADZONE;

    scheduleNext(hasInput);
  }

  function applyDeadzone(val) {
    return Math.abs(val) < DEADZONE ? 0 : val;
  }

  // ─── Init ────────────────────────────────────────────────────────────────────

  function start() {
    chrome.storage.sync.get(['mappings', 'enabled'], (data) => {
      if (data.mappings) mappings = { ...DEFAULT_MAPPINGS, ...data.mappings };
      enabled = data.enabled !== false;
      timerId = setTimeout(gameLoop, IDLE_POLL_MS);
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'updateMappings') mappings = { ...DEFAULT_MAPPINGS, ...msg.mappings };
    if (msg.type === 'setEnabled')     enabled = msg.enabled;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hideCursor();
  });

  window.addEventListener('gamepaddisconnected', () => {
    hideCursor();
    active = false;
    prevButtons = [];
    missingFrames = MISSING_THRESHOLD;
  });

  start();

  window.__gamepadController = { mappings, ACTIONS, DEFAULT_MAPPINGS };

})();

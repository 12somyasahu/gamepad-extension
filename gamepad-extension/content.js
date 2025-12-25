// ==========================================
// GAMEPAD BROWSER CONTROLLER - CONTENT SCRIPT
// ==========================================

// State management
let state = {
  enabled: true,
  lastButtons: {},
  mouseX: window.innerWidth / 2,
  mouseY: window.innerHeight / 2,
  playbackSpeed: 1.0
};

// Constants
const CONFIG = {
  scrollSpeed: 30,
  cursorSpeed: 15,
  stickDeadzone: 0.15,
  triggerDeadzone: 0.1
};

// Default button mapping
const DEFAULT_MAP = {
  0: 'playPause',    // A
  1: 'goBack',       // B
  2: 'mute',         // X
  3: 'fullscreen',   // Y
  4: 'previousVideo',// LB
  5: 'nextVideo',    // RB
  10: 'leftClick',   // L3
  11: 'rightClick',  // R3
  12: 'volumeUp',    // D-Up
  13: 'volumeDown',  // D-Down
  14: 'rewind',      // D-Left
  15: 'forward'      // D-Right
};

let customMap = {};

// ==========================================
// CURSOR MANAGEMENT
// ==========================================

const cursor = document.createElement('div');
cursor.style.cssText = `
  position: fixed;
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, #fff 0%, #64f 100%);
  border: 3px solid rgba(255,255,255,0.9);
  border-radius: 50%;
  pointer-events: none;
  z-index: 2147483647;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 20px rgba(100,100,255,0.8);
  display: block;
  transition: transform 0.1s ease;
`;
document.body?.appendChild(cursor);

function updateCursor() {
  cursor.style.left = state.mouseX + 'px';
  cursor.style.top = state.mouseY + 'px';
}

// ==========================================
// CLICK SIMULATION - PROPERLY IMPLEMENTED
// ==========================================

function simulateClick(rightClick = false) {
  // Get all elements at cursor position
  const elements = document.elementsFromPoint(state.mouseX, state.mouseY);
  const target = elements.find(el => el !== cursor) || elements[0];
  
  if (!target) return;
  
  // Visual feedback
  cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
  setTimeout(() => {
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 150);
  
  // Create proper mouse events
  const events = rightClick 
    ? ['mousedown', 'mouseup', 'contextmenu']
    : ['mousedown', 'mouseup', 'click'];
  
  events.forEach(eventType => {
    const evt = new MouseEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: state.mouseX,
      clientY: state.mouseY,
      button: rightClick ? 2 : 0,
      buttons: rightClick ? 2 : 1
    });
    target.dispatchEvent(evt);
  });
  
  // For left click, also trigger native click on clickable elements
  if (!rightClick && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.onclick)) {
    target.click?.();
  }
  
  notify(rightClick ? '🖱️ Right Click' : '🖱️ Click');
}

// ==========================================
// MEDIA CONTROL
// ==========================================

function findMedia() {
  // Find visible video first
  const videos = Array.from(document.querySelectorAll('video'));
  const visible = videos.find(v => {
    const rect = v.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && v.readyState >= 2;
  });
  
  return visible || document.querySelector('video, audio');
}

function adjustPlaybackSpeed(lt, rt) {
  const media = findMedia();
  if (!media) return;
  
  let speed = 1.0;
  
  if (rt > CONFIG.triggerDeadzone) {
    speed = 1.0 + rt; // 1x to 2x
  } else if (lt > CONFIG.triggerDeadzone) {
    speed = 1.0 - (lt * 0.75); // 1x to 0.25x
  }
  
  // Only update if changed significantly
  if (Math.abs(speed - state.playbackSpeed) > 0.05) {
    state.playbackSpeed = speed;
    media.playbackRate = speed;
    
    // Occasional notification (not every frame)
    if (Math.random() < 0.05) {
      notify(`⚡ ${speed.toFixed(2)}x`);
    }
  }
}

// ==========================================
// ACTION HANDLERS
// ==========================================

const ACTIONS = {
  playPause: () => {
    const m = findMedia();
    if (!m) return;
    if (m.paused) {
      m.play();
      notify('▶ Play');
    } else {
      m.pause();
      notify('⏸ Pause');
    }
  },
  
  mute: () => {
    const m = findMedia();
    if (!m) return;
    m.muted = !m.muted;
    notify(m.muted ? '🔇 Muted' : '🔊 Unmuted');
  },
  
  volumeUp: () => {
    const m = findMedia();
    if (!m) return;
    m.volume = Math.min(1, m.volume + 0.1);
    notify(`🔊 ${Math.round(m.volume * 100)}%`);
  },
  
  volumeDown: () => {
    const m = findMedia();
    if (!m) return;
    m.volume = Math.max(0, m.volume - 0.1);
    notify(`🔉 ${Math.round(m.volume * 100)}%`);
  },
  
  forward: () => {
    const m = findMedia();
    if (!m || isNaN(m.duration)) return;
    m.currentTime = Math.min(m.duration, m.currentTime + 10);
    notify('⏩ +10s');
  },
  
  rewind: () => {
    const m = findMedia();
    if (!m || isNaN(m.duration)) return;
    m.currentTime = Math.max(0, m.currentTime - 10);
    notify('⏪ -10s');
  },
  
  fullscreen: () => {
    const m = findMedia();
    if (!m) return;
    if (!document.fullscreenElement) {
      m.requestFullscreen?.();
      notify('⛶ Fullscreen');
    } else {
      document.exitFullscreen?.();
      notify('⛶ Exit');
    }
  },
  
  goBack: () => {
    history.back();
    notify('⬅️ Back');
  },
  
  nextVideo: () => {
    // Site-specific next buttons
    const selectors = [
      '.ytp-next-button',
      'button[data-uia="next-episode-seamless-button"]',
      '.player-controls__right-control-group button:last-child'
    ];
    
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        notify('⏭️ Next');
        return;
      }
    }
  },
  
  previousVideo: () => {
    const selectors = [
      '.ytp-prev-button',
      'button[data-uia="previous-episode-button"]'
    ];
    
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) {
        btn.click();
        notify('⏮️ Previous');
        return;
      }
    }
  },
  
  leftClick: () => simulateClick(false),
  rightClick: () => simulateClick(true),
  none: () => {} // Disabled action
};

// ==========================================
// NOTIFICATION SYSTEM
// ==========================================

function notify(text) {
  // Remove old notification
  document.getElementById('gp-notify')?.remove();
  
  const n = document.createElement('div');
  n.id = 'gp-notify';
  n.textContent = text;
  n.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0,0,0,0.85);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font: bold 16px sans-serif;
    z-index: 2147483647;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255,255,255,0.2);
    animation: slideIn 0.3s ease;
  `;
  
  document.body?.appendChild(n);
  
  setTimeout(() => {
    n.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => n.remove(), 300);
  }, 1500);
}

// Add animation styles
if (!document.getElementById('gp-styles')) {
  const style = document.createElement('style');
  style.id = 'gp-styles';
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
  `;
  document.head?.appendChild(style);
}

// ==========================================
// GAMEPAD POLLING LOOP
// ==========================================

function poll() {
  if (!state.enabled) {
    requestAnimationFrame(poll);
    return;
  }
  
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
  
  if (gp) {
    // Handle buttons
    gp.buttons.forEach((btn, i) => {
      const wasPressed = state.lastButtons[i];
      const isPressed = btn.pressed;
      
      // Edge detection - only on button press
      if (isPressed && !wasPressed) {
        const action = customMap[i] || DEFAULT_MAP[i];
        ACTIONS[action]?.();
      }
      
      state.lastButtons[i] = isPressed;
    });
    
    // Get axes and triggers
    const [lsX, lsY, rsX, rsY] = gp.axes;
    const lt = gp.buttons[6]?.value || 0;
    const rt = gp.buttons[7]?.value || 0;
    
    // Playback speed control
    adjustPlaybackSpeed(lt, rt);
    
    // Left stick - scroll page
    if (Math.abs(lsY) > CONFIG.stickDeadzone) {
      window.scrollBy(0, lsY * CONFIG.scrollSpeed);
    }
    
    // Right stick - cursor control
    if (Math.abs(rsX) > CONFIG.stickDeadzone || Math.abs(rsY) > CONFIG.stickDeadzone) {
      state.mouseX += rsX * CONFIG.cursorSpeed;
      state.mouseY += rsY * CONFIG.cursorSpeed;
      
      // Clamp to screen
      state.mouseX = Math.max(0, Math.min(window.innerWidth, state.mouseX));
      state.mouseY = Math.max(0, Math.min(window.innerHeight, state.mouseY));
      
      updateCursor();
    }
  }
  
  requestAnimationFrame(poll);
}

// ==========================================
// MESSAGE HANDLING
// ==========================================

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === 'toggle') {
    state.enabled = msg.enabled;
    cursor.style.display = msg.enabled ? 'block' : 'none';
    notify(msg.enabled ? '🎮 Enabled' : '🎮 Disabled');
  }
  
  if (msg.action === 'updateMap') {
    customMap = msg.map;
    notify('⚙️ Controls Updated');
  }
  
  if (msg.action === 'resetMap') {
    customMap = {};
    notify('🔄 Reset');
  }
  
  respond({ ok: true });
  return true;
});

// ==========================================
// INITIALIZATION
// ==========================================

chrome.storage.local.get(['enabled', 'customMap'], (data) => {
  state.enabled = data.enabled !== false;
  customMap = data.customMap || {};
  cursor.style.display = state.enabled ? 'block' : 'none';
  console.log('🎮 Gamepad Controller loaded');
  poll();
});

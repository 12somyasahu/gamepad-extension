// Content script that runs on all pages
// Handles gamepad input and controls media elements

let lastButtonStates = {};
let scrollSpeed = 30;
let isEnabled = true;
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let cursorSpeed = 15;
let currentPlaybackSpeed = 1.0; // Track current video speed
const triggerDeadzone = 0.1; // Ignore tiny trigger movements
// Button mapping - can be customized
const buttonMap = {
  0: 'playPause',      // A/Cross
  1: 'fullscreen',     // B/Circle
  2: 'mute',           // X/Square
  3: 'skipForward',    // Y/Triangle
  12: 'volumeUp',      // D-Pad Up
  13: 'volumeDown',    // D-Pad Down
  14: 'rewind',        // D-Pad Left
  15: 'forward',       // D-Pad Right
  4: 'previousVideo',  // LB
  5: 'nextVideo',      // RB
  11: 'mouseClick',    // R3 (Right stick click)
  10: 'rightClick',    // L3 (Left stick click) - bonus right click
};

// Create custom cursor
const cursor = document.createElement('div');
cursor.id = 'gamepad-cursor';
cursor.style.cssText = `
  position: fixed;
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(100,150,255,0.8) 100%);
  border: 3px solid rgba(255,255,255,0.9);
  border-radius: 50%;
  pointer-events: none;
  z-index: 999999;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 20px rgba(100,150,255,0.8), 0 0 40px rgba(100,150,255,0.4);
  display: none;
  transition: transform 0.1s;
`;
document.body.appendChild(cursor);

// Update cursor position
function updateCursor() {
  cursor.style.left = mouseX + 'px';
  cursor.style.top = mouseY + 'px';
  cursor.style.display = 'block';
}

// Simulate mouse click at cursor position
function simulateClick(isRightClick = false) {
  const elementsAtPoint = document.elementsFromPoint(mouseX, mouseY);
  const targetElement = elementsAtPoint[1] || elementsAtPoint[0]; // Skip cursor itself
  
  if (targetElement) {
    // Visual feedback
    cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
    setTimeout(() => {
      cursor.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 150);
    
    // Create and dispatch mouse events
    const eventType = isRightClick ? 'contextmenu' : 'click';
    const mouseEvent = new MouseEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: mouseX,
      clientY: mouseY,
      button: isRightClick ? 2 : 0
    });
    
    targetElement.dispatchEvent(mouseEvent);
    
    // Also try direct click for certain elements
    if (!isRightClick && targetElement.click) {
      targetElement.click();
    }
    
    showNotification(isRightClick ? '🖱️ Right Click' : '🖱️ Click');
  }
}

// Find the active video/audio element on the page
function findMediaElement() {
  // Try to find visible video elements first
  const videos = Array.from(document.querySelectorAll('video'));
  const visibleVideo = videos.find(v => {
    const rect = v.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && v.readyState >= 2;
  });
  
  if (visibleVideo) return visibleVideo;
  
  // Fallback to any video or audio
  return document.querySelector('video, audio');
}

// Execute actions based on button presses
function executeAction(action) {
  const media = findMediaElement();
  
  switch(action) {
    case 'playPause':
      if (media) {
        if (media.paused) {
          media.play();
          showNotification('▶ Playing');
        } else {
          media.pause();
          showNotification('⏸ Paused');
        }
      }
      break;
      
    case 'mute':
      if (media) {
        media.muted = !media.muted;
        showNotification(media.muted ? '🔇 Muted' : '🔊 Unmuted');
      }
      break;
      
    case 'volumeUp':
      if (media) {
        media.volume = Math.min(1, media.volume + 0.1);
        showNotification(`🔊 Volume: ${Math.round(media.volume * 100)}%`);
      }
      break;
      
    case 'volumeDown':
      if (media) {
        media.volume = Math.max(0, media.volume - 0.1);
        showNotification(`🔉 Volume: ${Math.round(media.volume * 100)}%`);
      }
      break;
      
    case 'forward':
      if (media && !isNaN(media.duration)) {
        media.currentTime = Math.min(media.duration, media.currentTime + 10);
        showNotification('⏩ +10s');
      }
      break;
      
    case 'rewind':
      if (media && !isNaN(media.duration)) {
        media.currentTime = Math.max(0, media.currentTime - 10);
        showNotification('⏪ -10s');
      }
      break;
      
    case 'skipForward':
      if (media && !isNaN(media.duration)) {
        media.currentTime = Math.min(media.duration, media.currentTime + 30);
        showNotification('⏭ +30s');
      }
      break;
      
    case 'fullscreen':
      if (media) {
        if (!document.fullscreenElement) {
          if (media.requestFullscreen) {
            media.requestFullscreen();
            showNotification('⛶ Fullscreen');
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
            showNotification('⛶ Exit Fullscreen');
          }
        }
      }
      break;
      
    case 'nextVideo':
      // Try to find and click next button (YouTube, Netflix, etc.)
      const nextButtons = [
        '.ytp-next-button',  // YouTube
        'button[data-uia="next-episode-seamless-button"]',  // Netflix
        '.player-controls__right-control-group button:last-child'  // Twitch
      ];
      
      for (const selector of nextButtons) {
        const btn = document.querySelector(selector);
        if (btn) {
          btn.click();
          showNotification('⏭ Next');
          break;
        }
      }
      break;
      
    case 'previousVideo':
      // Try to find and click previous button
      const prevButtons = [
        '.ytp-prev-button',  // YouTube (not common)
        'button[data-uia="previous-episode-button"]',  // Netflix
      ];
      
      for (const selector of prevButtons) {
        const btn = document.querySelector(selector);
        if (btn) {
          btn.click();
          showNotification('⏮ Previous');
          break;
        }
      }
      break;
      
    case 'mouseClick':
      simulateClick(false);
      break;
      
    case 'rightClick':
      simulateClick(true);
      break;
  }
}

// Show on-screen notification
function showNotification(text) {
  // Remove existing notification
  const existing = document.getElementById('gamepad-notification');
  if (existing) existing.remove();
  
  const notification = document.createElement('div');
  notification.id = 'gamepad-notification';
  notification.textContent = text;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 15px 25px;
    border-radius: 10px;
    font-size: 18px;
    font-weight: bold;
    z-index: 999999;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255, 255, 255, 0.2);
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 1500);
}
// Smoothly adjust video playback speed based on trigger pressure
function adjustPlaybackSpeed(leftTrigger, rightTrigger) {
  const media = findMediaElement();
  if (!media) return; // No video found, do nothing
  
  let targetSpeed = 1.0; // Default normal speed
  
  // Right trigger speeds up (1.0x to 2.0x)
  if (rightTrigger > triggerDeadzone) {
    targetSpeed = 1.0 + (rightTrigger * 1.0); // 0% = 1.0x, 100% = 2.0x
  }
  
  // Left trigger slows down (0.25x to 1.0x)
  // Only if right trigger isn't being used
  if (leftTrigger > triggerDeadzone && rightTrigger <= triggerDeadzone) {
    targetSpeed = 1.0 - (leftTrigger * 0.75); // 0% = 1.0x, 100% = 0.25x
  }
  
  // Only update if speed actually changed significantly
  if (Math.abs(targetSpeed - currentPlaybackSpeed) > 0.05) {
    currentPlaybackSpeed = targetSpeed;
    media.playbackRate = targetSpeed;
    
    // Show notification occasionally (not every frame, too spammy)
    if (Math.random() < 0.05) { // 5% chance = smooth occasional updates
      showNotification(`⚡ Speed: ${targetSpeed.toFixed(2)}x`);
    }
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Poll for gamepad input
function pollGamepad() {
  if (!isEnabled) {
    requestAnimationFrame(pollGamepad);
    return;
  }
  
  const gamepads = navigator.getGamepads();
  const gamepad = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
  
  if (gamepad) {
    // Check buttons
    gamepad.buttons.forEach((button, index) => {
      const wasPressed = lastButtonStates[index];
      const isPressed = button.pressed;
      
      // Button just pressed (edge detection)
      if (isPressed && !wasPressed) {
        const action = buttonMap[index];
        if (action) {
          executeAction(action);
        }
      }
      
      lastButtonStates[index] = isPressed;
    });
    // Read trigger values (most controllers use buttons 6 and 7)
    const leftTrigger = gamepad.buttons[6] ? gamepad.buttons[6].value : 0;
    const rightTrigger = gamepad.buttons[7] ? gamepad.buttons[7].value : 0;
    
    // Adjust playback speed based on triggers
    adjustPlaybackSpeed(leftTrigger, rightTrigger);
    // Handle analog sticks for scrolling
    const leftStickY = gamepad.axes[1]; // Left stick vertical
    const rightStickX = gamepad.axes[2]; // Right stick horizontal
    const rightStickY = gamepad.axes[3]; // Right stick vertical
    
    // Left stick for scrolling
    if (Math.abs(leftStickY) > 0.2) {
      window.scrollBy(0, leftStickY * scrollSpeed);
    }
    
    // Right stick for mouse cursor control
    if (Math.abs(rightStickX) > 0.15 || Math.abs(rightStickY) > 0.15) {
      mouseX += rightStickX * cursorSpeed;
      mouseY += rightStickY * cursorSpeed;
      
      // Keep cursor within screen bounds
      mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
      mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
      
      updateCursor();
    }
  }
  
  requestAnimationFrame(pollGamepad);
}

// Listen for enable/disable messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleEnabled') {
    isEnabled = request.enabled;
    cursor.style.display = isEnabled ? 'block' : 'none';
    showNotification(isEnabled ? '🎮 Gamepad Enabled' : '🎮 Gamepad Disabled');
  }
});

// Start polling
console.log('Gamepad Browser Controller loaded');

pollGamepad();

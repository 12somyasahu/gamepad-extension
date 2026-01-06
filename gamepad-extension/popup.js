let isEnabled = true;
const statusEl = document.getElementById('status');
const statusText = document.getElementById('status-text');
const controllerName = document.getElementById('controller-name');
const toggleBtn = document.getElementById('toggleBtn');

// Check for gamepad connection
function checkGamepad() {
  const gamepads = navigator.getGamepads();
  const gamepad = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
  
  if (gamepad) {
    statusEl.className = 'status connected';
    statusText.textContent = '✅ Gamepad Connected';
    controllerName.textContent = gamepad.id;
  } else {
    statusEl.className = 'status disconnected';
    statusText.textContent = '❌ No Gamepad Detected';
    controllerName.textContent = 'Connect a gamepad and press any button';
  }
}

// Toggle enabled state
toggleBtn.addEventListener('click', async () => {
  isEnabled = !isEnabled;
  
  // Update button
  if (isEnabled) {
    toggleBtn.textContent = 'Disable Gamepad';
    toggleBtn.classList.remove('disabled');
  } else {
    toggleBtn.textContent = 'Enable Gamepad';
    toggleBtn.classList.add('disabled');
  }
  
  // Send message to content script
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, {
    action: 'toggleEnabled',
    enabled: isEnabled
  });
  
  // Save state
  chrome.storage.local.set({ enabled: isEnabled });
});

// Load saved state
chrome.storage.local.get(['enabled'], (result) => {
  if (result.enabled !== undefined) {
    isEnabled = result.enabled;
    if (!isEnabled) {
      toggleBtn.textContent = 'Enable Gamepad';
      toggleBtn.classList.add('disabled');
    }
  }
});

// Check gamepad periodically
setInterval(checkGamepad, 500);
checkGamepad();

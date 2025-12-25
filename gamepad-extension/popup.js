// ==========================================
// POPUP CONTROLLER
// ==========================================

// UI Elements
const ui = {
  status: document.getElementById('status'),
  statusText: document.getElementById('statusText'),
  ctrlName: document.getElementById('ctrlName'),
  btnToggle: document.getElementById('btnToggle'),
  btnCustomize: document.getElementById('btnCustomize'),
  panelCustomize: document.getElementById('panelCustomize'),
  remapList: document.getElementById('remapList'),
  btnSave: document.getElementById('btnSave'),
  btnReset: document.getElementById('btnReset')
};

let enabled = true;
let customMap = {};

// Button names for UI
const BTN_NAMES = {
  0: 'A / Cross', 1: 'B / Circle', 2: 'X / Square', 3: 'Y / Triangle',
  4: 'LB', 5: 'RB', 10: 'L3', 11: 'R3',
  12: 'D-Up', 13: 'D-Down', 14: 'D-Left', 15: 'D-Right'
};

// Available actions
const ACTIONS = {
  playPause: '▶️ Play/Pause',
  goBack: '⬅️ Go Back',
  mute: '🔇 Mute',
  fullscreen: '⛶ Fullscreen',
  volumeUp: '🔊 Vol+',
  volumeDown: '🔉 Vol-',
  rewind: '⏪ -10s',
  forward: '⏩ +10s',
  previousVideo: '⏮️ Previous',
  nextVideo: '⏭️ Next',
  leftClick: '🖱️ Left Click',
  rightClick: '🖱️ Right Click',
  none: '❌ Disabled'
};

// Default mapping
const DEFAULT_MAP = {
  0: 'playPause', 1: 'goBack', 2: 'mute', 3: 'fullscreen',
  4: 'previousVideo', 5: 'nextVideo', 10: 'leftClick', 11: 'rightClick',
  12: 'volumeUp', 13: 'volumeDown', 14: 'rewind', 15: 'forward'
};

// ==========================================
// GAMEPAD DETECTION
// ==========================================

function checkGamepad() {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[0] || gamepads[1] || gamepads[2] || gamepads[3];
  
  if (gp) {
    ui.status.className = 'status on';
    ui.statusText.textContent = '✅ Gamepad Connected';
    ui.ctrlName.textContent = gp.id;
  } else {
    ui.status.className = 'status off';
    ui.statusText.textContent = '❌ No Gamepad';
    ui.ctrlName.textContent = 'Connect controller and press any button';
  }
}

setInterval(checkGamepad, 500);
checkGamepad();

// ==========================================
// TOGGLE ENABLE/DISABLE
// ==========================================

ui.btnToggle.addEventListener('click', async () => {
  enabled = !enabled;
  
  ui.btnToggle.textContent = enabled ? 'Disable' : 'Enable';
  ui.btnToggle.className = enabled ? 'btn-toggle' : 'btn-toggle off';
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'toggle', enabled });
  
  chrome.storage.local.set({ enabled });
});

// ==========================================
// CUSTOMIZE PANEL
// ==========================================

ui.btnCustomize.addEventListener('click', () => {
  const isHidden = !ui.panelCustomize.classList.contains('show');
  ui.panelCustomize.classList.toggle('show', isHidden);
  
  if (isHidden) buildRemapUI();
});

function buildRemapUI() {
  chrome.storage.local.get(['customMap'], (data) => {
    customMap = data.customMap || {};
    ui.remapList.innerHTML = '';
    
    Object.keys(DEFAULT_MAP).forEach(btnIdx => {
      const row = document.createElement('div');
      row.className = 'remap-item';
      
      const label = document.createElement('span');
      label.textContent = BTN_NAMES[btnIdx];
      
      const select = document.createElement('select');
      select.dataset.btn = btnIdx;
      
      Object.entries(ACTIONS).forEach(([val, txt]) => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = txt;
        
        const current = customMap[btnIdx] || DEFAULT_MAP[btnIdx];
        if (current === val) opt.selected = true;
        
        select.appendChild(opt);
      });
      
      row.appendChild(label);
      row.appendChild(select);
      ui.remapList.appendChild(row);
    });
  });
}

// ==========================================
// SAVE CUSTOM MAPPING
// ==========================================

ui.btnSave.addEventListener('click', async () => {
  const selects = ui.remapList.querySelectorAll('select');
  const newMap = {};
  
  selects.forEach(sel => {
    const idx = sel.dataset.btn;
    const val = sel.value;
    
    // Only save if different from default
    if (val !== DEFAULT_MAP[idx]) {
      newMap[idx] = val;
    }
  });
  
  chrome.storage.local.set({ customMap: newMap });
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'updateMap', map: newMap });
  
  alert('✅ Controls saved!');
});

// ==========================================
// RESET TO DEFAULTS
// ==========================================

ui.btnReset.addEventListener('click', async () => {
  if (!confirm('Reset all buttons to defaults?')) return;
  
  chrome.storage.local.set({ customMap: {} });
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: 'resetMap' });
  
  buildRemapUI();
  alert('🔄 Reset complete!');
});

// ==========================================
// LOAD INITIAL STATE
// ==========================================

chrome.storage.local.get(['enabled', 'customMap'], (data) => {
  enabled = data.enabled !== false;
  customMap = data.customMap || {};
  
  ui.btnToggle.textContent = enabled ? 'Disable' : 'Enable';
  ui.btnToggle.className = enabled ? 'btn-toggle' : 'btn-toggle off';
});

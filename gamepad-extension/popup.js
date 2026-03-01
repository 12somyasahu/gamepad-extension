// UI settings 

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

const BUTTON_NAMES = {
  0:  'A / Cross',
  1:  'B / Circle',
  2:  'X / Square',
  3:  'Y / Triangle',
  4:  'LB',
  5:  'RB',
  8:  'Select / Share',
  9:  'Start / Options',
  10: 'L3',
  11: 'R3',
  12: 'D-Pad Up',
  13: 'D-Pad Down',
  14: 'D-Pad Left',
  15: 'D-Pad Right',
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

// ─── Enable / Disable Toggle ──────────────────────────────────────────────────

const enableToggle = document.getElementById('enableToggle');
const toggleLabel = document.getElementById('toggleLabel');
const disabledOverlay = document.getElementById('disabledOverlay');

function applyEnabledState(enabled) {
  enableToggle.checked = enabled;
  toggleLabel.textContent = enabled ? 'ON' : 'OFF';
  toggleLabel.className = 'toggle-label' + (enabled ? ' on' : '');
  disabledOverlay.className = 'disabled-overlay' + (enabled ? '' : ' show');
}

// Load saved state
chrome.storage.sync.get('enabled', (data) => {
  const enabled = data.enabled !== false; // default ON
  applyEnabledState(enabled);
});

enableToggle.addEventListener('change', () => {
  const enabled = enableToggle.checked;
  applyEnabledState(enabled);
  chrome.storage.sync.set({ enabled });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'setEnabled', enabled });
    }
  });
});



document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ─── Controller Detection ─────────────────────────────────────────────────────

function checkController() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const connected = Array.from(gamepads).some(g => g && g.connected);
  document.getElementById('statusDot').className = 'status-dot' + (connected ? ' connected' : '');
  document.getElementById('statusLabel').className = 'status-label' + (connected ? ' connected' : '');
  document.getElementById('statusLabel').textContent = connected ? 'Connected' : 'No controller';
}

checkController();
setInterval(checkController, 1000);

// ─── Build Mapping Rows ───────────────────────────────────────────────────────

let currentMappings = { ...DEFAULT_MAPPINGS };

function buildMappingRows(mappings) {
  const container = document.getElementById('mappingRows');
  container.innerHTML = '';

  Object.entries(BUTTON_NAMES).forEach(([btnIndex, btnName]) => {
    const row = document.createElement('div');
    row.className = 'mapping-row';

    const label = document.createElement('label');
    label.textContent = btnName;

    const select = document.createElement('select');
    select.dataset.btn = btnIndex;

    Object.entries(ACTIONS).forEach(([actionKey, actionLabel]) => {
      const opt = document.createElement('option');
      opt.value = actionKey;
      opt.textContent = actionLabel;
      if (mappings[btnIndex] === actionKey) opt.selected = true;
      select.appendChild(opt);
    });

    row.appendChild(label);
    row.appendChild(select);
    container.appendChild(row);
  });
}

chrome.storage.sync.get('mappings', (data) => {
  if (data.mappings) {
    currentMappings = { ...DEFAULT_MAPPINGS, ...data.mappings };
  }
  buildMappingRows(currentMappings);
});

// ─── Save / Reset ─────────────────────────────────────────────────────────────

document.getElementById('saveBtn').addEventListener('click', () => {
  const selects = document.querySelectorAll('#mappingRows select');
  const newMappings = {};
  selects.forEach(sel => {
    newMappings[sel.dataset.btn] = sel.value;
  });

  chrome.storage.sync.set({ mappings: newMappings }, () => {
    currentMappings = { ...DEFAULT_MAPPINGS, ...newMappings };
    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'updateMappings', mappings: newMappings });
      }
    });
    showToast('Saved!');
  });
});

document.getElementById('resetBtn').addEventListener('click', () => {
  chrome.storage.sync.remove('mappings', () => {
    currentMappings = { ...DEFAULT_MAPPINGS };
    buildMappingRows(currentMappings);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'updateMappings', mappings: {} });
      }
    });
    showToast('Reset to defaults!');
  });
});

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

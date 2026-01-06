let enabled = true;
const btn = document.getElementById("toggleBtn");

btn.onclick = async () => {
  enabled = !enabled;
  btn.textContent = enabled ? "Disable Gamepad" : "Enable Gamepad";
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { action: "toggleEnabled", enabled });
  chrome.storage.local.set({ enabled });
};

chrome.storage.local.get("enabled", r => {
  if (r.enabled === false) {
    enabled = false;
    btn.textContent = "Enable Gamepad";
  }
});

// ===============================lets get this started 
// ===============================

// Cursor state
let cursor;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
let lastX = cursorX;
let lastY = cursorY;

// Create cursor element
function createCursor() {
  cursor = document.createElement("div");
  cursor.id = "gamepad-virtual-cursor";

  Object.assign(cursor.style, {
    position: "fixed",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    background: "white",
    border: "2px solid black",
    zIndex: "999999",
    pointerEvents: "none",
    transform: `translate3d(${cursorX}px, ${cursorY}px, 0)`,
    willChange: "transform"
  });

  document.body.appendChild(cursor);
}

// Move cursor (GPU-only)
function moveCursor(x, y) {
  if (x === lastX && y === lastY) return; // CHANGE DETECTION

  lastX = x;
  lastY = y;

  cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

// Handle incoming messages
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "INIT_CURSOR") {
    if (!cursor) createCursor();
  }

  if (msg.type === "MOVE_CURSOR") {
    cursorX = Math.max(0, Math.min(window.innerWidth, cursorX + msg.dx));
    cursorY = Math.max(0, Math.min(window.innerHeight, cursorY + msg.dy));
    moveCursor(cursorX, cursorY);
  }

  if (msg.type === "CLICK") {
    const el = document.elementFromPoint(cursorX, cursorY);
    if (!el) return;

    el.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true })
    );
    el.dispatchEvent(
      new MouseEvent("mouseup", { bubbles: true })
    );
    el.dispatchEvent(
      new MouseEvent("click", { bubbles: true })
    );
  }

  if (msg.type === "SCROLL") {
    window.scrollBy(0, msg.amount);
  }
});

// ===============================
// content.js just making it as smooth as it can be
// ===============================

let cursor;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;

function createCursor() {
  if (cursor) return;

  cursor = document.createElement("div");
  cursor.id = "gamepad-cursor";

  Object.assign(cursor.style, {
    position: "fixed",
    width: "12px",
    height: "12px",
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

function moveCursor(dx, dy) {
  if (!cursor) createCursor();

  cursorX += dx;
  cursorY += dy;

  cursorX = Math.max(0, Math.min(window.innerWidth, cursorX));
  cursorY = Math.max(0, Math.min(window.innerHeight, cursorY));

  cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
}

function click(type = "left") {
  const el = document.elementFromPoint(cursorX, cursorY);
  if (!el) return;

  const button = type === "right" ? 2 : 0;

  ["mousedown", "mouseup", "click"].forEach(evt =>
    el.dispatchEvent(
      new MouseEvent(evt, {
        bubbles: true,
        cancelable: true,
        view: window,
        button
      })
    )
  );
}

function scroll(amount) {
  window.scrollBy(0, amount);
}

// Media helpers
function togglePlay() {
  document.querySelector("video")?.paused
    ? document.querySelector("video")?.play()
    : document.querySelector("video")?.pause();
}

function seek(seconds) {
  const v = document.querySelector("video");
  if (v) v.currentTime += seconds;
}

function changeSpeed(delta) {
  const v = document.querySelector("video");
  if (!v) return;
  v.playbackRate = Math.min(2, Math.max(0.25, v.playbackRate + delta));
}

function volume(delta) {
  const v = document.querySelector("video");
  if (!v) return;
  v.volume = Math.min(1, Math.max(0, v.volume + delta));
}

function fullscreen() {
  const v = document.querySelector("video");
  if (!v) return;
  document.fullscreenElement ? document.exitFullscreen() : v.requestFullscreen();
}

chrome.runtime.onMessage.addListener((msg) => {
  switch (msg.type) {
    case "CURSOR":
      moveCursor(msg.dx, msg.dy);
      break;

    case "SCROLL":
      scroll(msg.amount);
      break;

    case "LEFT_CLICK":
      click("left");
      break;

    case "RIGHT_CLICK":
      click("right");
      break;

    case "PLAY_PAUSE":
      togglePlay();
      break;

    case "SEEK":
      seek(msg.amount);
      break;

    case "SPEED":
      changeSpeed(msg.amount);
      break;

    case "VOLUME":
      volume(msg.amount);
      break;

    case "FULLSCREEN":
      fullscreen();
      break;

    case "BACK":
      history.back();
      break;
  }
});

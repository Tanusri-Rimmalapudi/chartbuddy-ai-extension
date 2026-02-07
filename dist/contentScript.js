console.log("ChartBuddy Content Script Loaded");

let robot;
let dragging = false;
let offsetX = 0, offsetY = 0;

// Selection state
let overlay = null;
let box = null;
let selecting = false;
let startX = 0, startY = 0;

/* ---------------- ROBOT ---------------- */

initRobot();

function initRobot() {
  robot = document.createElement("div");
  robot.className = "cb-robot";
  robot.innerHTML = `
    <div class="cb-robot-face">
      <div class="cb-robot-eye"></div>
      <div class="cb-robot-eye"></div>
    </div>
  `;
  document.body.appendChild(robot);

  robot.style.left = "24px";
  robot.style.top = "60%";

  robot.addEventListener("mousedown", startDrag);
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("mouseup", stopDrag);

  robot.addEventListener("click", () => {
    if (!dragging && !selecting) {
      startSelection();
    }
  });
}

/* ---------------- DRAG ---------------- */

function startDrag(e) {
  dragging = true;
  offsetX = e.clientX - robot.offsetLeft;
  offsetY = e.clientY - robot.offsetTop;
}

function onDrag(e) {
  if (!dragging) return;
  robot.style.left = e.clientX - offsetX + "px";
  robot.style.top = e.clientY - offsetY + "px";
}

function stopDrag() {
  dragging = false;
}

/* ---------------- SELECTION ---------------- */

function startSelection() {
  selecting = true;
  robot.classList.add("cb-thinking");

  overlay = document.createElement("div");
  overlay.className = "cb-overlay";

  box = document.createElement("div");
  box.className = "cb-selection";

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", onStart);
  overlay.addEventListener("mousemove", onMove);
  overlay.addEventListener("mouseup", onEnd);
}

function onStart(e) {
  if (!box) return;

  startX = e.clientX;
  startY = e.clientY;

  box.style.left = `${startX}px`;
  box.style.top = `${startY}px`;
  box.style.width = "0px";
  box.style.height = "0px";
}

function onMove(e) {
  if (!selecting || !box) return;

  const x = Math.min(e.clientX, startX);
  const y = Math.min(e.clientY, startY);
  const w = Math.abs(e.clientX - startX);
  const h = Math.abs(e.clientY - startY);

  box.style.left = `${x}px`;
  box.style.top = `${y}px`;
  box.style.width = `${w}px`;
  box.style.height = `${h}px`;
}

function onEnd() {
  if (!box) return;

  selecting = false;

  const rect = box.getBoundingClientRect();

  cleanupSelection();

  chrome.runtime.sendMessage({
    type: "CAPTURE_SNIPPET_IMAGE",
    payload: {
      rect: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        dpr: window.devicePixelRatio
      }
    }
  });
}

function cleanupSelection() {
  overlay?.remove();
  overlay = null;
  box = null;
  robot.classList.remove("cb-thinking");
}

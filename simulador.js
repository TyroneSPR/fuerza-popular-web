const ballotViewport = document.getElementById("ballot-viewport");
const ballotStage = document.getElementById("ballot-stage");
const ballotImage = document.getElementById("ballot-image");
const ballotCanvas = document.getElementById("ballot-canvas");
const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");
const clearButton = document.getElementById("clear-drawing");
const finishButton = document.getElementById("finish-simulator");
const toolButtons = document.querySelectorAll("[data-mode]");

if (ballotViewport && ballotStage && ballotImage && ballotCanvas) {
  const context = ballotCanvas.getContext("2d");
  const state = {
    scale: 1,
    minScale: 1,
    maxScale: 3.5,
    x: 0,
    y: 0,
    mode: "draw",
    dragging: false,
    drawing: false,
    lastX: 0,
    lastY: 0,
    viewportWidth: 0,
    viewportHeight: 0,
    stageWidth: 0,
    stageHeight: 0,
    hasDrawing: false,
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function updateToolState() {
    toolButtons.forEach((button) => {
      button.classList.toggle("simulator-tool--active", button.dataset.mode === state.mode);
    });
    ballotViewport.classList.toggle("ballot-viewport--drawing", state.mode === "draw");
  }

  function applyTransform() {
    const scaledWidth = state.stageWidth * state.scale;
    const scaledHeight = state.stageHeight * state.scale;
    const minX = Math.min(0, state.viewportWidth - scaledWidth);
    const minY = Math.min(0, state.viewportHeight - scaledHeight);

    if (scaledWidth <= state.viewportWidth) {
      state.x = (state.viewportWidth - scaledWidth) / 2;
    } else {
      state.x = clamp(state.x, minX, 0);
    }

    if (scaledHeight <= state.viewportHeight) {
      state.y = 0;
    } else {
      state.y = clamp(state.y, minY, 0);
    }

    ballotStage.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
  }

  function resizeStage() {
    const naturalWidth = ballotImage.naturalWidth || ballotImage.width;
    const naturalHeight = ballotImage.naturalHeight || ballotImage.height;
    state.viewportWidth = ballotViewport.clientWidth;

    const fitScale = state.viewportWidth / naturalWidth;
    state.stageWidth = state.viewportWidth;
    state.stageHeight = naturalHeight * fitScale;

    const maxViewportHeight = Math.min(window.innerHeight * 0.62, 520);
    const minViewportHeight = 260;
    state.viewportHeight = Math.max(minViewportHeight, Math.min(state.stageHeight, maxViewportHeight));
    ballotViewport.style.height = `${state.viewportHeight}px`;

    ballotStage.style.width = `${state.stageWidth}px`;
    ballotStage.style.height = `${state.stageHeight}px`;

    ballotCanvas.width = state.stageWidth;
    ballotCanvas.height = state.stageHeight;
    ballotCanvas.style.width = `${state.stageWidth}px`;
    ballotCanvas.style.height = `${state.stageHeight}px`;

    if (state.scale < state.minScale || state.minScale === 1) {
      state.minScale = 1;
      state.scale = 1;
      state.x = 0;
      state.y = 0;
    }

    applyTransform();
  }

  function setZoom(nextScale) {
    const previousScale = state.scale;
    state.scale = clamp(nextScale, state.minScale, state.maxScale);

    const centerX = state.viewportWidth / 2;
    const centerY = state.viewportHeight / 2;

    state.x = centerX - ((centerX - state.x) * state.scale) / previousScale;
    state.y = centerY - ((centerY - state.y) * state.scale) / previousScale;

    applyTransform();
  }

  function getCanvasPoint(event) {
    const rect = ballotCanvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / state.scale,
      y: (event.clientY - rect.top) / state.scale,
    };
  }

  function startDrawing(event) {
    const point = getCanvasPoint(event);
    state.drawing = true;
    state.hasDrawing = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineWidth = 1.2;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111111";
  }

  function draw(event) {
    if (!state.drawing) {
      return;
    }
    state.hasDrawing = true;
    const point = getCanvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing() {
    state.drawing = false;
  }

  ballotViewport.addEventListener("pointerdown", (event) => {
    ballotViewport.setPointerCapture(event.pointerId);
    state.dragging = true;
    state.lastX = event.clientX;
    state.lastY = event.clientY;

    if (state.mode === "draw") {
      startDrawing(event);
    }
  });

  ballotViewport.addEventListener("pointermove", (event) => {
    if (!state.dragging) {
      return;
    }

    if (state.mode === "draw") {
      draw(event);
      return;
    }

    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    state.x += dx;
    state.y += dy;
    applyTransform();
  });

  function releasePointer() {
    state.dragging = false;
    stopDrawing();
  }

  ballotViewport.addEventListener("pointerup", releasePointer);
  ballotViewport.addEventListener("pointercancel", releasePointer);
  ballotViewport.addEventListener("pointerleave", releasePointer);

  ballotCanvas.addEventListener("pointerdown", (event) => {
    if (state.mode !== "draw") {
      return;
    }
    event.preventDefault();
    ballotCanvas.setPointerCapture(event.pointerId);
    startDrawing(event);
  });

  ballotCanvas.addEventListener("pointermove", (event) => {
    if (state.mode !== "draw" || !state.drawing) {
      return;
    }
    event.preventDefault();
    draw(event);
  });

  ballotCanvas.addEventListener("pointerup", stopDrawing);
  ballotCanvas.addEventListener("pointercancel", stopDrawing);

  ballotViewport.addEventListener("wheel", (event) => {
    event.preventDefault();
    setZoom(state.scale + (event.deltaY < 0 ? 0.12 : -0.12));
  });

  zoomInButton?.addEventListener("click", () => setZoom(state.scale + 0.2));
  zoomOutButton?.addEventListener("click", () => setZoom(state.scale - 0.2));
  clearButton?.addEventListener("click", () => {
    context.clearRect(0, 0, ballotCanvas.width, ballotCanvas.height);
    state.hasDrawing = false;
  });

  toolButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      updateToolState();
    });
  });

  finishButton?.addEventListener("click", () => {
    if (state.hasDrawing) {
      localStorage.setItem("simuladorResultado", "painted");
    } else {
      localStorage.setItem("simuladorResultado", "blank");
    }
    window.location.href = "simulador-resultado.html";
  });

  ballotImage.addEventListener("load", resizeStage);
  window.addEventListener("resize", resizeStage);
  if (ballotImage.complete) {
    resizeStage();
  }
  updateToolState();
}

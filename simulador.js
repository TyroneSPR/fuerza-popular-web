const ballotViewport = document.getElementById("ballot-viewport");
const ballotStage = document.getElementById("ballot-stage");
const ballotImage = document.getElementById("ballot-image");
const ballotCanvas = document.getElementById("ballot-canvas");
const zoomInButton = document.getElementById("zoom-in");
const zoomOutButton = document.getElementById("zoom-out");
const clearButton = document.getElementById("clear-drawing");
const finishButton = document.getElementById("finish-simulator");
const toolButtons = document.querySelectorAll("[data-mode]");
const DRAWING_STORAGE_KEY = "simuladorCedulaDibujo";
const DRAW_LINE_WIDTH = 0.9;

if (ballotViewport && ballotStage && ballotImage && ballotCanvas) {
  const context = ballotCanvas.getContext("2d");
  const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);
  const state = {
    scale: 1,
    minScale: 1,
    maxScale: 5,
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
    strokes: [],
    currentStroke: null,
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

  function normalizePoint(point) {
    if (!state.stageWidth || !state.stageHeight) {
      return null;
    }

    return {
      x: point.x / state.stageWidth,
      y: point.y / state.stageHeight,
    };
  }

  function denormalizePoint(point) {
    return {
      x: point.x * state.stageWidth,
      y: point.y * state.stageHeight,
    };
  }

  function persistDrawing() {
    if (!state.strokes.length) {
      sessionStorage.removeItem(DRAWING_STORAGE_KEY);
      return;
    }

    sessionStorage.setItem(DRAWING_STORAGE_KEY, JSON.stringify(state.strokes));
  }

  function configureBrush() {
    context.lineWidth = DRAW_LINE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#111111";
  }

  function redrawDrawing() {
    context.clearRect(0, 0, state.stageWidth, state.stageHeight);
    configureBrush();

    state.strokes.forEach((stroke) => {
      if (!stroke.points || stroke.points.length === 0) {
        return;
      }

      const firstPoint = denormalizePoint(stroke.points[0]);
      context.beginPath();
      context.moveTo(firstPoint.x, firstPoint.y);

      if (stroke.points.length === 1) {
        context.lineTo(firstPoint.x + 0.01, firstPoint.y + 0.01);
      } else {
        stroke.points.slice(1).forEach((point) => {
          const absolutePoint = denormalizePoint(point);
          context.lineTo(absolutePoint.x, absolutePoint.y);
        });
      }

      context.stroke();
    });
  }

  function restoreDrawing() {
    const savedDrawing = sessionStorage.getItem(DRAWING_STORAGE_KEY);

    if (!savedDrawing) {
      return;
    }

    try {
      const parsedDrawing = JSON.parse(savedDrawing);
      if (!Array.isArray(parsedDrawing)) {
        return;
      }

      state.strokes = parsedDrawing
        .filter((stroke) => Array.isArray(stroke?.points) && stroke.points.length > 0)
        .map((stroke) => ({
          points: stroke.points
            .filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y))
            .map((point) => ({
              x: Math.min(Math.max(point.x, 0), 1),
              y: Math.min(Math.max(point.y, 0), 1),
            })),
        }))
        .filter((stroke) => stroke.points.length > 0);

      state.hasDrawing = state.strokes.length > 0;
    } catch (error) {
      sessionStorage.removeItem(DRAWING_STORAGE_KEY);
      state.strokes = [];
      state.hasDrawing = false;
    }
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

    ballotCanvas.width = Math.round(state.stageWidth * pixelRatio);
    ballotCanvas.height = Math.round(state.stageHeight * pixelRatio);
    ballotCanvas.style.width = `${state.stageWidth}px`;
    ballotCanvas.style.height = `${state.stageHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    redrawDrawing();

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
    const normalizedPoint = normalizePoint(point);

    if (!normalizedPoint) {
      return;
    }

    state.drawing = true;
    state.hasDrawing = true;
    state.currentStroke = {
      points: [normalizedPoint],
    };
    state.strokes.push(state.currentStroke);

    configureBrush();
    context.beginPath();
    context.moveTo(point.x, point.y);
    persistDrawing();
  }

  function draw(event) {
    if (!state.drawing) {
      return;
    }

    const point = getCanvasPoint(event);
    const normalizedPoint = normalizePoint(point);

    if (!normalizedPoint || !state.currentStroke) {
      return;
    }

    state.currentStroke.points.push(normalizedPoint);
    context.lineTo(point.x, point.y);
    context.stroke();
    persistDrawing();
  }

  function stopDrawing() {
    state.drawing = false;
    state.currentStroke = null;
  }

  ballotViewport.addEventListener("pointerdown", (event) => {
    if (state.mode === "draw") {
      return;
    }

    ballotViewport.setPointerCapture(event.pointerId);
    state.dragging = true;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
  });

  ballotViewport.addEventListener("pointermove", (event) => {
    if (!state.dragging) {
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
    event.stopPropagation();
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
    context.clearRect(0, 0, state.stageWidth, state.stageHeight);
    state.strokes = [];
    state.currentStroke = null;
    state.hasDrawing = false;
    sessionStorage.removeItem(DRAWING_STORAGE_KEY);
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
    sessionStorage.removeItem(DRAWING_STORAGE_KEY);
    window.location.href = "simulador-resultado.html";
  });

  restoreDrawing();
  ballotImage.addEventListener("load", resizeStage);
  window.addEventListener("resize", resizeStage);
  if (ballotImage.complete) {
    resizeStage();
  }
  updateToolState();
}

const ACCESS_EMAIL_KEY = "k3AccessEmail";
const ACCESS_LOG_KEY = "k3AccessLog";
const APP_CONFIG = window.APP_CONFIG || {};
const SHEETS_URL = APP_CONFIG.sheetsUrl || "";
const ACCESS_LOGO = APP_CONFIG.accessLogo || "assets/logo-fuerza-popular.png";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function getStoredEmail() {
  return sessionStorage.getItem(ACCESS_EMAIL_KEY);
}

function setStoredEmail(email) {
  sessionStorage.setItem(ACCESS_EMAIL_KEY, email);
}

function appendAccessLog(entry) {
  const current = JSON.parse(localStorage.getItem(ACCESS_LOG_KEY) || "[]");
  const exists = current.some((item) => item.email === entry.email);

  if (exists) {
    return;
  }

  current.push(entry);
  localStorage.setItem(ACCESS_LOG_KEY, JSON.stringify(current));
}

function updateAccessLabels() {
  const storedEmail = getStoredEmail();
  const emailNodes = document.querySelectorAll("[data-access-email]");
  const statusNodes = document.querySelectorAll("[data-sheet-status]");
  const emailText = storedEmail || "No se ha registrado un correo todavia.";
  const statusText = SHEETS_URL
    ? "Google Sheets configurado para recibir registros."
    : "Modo prueba local activo.";

  emailNodes.forEach((node) => {
    node.textContent = emailText;
  });

  statusNodes.forEach((node) => {
    node.textContent = statusText;
  });
}

function ensureFavicon() {
  let favicon = document.querySelector('link[rel="icon"]');

  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }

  favicon.href = ACCESS_LOGO;
}

function buildAccessGate() {
  const overlay = document.createElement("section");
  overlay.className = "access-gate";
  const accessDescription =
    typeof APP_CONFIG.accessDescription === "string"
      ? APP_CONFIG.accessDescription
      : "Antes de entrar al flujo, registra un correo para la prueba.";
  overlay.innerHTML = `
    <div class="access-gate__panel">
      <div class="access-gate__brand">
        <img class="access-gate__logo" src="${ACCESS_LOGO}" alt="Logo del partido" />
      </div>
      <p class="access-gate__eyebrow">Acceso previo</p>
      <h1 class="access-gate__title">${APP_CONFIG.accessTitle || "Ingresa tu correo para continuar"}</h1>
      ${accessDescription ? `<p class="access-gate__text">${accessDescription}</p>` : ""}
      <form class="access-gate__form" id="access-gate-form">
        <label class="access-gate__label" for="access-email">Correo electronico</label>
        <input
          class="access-gate__input"
          id="access-email"
          name="email"
          type="email"
          inputmode="email"
          autocomplete="email"
          placeholder="nombre@correo.com"
          required
        />
        <p class="access-gate__error" id="access-gate-error"></p>
        <button class="simulator-card__button access-gate__button" type="submit" id="access-submit-button">
          <span class="access-gate__button-label">Ingresar</span>
          <span class="access-gate__spinner" aria-hidden="true"></span>
        </button>
      </form>
      <p class="access-gate__success" id="access-gate-success"></p>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

async function sendToGoogleSheets(payload) {
  if (!SHEETS_URL) {
    return { ok: false, mode: "local", status: "local-only" };
  }

  const response = await fetch(SHEETS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  return response.json();
}

function closeGate(overlay) {
  overlay.hidden = true;
  document.body.style.overflow = "";
}

function attachChangeEmailAction() {
  const changeButton = document.getElementById("change-access-email");
  if (!changeButton) {
    return;
  }

  changeButton.addEventListener("click", () => {
    sessionStorage.removeItem(ACCESS_EMAIL_KEY);
    window.location.reload();
  });
}

async function initAccessGate() {
  updateAccessLabels();
  attachChangeEmailAction();

  if (getStoredEmail()) {
    return;
  }

  const overlay = buildAccessGate();
  const form = document.getElementById("access-gate-form");
  const emailInput = document.getElementById("access-email");
  const errorNode = document.getElementById("access-gate-error");
  const successNode = document.getElementById("access-gate-success");
  const submitButton = document.getElementById("access-submit-button");
  const submitLabel = submitButton?.querySelector(".access-gate__button-label");

  document.body.style.overflow = "hidden";
  emailInput.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim().toLowerCase();

    errorNode.textContent = "";
    successNode.textContent = "";

    if (!isValidEmail(email)) {
      errorNode.textContent = "Ingresa un correo valido para continuar.";
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("access-gate__button--loading");
    }
    if (submitLabel) {
      submitLabel.textContent = "Cargando...";
    }
    emailInput.disabled = true;

    const payload = {
      email,
      page: window.location.pathname.split("/").pop() || "index.html",
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };

    setStoredEmail(email);
    appendAccessLog(payload);
    updateAccessLabels();

    try {
      const result = await sendToGoogleSheets(payload);
      if (result.status === "exists") {
        successNode.textContent = "Ese correo ya estaba registrado. Acceso concedido.";
      } else if (result.status === "created") {
        successNode.textContent = "Correo registrado y enviado a Google Sheets.";
      } else {
        successNode.textContent = "Correo registrado en modo prueba local.";
      }
    } catch (error) {
      successNode.textContent = "Correo guardado localmente. La conexion con Google Sheets fallo en esta prueba.";
    }

    setTimeout(() => closeGate(overlay), 450);
  });
}

ensureFavicon();
updateAccessLabels();
attachChangeEmailAction();
initAccessGate();

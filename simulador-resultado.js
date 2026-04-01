const resultTitle = document.getElementById("simulador-resultado-titulo");
const resultText = document.getElementById("simulador-resultado-texto");
const resultButton = document.getElementById("simulador-resultado-boton");
const storedResult = localStorage.getItem("simuladorResultado");

if (storedResult === "painted") {
  resultTitle.textContent = "Felicidades, ya aprendiste cómo votar por Fuerza Popular, el K-3.";
  resultText.textContent = "Marcaste la cédula y completaste la práctica correctamente.";
  resultButton.textContent = "Volver al inicio";
  resultButton.href = "index.html";
} else if (storedResult === "blank") {
  resultTitle.textContent = "Tu voto quedó en blanco.";
  resultText.textContent =
    "No marcaste ninguna opción en la cédula. Eso se considera voto en blanco y deja una sensación triste, porque se pierde la oportunidad de apoyar a Fuerza Popular, el K-3.";
  resultButton.textContent = "Reintentar";
  resultButton.href = "simulador-cedula.html";
} else {
  resultTitle.textContent = "Resultado de tu práctica";
  resultText.textContent = "No se encontró una práctica reciente. Puedes volver a intentarlo desde el simulador.";
  resultButton.textContent = "Ir al inicio";
  resultButton.href = "index.html";
}

localStorage.removeItem("simuladorResultado");

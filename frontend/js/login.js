import "./layout.js";

// O destino é uma chave conhecida, nunca uma URL recebida do navegador.
const destinations = new Map([
    ["conversar", "/conversar"],
    ["identidade", "/identidade"],
]);
const next = new URLSearchParams(location.search).get("next");
document.querySelector(".login-submit").href = destinations.get(next) ?? "/inicio";

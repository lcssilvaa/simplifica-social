import "./layout.js";
import { clearHistory, defaultPreferences, getPreferences, savePreferences } from "./storage.js";
import { applyPreferences, canReadAloud, readAloud, stopReading } from "./accessibility.js";

const form = document.querySelector("#accessibility-form");
const status = document.querySelector("#settings-status");
const speechAvailable = canReadAloud();
let preferences = getPreferences();

function syncControls() {
    for (const [key, value] of Object.entries(preferences)) {
        const control = form.elements.namedItem(key);
        if (typeof value === "boolean") control.checked = value;
        else control.value = value;
    }
}
function updatePreferences() {
    const saved = savePreferences(preferences);
    applyPreferences(preferences);
    status.textContent = saved ? "Preferências atualizadas neste navegador."
        : "Preferências aplicadas nesta página. O navegador não permitiu salvá-las.";
}
syncControls();
form.addEventListener("submit", event => event.preventDefault());
form.addEventListener("change", event => {
    const { name, type, checked, value } = event.target;
    if (!Object.hasOwn(defaultPreferences, name)) return;
    preferences[name] = type === "checkbox" ? checked : value;
    updatePreferences();
});
document.querySelector("#reset-preferences").addEventListener("click", () => {
    preferences = { ...defaultPreferences };
    syncControls();
    updatePreferences();
});
document.querySelector("#test-voice").addEventListener("click", () => {
    const started = readAloud("Olá! Eu sou o Assistente Simplifica. Você pode ouvir as orientações e acompanhar a leitura no seu ritmo.", { preview: true });
    status.textContent = started ? "Teste de voz iniciado. Use Parar leitura para interromper."
        : "O navegador não conseguiu iniciar a voz. Você pode continuar lendo os textos.";
});
document.querySelector("#stop-voice").addEventListener("click", () => {
    stopReading();
    status.textContent = "Leitura interrompida.";
});
if (!speechAvailable) {
    document.querySelector("#read-aloud").disabled = true;
    document.querySelector("#test-voice").disabled = true;
    document.querySelector("#stop-voice").disabled = true;
    document.querySelector("#voice-support").textContent = "Este navegador não oferece leitura em voz alta. Você pode continuar usando os textos da página.";
}
window.addEventListener("storage", () => { preferences = getPreferences(); syncControls(); });

document.querySelector("#clear-history").addEventListener("click", () => {
    document.querySelector("#history-settings-status").textContent = clearHistory()
        ? "Referências locais apagadas. As sessões no servidor não foram alteradas."
        : "O navegador não permitiu alterar o armazenamento desta aba.";
});

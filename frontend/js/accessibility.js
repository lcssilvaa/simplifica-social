import { getPreferences } from "./storage.js";

export function applyPreferences(preferences = getPreferences()) {
    const root = document.documentElement;
    root.dataset.fontSize = preferences.fontSize;
    root.dataset.lineSpacing = preferences.lineSpacing;
    root.classList.toggle("high-contrast", preferences.highContrast);
    root.classList.toggle("reduce-motion", preferences.reduceMotion);
    root.classList.toggle("underlined-links", preferences.underlineLinks);
    if (!preferences.readAloud) stopReading();
}

export const canReadAloud = () => "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

export function stopReading() {
    try {
        if (canReadAloud()) window.speechSynthesis.cancel();
    } catch { /* Falhas de áudio não devem impedir o uso da página. */ }
}

export function readAloud(text, { preview = false } = {}) {
    if (!canReadAloud() || (!preview && !getPreferences().readAloud)) return false;
    try {
        stopReading();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "pt-BR";
        utterance.rate = .9;
        const voice = window.speechSynthesis.getVoices().find(item => item.lang.replace("_", "-").toLowerCase() === "pt-br");
        if (voice) utterance.voice = voice;
        window.speechSynthesis.speak(utterance);
        return true;
    } catch {
        return false;
    }
}

window.addEventListener("pagehide", stopReading);
window.addEventListener("storage", event => {
    if (event.key === "simplifica.preferences.v1" || event.key === null) applyPreferences();
});

// Somente referências de sessões nesta aba. Mensagens e perfis ficam no backend.
const HISTORY_KEY = "simplifica.history.v1";
const CURRENT_KEY = "simplifica.current.v1";
const PREFERENCES_KEY = "simplifica.preferences.v1";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function read(key, fallback) {
    try {
        return JSON.parse(sessionStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function write(key, value) {
    try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function getHistory() {
    const items = read(HISTORY_KEY, []);
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && uuidPattern.test(item.id)
        && typeof item.title === "string" && Number.isFinite(Date.parse(item.createdAt)));
}

export function rememberSession(session, title = "Nova conversa") {
    const items = getHistory();
    if (!items.some(item => item.id === session.session_id)) {
        items.unshift({
            id: session.session_id,
            title: title.slice(0, 80),
            createdAt: session.created_at,
        });
    }
    return write(HISTORY_KEY, items.slice(0, 50));
}

export function renameSession(id, title) {
    const items = getHistory();
    const item = items.find(entry => entry.id === id);
    if (item) item.title = title.slice(0, 80);
    return write(HISTORY_KEY, items);
}

export function getCurrentSession() {
    const id = read(CURRENT_KEY, null);
    return typeof id === "string" && uuidPattern.test(id) ? id : null;
}

export const setCurrentSession = id => write(CURRENT_KEY, id);

export function clearHistory() {
    return write(HISTORY_KEY, []) && write(CURRENT_KEY, null);
}

export const defaultPreferences = Object.freeze({
    fontSize: "normal", lineSpacing: "normal", highContrast: false,
    readAloud: false, reduceMotion: false, underlineLinks: false,
});

function normalizePreferences(preferences) {
    return {
        fontSize: ["normal", "large", "huge"].includes(preferences?.fontSize)
            ? preferences.fontSize : preferences?.largeText === true ? "large" : "normal",
        lineSpacing: ["compact", "normal", "wide"].includes(preferences?.lineSpacing)
            ? preferences.lineSpacing : "normal",
        highContrast: preferences?.highContrast === true,
        readAloud: preferences?.readAloud === true,
        reduceMotion: preferences?.reduceMotion === true,
        underlineLinks: preferences?.underlineLinks === true,
    };
}

export function getPreferences() {
    // Preferências duram entre visitas. O histórico continua só na aba.
    try {
        const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY));
        if (saved !== null) return normalizePreferences(saved);
    } catch { /* Alternativa para armazenamento bloqueado. */ }
    return normalizePreferences(read(PREFERENCES_KEY, {}));
}

export function savePreferences(preferences) {
    const normalized = normalizePreferences(preferences);
    try {
        localStorage.setItem(PREFERENCES_KEY, JSON.stringify(normalized));
        return true;
    } catch {
        return write(PREFERENCES_KEY, normalized);
    }
}

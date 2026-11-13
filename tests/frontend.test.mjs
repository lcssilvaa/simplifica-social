// Sem dependências extras: node --test tests/frontend.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { identityQuestions } from "../frontend/js/config.js";
import { buildProfileMessage, parseAnswer } from "../frontend/js/questionnaire.js";
import { clearHistory, defaultPreferences, getHistory, getPreferences, rememberSession, savePreferences, setCurrentSession, getCurrentSession } from "../frontend/js/storage.js";
import { ApiError, createSession, sendMessage } from "../frontend/js/api.js";

const moneyQuestion = identityQuestions.find(question => question.type === "money");
const peopleQuestion = identityQuestions.find(question => question.key === "quantidade_pessoas_familia");
const booleanQuestion = identityQuestions.find(question => question.type === "boolean");

test("renda brasileira: aceita zero e centavos, rejeita negativos e formatos ambíguos", () => {
    assert.equal(parseAnswer(moneyQuestion, "0"), 0);
    assert.equal(parseAnswer(moneyQuestion, "1.500,50"), 1500.5);
    assert.equal(parseAnswer(moneyQuestion, "R$ 600,01"), 600.01);
    for (const invalid of ["", "-1", "NaN", "Infinity", "1e3", "1.23", "12,345", "1.000.00"]) {
        assert.throws(() => parseAnswer(moneyQuestion, invalid), undefined, invalid);
    }
});

test("tamanho da família e respostas desconhecidas preservam seu significado", () => {
    for (const invalid of ["0", "-1", "1.5", "101", "0x10"]) {
        assert.throws(() => parseAnswer(peopleQuestion, invalid));
    }
    assert.equal(parseAnswer(peopleQuestion, "1"), 1);
    assert.equal(parseAnswer(booleanQuestion, "false"), false);
    assert.equal(parseAnswer(booleanQuestion, "unknown"), null);
    assert.throws(() => parseAnswer(booleanQuestion, ""));
    const message = buildProfileMessage({ idade: 30, quantidade_pessoas_familia: 3,
        renda_familiar: 600.01, cadunico: false, possui_deficiencia: null });
    assert.match(message, /Renda familiar de R\$ 600,01/);
    assert.match(message, /Não tenho Cadastro Único/);
    assert.doesNotMatch(message, /deficiência/);
});

test("histórico mantém referências sem persistir mensagens ou perfil", () => {
    const data = new Map();
    globalThis.sessionStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const id = "11111111-1111-4111-8111-111111111111";
    const session = { session_id: id, created_at: "2026-01-01T00:00:00Z",
        messages: [{ content: "conteúdo privado" }], citizen_profile: { idade: 30 } };
    assert.equal(rememberSession(session, "Conversa de teste"), true);
    rememberSession(session, "Duplicata");
    assert.equal(getHistory().length, 1);
    assert.deepEqual(Object.keys(getHistory()[0]).sort(), ["createdAt", "id", "title"]);
    setCurrentSession(id);
    assert.equal(getCurrentSession(), id);
    assert.equal(clearHistory(), true);
    assert.deepEqual(getHistory(), []);
    assert.equal(getCurrentSession(), null);
    data.set("simplifica.history.v1", "JSON inválido");
    assert.deepEqual(getHistory(), []);
    globalThis.sessionStorage = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
    assert.equal(rememberSession(session), false);
    assert.deepEqual(getHistory(), []);
    assert.deepEqual(getPreferences(), defaultPreferences);
});

test("preferências persistem entre visitas sem persistir o histórico", () => {
    const local = new Map();
    globalThis.localStorage = { getItem: key => local.get(key) ?? null, setItem: (key, value) => local.set(key, value) };
    globalThis.sessionStorage = { getItem: () => null, setItem() {} };
    const preferences = { fontSize: "huge", lineSpacing: "wide", highContrast: true,
        readAloud: true, reduceMotion: true, underlineLinks: true };
    assert.equal(savePreferences(preferences), true);
    assert.deepEqual(getPreferences(), preferences);
    assert.deepEqual([...local.keys()], ["simplifica.preferences.v1"]);
    clearHistory();
    assert.deepEqual(getPreferences(), preferences);
    savePreferences(defaultPreferences);
    assert.deepEqual(getPreferences(), defaultPreferences);
    delete globalThis.localStorage;
});

test("preferências inválidas e antigas mantêm opções seguras de leitura", () => {
    globalThis.localStorage = { getItem: () => '{"fontSize":"invalid","lineSpacing":99,"highContrast":"true"}' };
    assert.deepEqual(getPreferences(), defaultPreferences);
    globalThis.localStorage = { getItem: () => "null" };
    globalThis.sessionStorage = { getItem: () => '{"largeText":true}' };
    assert.equal(getPreferences().fontSize, "large");
    globalThis.localStorage = { getItem: () => "JSON inválido" };
    globalThis.sessionStorage = { getItem: () => "null" };
    assert.deepEqual(getPreferences(), defaultPreferences);
    delete globalThis.localStorage;
});

test("armazenamento bloqueado usa alternativa da aba e informa falha total", () => {
    const session = new Map();
    globalThis.localStorage = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
    globalThis.sessionStorage = { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value) };
    assert.equal(savePreferences({ ...defaultPreferences, fontSize: "large" }), true);
    assert.equal(getPreferences().fontSize, "large");
    globalThis.sessionStorage = { getItem() { throw new Error("bloqueado"); }, setItem() { throw new Error("bloqueado"); } };
    assert.equal(savePreferences(defaultPreferences), false);
    assert.deepEqual(getPreferences(), defaultPreferences);
    delete globalThis.localStorage;
});

test("falhas e ausência de síntese de voz não interrompem a aplicação", async () => {
    const originalWindow = globalThis.window;
    const originalUtterance = globalThis.SpeechSynthesisUtterance;
    try {
        globalThis.window = { addEventListener() {} };
        const { canReadAloud, readAloud, stopReading } = await import("../frontend/js/accessibility.js");
        assert.equal(canReadAloud(), false);
        assert.equal(readAloud("Teste", { preview: true }), false);
        assert.doesNotThrow(stopReading);
        globalThis.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
        window.SpeechSynthesisUtterance = globalThis.SpeechSynthesisUtterance;
        window.speechSynthesis = { cancel() { throw new Error("áudio indisponível"); },
            getVoices: () => [], speak() { throw new Error("áudio indisponível"); } };
        assert.equal(readAloud("Teste", { preview: true }), false);
        assert.doesNotThrow(stopReading);
        let spoken;
        window.speechSynthesis = { cancel() {}, getVoices: () => [], speak(utterance) { spoken = utterance; } };
        assert.equal(readAloud("Teste", { preview: true }), true);
        assert.equal(spoken.lang, "pt-BR");
        assert.equal(spoken.text, "Teste");
        assert.equal(readAloud("Não ler sem ativar"), false);
    } finally {
        if (originalWindow === undefined) delete globalThis.window;
        else globalThis.window = originalWindow;
        if (originalUtterance === undefined) delete globalThis.SpeechSynthesisUtterance;
        else globalThis.SpeechSynthesisUtterance = originalUtterance;
    }
});

test("cliente usa os contratos da API e conserva status de sessão expirada", async () => {
    const originalFetch = globalThis.fetch;
    const calls = [];
    try {
        globalThis.fetch = async (url, options) => {
            calls.push({ url, body: JSON.parse(options.body) });
            return { ok: true, json: async () => ({ session_id: "teste" }) };
        };
        await createSession();
        await sendMessage("teste", "Olá");
        assert.deepEqual(calls, [
            { url: "/api/sessions", body: { channel: "WEB" } },
            { url: "/api/chat", body: { session_id: "teste", channel: "WEB", message: "Olá" } },
        ]);
        globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ detail: "Sessão expirada" }) });
        await assert.rejects(createSession, error => error instanceof ApiError && error.status === 404);
        globalThis.fetch = async () => { throw new TypeError("offline"); };
        await assert.rejects(createSession, /Não foi possível conectar/);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

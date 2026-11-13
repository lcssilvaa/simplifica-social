import "./layout.js";
import { createSession, getSession, sendMessage } from "./api.js";
import { getCurrentSession, rememberSession, renameSession, setCurrentSession } from "./storage.js";
import { element, renderBenefits, renderProfile } from "./ui.js";
import { readAloud, stopReading } from "./accessibility.js";

// Mantém o menu compartilhado e adapta apenas os controles do chatbot.
const assetBase = "/frontend/img/chat-figma/";
const helpImage = element("img");
helpImage.src = `${assetBase}help.svg`;
helpImage.alt = "";
helpImage.width = 48;
helpImage.height = 48;
document.querySelector(".header-help").replaceChildren(helpImage);

const toolsDialog = document.querySelector("#chat-tools");
const toolsButton = element("button", "chat-options-toggle");
toolsButton.type = "button";
toolsButton.title = "Opções da conversa e análises";
toolsButton.setAttribute("aria-label", "Opções da conversa e análises");
toolsButton.setAttribute("aria-haspopup", "dialog");
toolsButton.setAttribute("aria-controls", "chat-tools");
toolsButton.setAttribute("aria-expanded", "false");
const chevron = element("img");
chevron.src = `${assetBase}chevron.svg`;
chevron.alt = "";
toolsButton.append(chevron);
document.querySelector(".topbar").prepend(toolsButton);
toolsButton.addEventListener("click", () => {
    toolsDialog.returnValue = "";
    toolsDialog.showModal();
    toolsButton.setAttribute("aria-expanded", "true");
});
toolsDialog.addEventListener("close", () => {
    toolsButton.setAttribute("aria-expanded", "false");
    if (toolsDialog.returnValue === "composer") input.focus();
    else toolsButton.focus();
});

const messages = document.querySelector("#messages");
const welcome = document.querySelector("#welcome").cloneNode(true);
const form = document.querySelector("#chatForm");
const input = document.querySelector("#messageInput");
const sendButton = document.querySelector("#send");
const newButton = document.querySelector("#new-chat");
const status = document.querySelector("#session-status");
const errorMessage = document.querySelector("#chat-error");
const profile = document.querySelector("#profile");
const benefits = document.querySelector("#benefits");
const mic = document.querySelector("#mic");
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;
let sessionId = null;
let busy = false;
let hasMessages = false;

function setBusy(value) {
    busy = value;
    sendButton.disabled = value;
    newButton.disabled = value;
    input.disabled = value;
    mic.disabled = value || !recognition;
    if (value) recognition?.abort();
    messages.setAttribute("aria-busy", String(value));
    document.querySelectorAll(".suggestion").forEach(button => { button.disabled = value; });
}

function showError(message = "") {
    errorMessage.hidden = !message;
    errorMessage.textContent = message;
}

function addMessage(content, role) {
    const row = element("div", `message ${role}`);
    const avatar = element("div", `message-avatar ${role === "user" ? "user-avatar" : "assistant-avatar"}`);
    avatar.setAttribute("aria-hidden", "true");
    if (role === "user") {
        avatar.textContent = "SS";
    } else {
        const symbol = element("span", "assistant-symbol");
        const image = element("img");
        image.src = `${assetBase}assistant.png`;
        image.alt = "";
        image.width = 76;
        image.height = 76;
        symbol.append(image);
        avatar.append(symbol);
    }
    const bubble = element("div", "message-bubble");
    bubble.append(element("span", "message-label", role === "user" ? "Você" : "Assistente Simplifica"));
    const text = element("span", "message-text", content);
    bubble.append(text);
    row.append(avatar, bubble);
    messages.append(row);
    messages.scrollTop = messages.scrollHeight;
    return { bubble: row, text };
}

function resetConversation() {
    stopReading();
    recognition?.abort();
    sessionId = null;
    hasMessages = false;
    setCurrentSession(null);
    // O ID não fica na URL: evita reabrir a conversa antiga após uma nova conversa.
    history.replaceState(null, "", location.pathname);
    messages.replaceChildren(welcome.cloneNode(true));
    renderProfile(profile, {});
    renderBenefits(benefits, []);
    status.textContent = "Pronto para uma nova conversa";
    showError();
    input.value = "";
    if (toolsDialog.open) toolsDialog.close("composer");
    input.focus();
}

async function submitMessage(raw) {
    const message = raw.trim();
    if (!message || busy) return;
    if (message.length > 2000) {
        showError("Sua mensagem deve ter no máximo 2.000 caracteres.");
        return;
    }
    setBusy(true);
    if (toolsDialog.open) toolsDialog.close("composer");
    showError();
    let userBubble;
    let pending;
    try {
        if (!sessionId) {
            status.textContent = "Iniciando conversa…";
            const session = await createSession();
            sessionId = session.session_id;
            rememberSession(session, message);
            setCurrentSession(sessionId);
            history.replaceState(null, "", location.pathname);
        }
        userBubble = addMessage(message, "user").bubble;
        input.value = "";
        pending = addMessage("Analisando sua mensagem…", "assistant");
        status.textContent = "Aguardando resposta do assistente…";
        const data = await sendMessage(sessionId, message);
        pending.text.textContent = data.message;
        readAloud(data.message);
        if (!hasMessages) renameSession(sessionId, message);
        hasMessages = true;
        renderProfile(profile, data.profile);
        renderBenefits(benefits, data.analyses);
        status.textContent = "Conversa em andamento";
    } catch (error) {
        userBubble?.remove();
        pending?.bubble.remove();
        input.value = message;
        showError(error.status === 404
            ? "Esta sessão expirou ou não está mais disponível. Sua mensagem foi mantida; envie novamente para iniciar outra conversa."
            : error.message);
        if (error.status === 404) {
            sessionId = null;
            hasMessages = false;
            setCurrentSession(null);
        }
        status.textContent = "Não foi possível enviar a mensagem";
    } finally {
        setBusy(false);
        messages.scrollTop = messages.scrollHeight;
        input.focus();
    }
}

async function restoreConversation(id) {
    setBusy(true);
    status.textContent = "Carregando conversa…";
    try {
        const session = await getSession(id);
        sessionId = session.session_id;
        setCurrentSession(sessionId);
        rememberSession(session, session.messages.find(item => item.role === "user")?.content);
        hasMessages = session.messages.length > 0;
        if (hasMessages) messages.replaceChildren(welcome.cloneNode(true));
        session.messages.forEach(message => addMessage(message.content, message.role));
        renderProfile(profile, session.citizen_profile);
        renderBenefits(benefits, []);
        benefits.querySelector(".muted").textContent = "Envie uma mensagem para atualizar a análise desta conversa.";
        status.textContent = "Conversa retomada";
    } catch (error) {
        // Uma consulta pode falhar por expiração ou estar desativada no backend.
        // O próximo envio cria uma sessão nova e não mistura contextos.
        sessionId = null;
        setCurrentSession(null);
        showError(error.status === 404
            ? "Conversa indisponível: a sessão pode ter expirado ou a consulta está desativada. Você pode iniciar uma nova conversa."
            : error.message);
        status.textContent = "Pronto para uma nova conversa";
    } finally {
        setBusy(false);
    }
}

form.addEventListener("submit", event => {
    event.preventDefault();
    submitMessage(input.value);
});
input.addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        form.requestSubmit();
    }
});
document.querySelector(".suggestions").addEventListener("click", event => {
    const button = event.target.closest(".suggestion");
    if (button) submitMessage(button.textContent);
});
newButton.addEventListener("click", resetConversation);
document.querySelector("#stop-reading").addEventListener("click", stopReading);

if (SpeechRecognition) {
    try {
        recognition = new SpeechRecognition();
        recognition.lang = "pt-BR";
        recognition.interimResults = false;
        recognition.continuous = false;
        recognition.addEventListener("result", event => {
            const transcript = event.results[0]?.[0]?.transcript || "";
            input.value = `${input.value}${input.value ? " " : ""}${transcript}`.slice(0, input.maxLength);
            input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        recognition.addEventListener("error", event => {
            if (event.error !== "aborted") showError("Não foi possível usar o microfone. Confira a permissão do navegador ou digite sua mensagem.");
        });
        recognition.addEventListener("end", () => {
            listening = false;
            mic.setAttribute("aria-pressed", "false");
            mic.setAttribute("aria-label", "Ditar mensagem");
        });
    } catch { recognition = null; }
}
mic.disabled = !recognition;
if (!recognition) mic.title = "Ditado não disponível neste navegador. Digite sua mensagem.";
mic.addEventListener("click", () => {
    if (!recognition || busy) return;
    if (listening) { recognition.stop(); return; }
    try {
        showError();
        recognition.start();
        listening = true;
        mic.setAttribute("aria-pressed", "true");
        mic.setAttribute("aria-label", "Parar ditado");
    } catch { showError("Não foi possível iniciar o microfone. Você pode digitar a mensagem."); }
});
window.addEventListener("pagehide", () => recognition?.abort());

const requestedId = new URLSearchParams(location.search).get("sessao");
const previousId = requestedId || getCurrentSession();
if (previousId) restoreConversation(previousId);

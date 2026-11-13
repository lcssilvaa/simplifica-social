import "./layout.js";
import { identityQuestions } from "./config.js";
import { createSession, sendMessage } from "./api.js";
import { rememberSession, setCurrentSession } from "./storage.js";
import { buildProfileMessage, parseAnswer } from "./questionnaire.js";
import { renderBenefits, renderProfile } from "./ui.js";
import { readAloud } from "./accessibility.js";

const form = document.querySelector("#areaPerguntas");
const final = document.querySelector("#finalizacao");
const answer = document.querySelector("#resposta");
const booleanAnswer = document.querySelector("#respostaBooleana");
const message = document.querySelector("#mensagem");
const back = document.querySelector("#btnVoltar");
const next = document.querySelector("#btnContinuar");
const voice = document.querySelector("#btnVoz");
const progress = document.querySelector("#progresso");
const drafts = {};
const answers = {};
let index = 0;
let busy = false;
let session = null;
let recognition = null;
let listening = false;

function currentInput() {
    return identityQuestions[index].type === "boolean" ? booleanAnswer : answer;
}

function showQuestion(focus = true) {
    const question = identityQuestions[index];
    document.querySelector("#numeroPergunta").textContent = `Pergunta ${index + 1} de ${identityQuestions.length}`;
    document.querySelector("#textoPergunta").textContent = question.label;
    document.querySelector("#descricaoPergunta").textContent = question.hint;
    progress.max = identityQuestions.length;
    progress.value = index + 1;
    document.querySelector("#campoTexto").hidden = question.type === "boolean";
    document.querySelector("#campoBooleano").hidden = question.type !== "boolean";
    answer.inputMode = question.type === "money" ? "decimal" : "numeric";
    answer.placeholder = question.placeholder || "";
    answer.value = "";
    booleanAnswer.value = "";
    currentInput().value = drafts[question.key] ?? "";
    message.textContent = "";
    currentInput().removeAttribute("aria-invalid");
    currentInput().setAttribute("aria-labelledby", "textoPergunta");
    back.disabled = index === 0;
    next.textContent = index === identityQuestions.length - 1 ? "Ver orientação" : "Continuar";
    if (focus) document.querySelector("#textoPergunta").focus();
}

function setBusy(value) {
    busy = value;
    next.disabled = value;
    back.disabled = value || index === 0;
    answer.disabled = value;
    booleanAnswer.disabled = value;
    voice.disabled = value || !recognition;
    next.textContent = value ? "Analisando…" : "Ver orientação";
}

async function showResults() {
    recognition?.abort();
    setBusy(true);
    message.textContent = "Enviando suas respostas para análise…";
    try {
        if (!session) session = await createSession();
        const data = await sendMessage(session.session_id, buildProfileMessage(answers));
        const saved = rememberSession(session, "Questionário de identidade");
        setCurrentSession(session.session_id);
        document.querySelector("#resumoResultado").textContent = data.message;
        renderProfile(document.querySelector("#perfilResultado"), data.profile);
        renderBenefits(document.querySelector("#beneficiosResultado"), data.analyses);
        document.querySelector("#continuarConversa").href = `/conversar?sessao=${encodeURIComponent(session.session_id)}`;
        form.hidden = true;
        final.hidden = false;
        document.querySelector("#resultado-title").focus();
        readAloud(data.message);
        if (!saved) {
            document.querySelector("#resumoResultado").append(document.createTextNode("\nO navegador não permitiu guardar esta conversa no histórico."));
        }
    } catch (error) {
        if (error.status === 404) session = null;
        message.textContent = `${error.message} Suas respostas foram mantidas. Tente novamente.`;
    } finally {
        setBusy(false);
    }
}

form.addEventListener("submit", event => {
    event.preventDefault();
    if (busy) return;
    const question = identityQuestions[index];
    const input = currentInput();
    drafts[question.key] = input.value;
    try {
        // Valida o valor atual antes de armazenar; aceita renda zero e resposta Não.
        answers[question.key] = parseAnswer(question, input.value);
        input.removeAttribute("aria-invalid");
        recognition?.abort();
        if (index < identityQuestions.length - 1) {
            index++;
            showQuestion();
        } else showResults();
    } catch (error) {
        input.setAttribute("aria-invalid", "true");
        message.textContent = error.message;
        input.focus();
    }
});

back.addEventListener("click", () => {
    if (busy || index === 0) return;
    recognition?.abort();
    drafts[identityQuestions[index].key] = currentInput().value;
    index--;
    showQuestion();
});

document.querySelector("#btnRecomecar").addEventListener("click", () => {
    Object.keys(drafts).forEach(key => delete drafts[key]);
    Object.keys(answers).forEach(key => delete answers[key]);
    index = 0;
    session = null;
    final.hidden = true;
    form.hidden = false;
    showQuestion();
});

// Reconhecimento opcional: sempre há uma alternativa por teclado.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    voice.setAttribute("aria-pressed", "false");
    recognition.onstart = () => {
        listening = true;
        voice.setAttribute("aria-pressed", "true");
        voice.textContent = "Parar de ouvir";
        message.textContent = "Pode falar sua resposta.";
    };
    recognition.onresult = event => {
        if (busy) return;
        const transcript = event.results[0][0].transcript.trim().replace(/[.!?]$/, "");
        if (identityQuestions[index].type === "boolean") {
            const normalized = transcript.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            booleanAnswer.value = /^(sim|tenho|possuo)$/.test(normalized) ? "true"
                : /^(nao|nao tenho)$/.test(normalized) ? "false" : "";
        } else answer.value = transcript;
        message.textContent = "Confira sua resposta antes de continuar.";
    };
    recognition.onerror = () => {
        message.textContent = "Não foi possível reconhecer a fala. Digite ou selecione sua resposta.";
    };
    recognition.onend = () => {
        listening = false;
        voice.setAttribute("aria-pressed", "false");
        voice.textContent = "Responder falando";
    };
    voice.addEventListener("click", () => {
        try {
            if (listening) recognition.stop();
            else recognition.start();
        } catch {
            message.textContent = "O microfone já está ativo. Aguarde ou digite sua resposta.";
        }
    });
} else {
    voice.disabled = true;
    voice.title = "Reconhecimento de voz indisponível neste navegador. Use o campo de resposta.";
}
showQuestion(false);

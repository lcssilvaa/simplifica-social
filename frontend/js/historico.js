import "./layout.js";
import { getHistory } from "./storage.js";
import { element } from "./ui.js";

const list = document.querySelector("#listaConversas");
const search = document.querySelector("#pesquisar");
const empty = document.querySelector("#semResultados");
const status = document.querySelector("#history-status");
const conversations = getHistory();
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function renderConversations() {
    const term = search.value.trim().toLocaleLowerCase("pt-BR");
    const filtered = conversations.filter(item => item.title.toLocaleLowerCase("pt-BR").includes(term));
    list.replaceChildren();
    empty.hidden = filtered.length > 0;
    status.textContent = `${filtered.length} conversa(s) encontrada(s).`;
    document.querySelector("#empty-title").textContent = term ? "Nenhuma conversa encontrada" : "Seu histórico começa aqui";
    document.querySelector("#empty-description").textContent = term
        ? "Experimente pesquisar por outro título." : "Inicie uma conversa para encontrá-la nesta página.";
    filtered.forEach(conversation => {
        const card = element("article", "conversa-card");
        const icon = element("span", "feature-icon", "↺");
        icon.setAttribute("aria-hidden", "true");
        const information = element("div", "informacoes");
        const date = element("time", "", dateFormatter.format(new Date(conversation.createdAt)));
        date.dateTime = conversation.createdAt;
        information.append(element("h3", "", conversation.title), date);
        const link = element("a", "button secondary", "Retomar conversa");
        link.href = `/conversar?sessao=${encodeURIComponent(conversation.id)}`;
        link.setAttribute("aria-label", `Retomar conversa: ${conversation.title}`);
        card.append(icon, information, link);
        list.append(card);
    });
}

search.addEventListener("input", renderConversations);
renderConversations();

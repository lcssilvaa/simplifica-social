import { profileLabels, statusLabels } from "./config.js";

export function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
}

export const formatMoney = value => new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL",
}).format(value);

export function renderProfile(container, profile) {
    container.replaceChildren();
    Object.entries(profileLabels).forEach(([key, label]) => {
        const value = profile[key];
        if (value === null || value === undefined) return;
        const row = element("div", "profile-field");
        let formatted = String(value);
        if (typeof value === "boolean") formatted = value ? "Sim" : "Não";
        if (key.startsWith("renda_")) formatted = formatMoney(value);
        row.append(element("dt", "", label), element("dd", "", formatted));
        container.append(row);
    });
    if (!container.childElementCount) {
        container.append(element("div", "muted", "As informações identificadas aparecem aqui."));
    }
}

export function renderBenefits(container, analyses) {
    container.replaceChildren();
    if (!analyses.length) {
        container.append(element("p", "muted", "Ainda não há benefícios analisados."));
    }
    analyses.forEach(analysis => {
        const card = element("article", "benefit-card");
        card.append(element("h3", "", analysis.beneficio));
        if (analysis.ficticio) card.append(element("span", "demo-badge", "Exemplo fictício"));
        const status = element("p", "benefit-status", statusLabels[analysis.status] || analysis.status);
        status.dataset.status = analysis.status;
        card.append(status);
        const details = document.createElement("details");
        details.append(element("summary", "", "Ver critérios e próximos passos"));
        const groups = [
            ["Critérios atendidos", analysis.criterios_atendidos],
            ["Critérios não atendidos", analysis.criterios_nao_atendidos],
            ["Informações pendentes", analysis.criterios_pendentes],
            ["Próximos passos", analysis.proximos_passos],
            ["Orientações adicionais", analysis.condicionalidades],
        ];
        groups.forEach(([label, entries]) => {
            if (!entries?.length) return;
            details.append(element("h4", "", label));
            const list = document.createElement("ul");
            entries.forEach(entry => list.append(element("li", "", entry)));
            details.append(list);
        });
        if (analysis.fonte_oficial) {
            try {
                const source = new URL(analysis.fonte_oficial);
                if (source.protocol === "https:" || source.protocol === "http:") {
                    const link = element("a", "text-link", "Consultar fonte oficial");
                    link.href = source.href;
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                    details.append(link);
                }
            } catch { /* Uma fonte inválida não deve impedir a leitura dos resultados. */ }
        }
        card.append(details);
        container.append(card);
    });
}

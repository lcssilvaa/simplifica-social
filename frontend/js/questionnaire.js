// Validação de preenchimento. A elegibilidade é decidida somente pelo backend.
export function parseAnswer(question, raw) {
    const value = String(raw).trim();
    if (!value) throw new Error("Por favor, responda à pergunta.");
    if (question.type === "boolean") {
        if (value === "unknown") return null;
        if (value === "true") return true;
        if (value === "false") return false;
        throw new Error("Selecione Sim, Não ou Não sei.");
    }
    if (question.type === "integer") {
        const number = Number(value);
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(number)
            || number < question.min || number > question.max) {
            throw new Error(`Informe um número inteiro entre ${question.min} e ${question.max}.`);
        }
        return number;
    }
    if (question.type === "money") {
        const amount = value.replace(/^R\$\s*/i, "").trim();
        if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(amount)) {
            throw new Error("Informe uma renda válida, como 1500 ou 1.500,50. Use 0 se não houver renda.");
        }
        const number = Number(amount.replaceAll(".", "").replace(",", "."));
        if (!Number.isFinite(number) || number > Number.MAX_SAFE_INTEGER / 100) {
            throw new Error("O valor informado é muito alto. Confira sua resposta.");
        }
        return number;
    }
    throw new Error("Tipo de pergunta não configurado.");
}

// Frases explícitas compreendidas pelo mock e pelo provedor Ollama.
// Não envia respostas desconhecidas como se fossem negativas.
export function buildProfileMessage(answers) {
    const money = new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(answers.renda_familiar);
    const sentences = [
        `Tenho ${answers.idade} anos`,
        `Somos ${answers.quantidade_pessoas_familia} pessoas`,
        `Renda familiar de R$ ${money}`,
    ];
    if (answers.cadunico !== null) sentences.push(answers.cadunico ? "Tenho Cadastro Único" : "Não tenho Cadastro Único");
    if (answers.possui_deficiencia !== null) sentences.push(answers.possui_deficiencia ? "Tenho deficiência" : "Não tenho deficiência");
    return `${sentences.join(". ")}.`;
}

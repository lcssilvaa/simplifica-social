// Identidade visual e conteúdo compartilhado. Não coloque regras de benefícios aqui.
export const site = {
    name: "Simplifica Social",
    tagline: "Informação que transforma",
    images: {
        logo: "/frontend/img/logo.png",
        login: "/frontend/img/login-figma/photo.png",
        loginLogo: "/frontend/img/login-figma/logo.png",
        loginGoogle: "/frontend/img/login-figma/google.png",
        eyeOpen: "/frontend/img/olho.png",
        eyeClosed: "/frontend/img/olho-riscado.png",
        google: "/frontend/img/google.png",
    },
};

export const navigation = [
    { id: "home", title: "Início", href: "/inicio", icon: "casa_azul.png" },
    { id: "chat", title: "Conversar", href: "/conversar", icon: "Estrela Azul Contornada.png" },
    { id: "history", title: "Histórico", href: "/historico", icon: "livro_aberto_azul.png" },
    { id: "identity", title: "Identidade", href: "/identidade", icon: "icone_usuario_azul.png" },
    { id: "settings", title: "Configurações", href: "/configuracoes", icon: "engrenagem_azul.png" },
    { id: "help", title: "Central de ajuda", href: "/ajuda", icon: "icone_ajuda_azul.png" },
];

export const pageTitles = {
    home: "Bem-vindo ao Simplifica Social",
    chat: "Assistente IA",
    history: "Seu histórico",
    identity: "Identidade",
    settings: "Configurações",
    help: "Central de ajuda",
};

// Perguntas limitadas aos campos que a API já consegue interpretar.
// Textos, exemplos e limites de preenchimento podem ser editados nesta lista.
export const identityQuestions = [
    { key: "idade", label: "Quantos anos você tem?", hint: "Informe sua idade em anos completos.", placeholder: "Ex.: 67", type: "integer", min: 0, max: 130 },
    { key: "quantidade_pessoas_familia", label: "Quantas pessoas fazem parte da sua família?", hint: "Inclua você na quantidade de pessoas.", placeholder: "Ex.: 4", type: "integer", min: 1, max: 100 },
    { key: "renda_familiar", label: "Qual é a renda mensal total da sua família?", hint: "Some a renda de todas as pessoas da família. Se não houver renda, informe 0.", placeholder: "Ex.: 1.500,00", type: "money" },
    { key: "cadunico", label: "Sua família está inscrita no Cadastro Único?", hint: "Você também pode informar que não sabe.", type: "boolean" },
    { key: "possui_deficiencia", label: "Você possui alguma deficiência?", hint: "Você também pode informar que não sabe ou prefere não responder.", type: "boolean" },
];

export const profileLabels = {
    idade: "Idade",
    quantidade_pessoas_familia: "Pessoas na família",
    renda_familiar: "Renda familiar",
    renda_individual: "Renda individual",
    renda_per_capita: "Renda por pessoa",
    cadunico: "Cadastro Único",
    possui_deficiencia: "Pessoa com deficiência",
    situacao_profissional: "Situação profissional",
    possui_filhos: "Tem filhos",
    quantidade_filhos: "Quantidade de filhos",
    cidade: "Cidade",
    estado: "Estado",
};

export const statusLabels = {
    COMPATIVEL: "Compatível com os critérios cadastrados",
    POSSIVEL: "Possível compatibilidade",
    INCOMPATIVEL: "Não atende aos critérios cadastrados",
    INFORMACOES_INSUFICIENTES: "Informações insuficientes",
};

// A central de ajuda usa estes textos; não depende de um serviço externo.
export const helpTopics = [
    {
        title: "Dúvidas frequentes", icon: "?", color: "green",
        description: "Entenda as orientações e os resultados da análise.",
        paragraphs: [
            "O Simplifica Social oferece uma orientação preliminar sobre os benefícios do catálogo. O resultado não confirma aprovação ou direito a um benefício.",
            "Os benefícios fictícios aparecem identificados como exemplos. A confirmação de informações e as decisões sobre benefícios reais cabem aos órgãos responsáveis.",
        ],
    },
    {
        title: "Como usar o Simplifica", icon: "▶", color: "blue",
        description: "Conheça o assistente e o questionário passo a passo.",
        paragraphs: [
            "Abra Conversar e descreva uma situação. Você também pode começar pelo questionário de Identidade. Use dados fictícios nesta demonstração.",
            "O assistente pode pedir informações complementares. O perfil e os benefícios analisados aparecem junto da conversa. Em Histórico, você pode pesquisar e retomar as conversas disponíveis nesta aba.",
        ],
    },
    {
        title: "Acesso e dados", icon: "⚙", color: "pink",
        description: "Saiba como funciona o acesso de demonstração.",
        paragraphs: [
            "Esta versão ainda não possui contas, senhas ou entrada com o Google. Use Entrar na tela de acesso para explorar a demonstração sem criar uma conta.",
            "As mensagens ficam temporariamente na memória do servidor. O navegador guarda somente os identificadores e títulos das conversas nesta aba. As conversas podem expirar ou se perder quando o servidor reinicia.",
            "Em Configurações, você pode apagar as referências locais ao histórico. Isso não apaga as sessões que ainda estão na memória do servidor.",
        ],
    },
    {
        title: "Precisa de mais ajuda?", icon: "↗", color: "purple",
        description: "Veja os limites do protótipo e como relatar um problema.",
        paragraphs: [
            "Este é um projeto acadêmico. Ainda não há um canal de suporte conectado ao site.",
            "Se encontrar um problema, informe à equipe do projeto a página, o que tentou fazer e a mensagem exibida, sem enviar dados pessoais.",
        ],
    },
];

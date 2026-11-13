# Interface do Simplifica Social

As páginas desta pasta são a interface principal da aplicação. HTML, CSS e JavaScript são servidos pelo próprio FastAPI, na mesma origem da API. Não há instalação de Node, etapa de build ou cópia de arquivos para executar o site.

## Executar

Na raiz do projeto:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

Abra <http://localhost:8000>. Não abra os HTMLs com duplo clique ou por um servidor separado: os módulos JavaScript, as rotas e a API dependem do FastAPI. Depois de editar um HTML, CSS ou JS, atualize o navegador. Se ele continuar mostrando a versão antiga, use `Ctrl+F5`.

O provedor da conversa continua sendo escolhido por `LLM_PROVIDER` na configuração do backend. Para testar sem Ollama, use `LLM_PROVIDER=mock` no `.env`. O mock interpreta frases explícitas; as sugestões da conversa e o resumo do questionário usam esses padrões.

## Onde editar

| Alteração | Arquivo |
| --- | --- |
| Textos, títulos e campos de uma página | O próprio `.html` da página |
| Cores, fonte, botões, cartões e espaçamento compartilhado | `css/base.css`, começando por `:root` |
| Estilo específico de uma tela | `css/login.css`, `chatbot.css`, `identidade.css`, `historico.css`, `configuracoes.css` ou `ajuda.css` |
| Nome, slogan, imagens compartilhadas e foto do acesso | `js/config.js`, objeto `site` |
| Itens do menu, títulos do cabeçalho e ícones | `js/config.js`, listas `navigation` e `pageTitles` |
| Perguntas, exemplos e limites de preenchimento | `js/config.js`, lista `identityQuestions` |
| Cartões e respostas da central de ajuda | `js/config.js`, lista `helpTopics` |
| Textos dos campos do perfil e dos status | `js/config.js`, objetos `profileLabels` e `statusLabels` |
| Regras, critérios e fontes dos benefícios | `app/data/benefits.json`, conforme o guia na raiz |

Exemplo: para trocar a foto do acesso, coloque o arquivo em `frontend/img/` e altere `site.images.login` em `js/config.js` para `/frontend/img/nova-foto.jpg`. O atributo `data-image="login"` indica qual imagem configurada será aplicada. O `src` no HTML funciona como alternativa inicial e pode ser atualizado também. Para trocar o texto alternativo da imagem, edite o `alt` no HTML. O login usa os assets originais do frame Figma `11:4`, em `img/login-figma/`: fotografia, máscara SVG, logo (`loginLogo`) e ícone Google (`loginGoogle`). Os arquivos compartilhados pelas demais telas foram preservados.

## Páginas e rotas

| Endereço | HTML | Comportamento |
| --- | --- | --- |
| `/` ou `/login` | `login.html` | Apresenta o acesso de demonstração |
| `/inicio` | `index.html` | Apresenta os atalhos principais |
| `/conversar` | `chatbot.html` | Cria sessões e envia mensagens à API |
| `/historico` | `historico.html` | Pesquisa títulos e retoma sessões desta aba |
| `/identidade` | `identidade.html` | Questionário e análise pela API |
| `/configuracoes` | `configuracoes.html` | Fonte, entrelinhas, contraste, voz, movimentos, links e referências locais |
| `/ajuda` | `ajuda.html` | Assuntos de ajuda com janela acessível |
| `/chat-teste` | `app/static/index.html` | Preserva a interface anterior de desenvolvimento |

O mapa das páginas fica em `app/api/routes/pages.py`. Os recursos são servidos em `/frontend/css/`, `/frontend/js/` e `/frontend/img/`. Os arquivos antigos em `/static/` continuam disponíveis para o chat de desenvolvimento.

## Organização do JavaScript

Os scripts são módulos nativos, carregados com `type="module"`:

- `layout.js`: monta menu e cabeçalho uma única vez por página, aplica imagens e preferência de leitura, controla o menu móvel.
- `config.js`: conteúdo compartilhado e configuração visual; não contém regras de elegibilidade.
- `api.js`: concentra as chamadas HTTP e o tratamento de erros. O restante da interface não chama `fetch` diretamente.
- `storage.js`: guarda referências de conversas em `sessionStorage` e preferências de acessibilidade em `localStorage`, com validação e alternativa para armazenamento bloqueado.
- `accessibility.js`: aplica as preferências em todas as telas, acompanha alterações em outra aba e controla a leitura em português pelo navegador.
- `ui.js`: desenha perfil e análises que vêm do servidor, usando elementos de texto para não interpretar conteúdo da conversa como HTML.
- `questionnaire.js`: valida números e respostas do formulário e os transforma em uma mensagem compreendida pela API.
- `chatbot.js`, `identidade.js`, `historico.js`, `ajuda.js` e `configuracoes.js`: comportamento de cada tela.

O chatbot em `/conversar` usa o frame Figma `25:88`, consultado pelo MCP, e assets originais em `img/chat-figma/`. Seus estilos ficam restritos à página por `chat-screen`. O menu lateral usa os mesmos componentes, logo, ícones, links e estilos das demais páginas, montados por `layout.js` e definidos em `base.css`. `chatbot.js` adapta apenas os controles do cabeçalho e da conversa.

No cabeçalho do chatbot, a seta **Opções da conversa e análises** abre os controles de **Nova conversa**, **Parar leitura**, exemplos, perfil e benefícios identificados pela API. A conversa continua usando as mesmas rotas de sessões, envio e histórico. O microfone preenche o campo para revisão antes de enviar; depende de suporte a ditado e da permissão do navegador. Os nomes e iniciais do visitante continuam sendo **Você / SS**, pois o protótipo não possui autenticação; a conversa preenchida mostrada no Figma não é inserida como se fosse uma sessão real.

O chatbot ocupa toda a largura e a altura da janela, com a mesma largura de menu e o mesmo padrão de cabeçalho de Configurações. A área de mensagens cresce com o espaço disponível e tem rolagem própria; o campo de resposta acompanha a largura da área principal. Fontes e ícones respeitam as preferências de leitura. Até 900 px, usa o menu móvel compartilhado e reorganiza os balões. O Figma consultado não contém um frame móvel dessa tela.

O menu e o cabeçalho são compartilhados pelos atributos `data-sidebar`, `data-header` e `data-page`. Para acrescentar uma página, crie o HTML com essa estrutura, cadastre sua rota em `pages.py` e adicione sua entrada em `navigation`/`pageTitles`. Não copie o menu manualmente para cada HTML.

## Questionário e regras de benefícios

O questionário usa cinco campos já suportados pelo backend: idade, pessoas na família, renda familiar, Cadastro Único e deficiência. Renda zero, resposta negativa e resposta desconhecida são valores diferentes. Valores monetários seguem o formato brasileiro, como `1500` ou `1.500,50`.

Ao concluir, a interface cria uma sessão e envia um resumo para `/api/chat`. A API interpreta o perfil, calcula renda por pessoa e avalia o catálogo. O resultado pode pedir informações complementares, que podem ser respondidas pelo botão **Continuar com o assistente**.

As regras locais do protótipo anterior foram substituídas por essa análise centralizada. Programas e perguntas que dependem de campos ainda não modelados devem ser acrescentados ao backend antes de entrar no questionário. Para uma pergunta de novo tipo ou uma nova chave, atualize também `questionnaire.js`, o perfil/extrator do backend e os testes. Alterar somente o texto de uma pergunta existente não exige isso.

## Limites atuais

- O botão **Entrar** do login abre `/inicio`, preservando o acesso de demonstração sem autenticar nem criar uma conta. E-mail, senha e Google continuam desabilitados. Os links **Esqueceu sua senha?** e **Criar uma** abrem a ajuda existente, pois recuperação e cadastro ainda não possuem integração. A descrição acessível e os títulos dos controles informam esses limites. O link de acessibilidade fica disponível ao navegar por Tab, antes do formulário.
- A conversa está integrada à API existente. Não há envio de anexos, integração com WhatsApp ou persistência em banco nesta entrega.
- A aba guarda até 50 referências de conversas (`id`, título de até 80 caracteres e data) e a sessão atual. As preferências de acessibilidade ficam no navegador entre visitas. Mensagens completas e perfil não são gravados no armazenamento do navegador. Os títulos podem conter um trecho da primeira mensagem; use dados fictícios.
- O histórico vale para a aba atual, não é sincronizado com uma conta e depende de `ENABLE_SESSION_INSPECTION=true`. Sessões expiram pelo TTL do servidor e são perdidas ao reiniciar a aplicação.
- Retomar uma sessão recupera suas mensagens e seu perfil. Os cartões de benefícios são atualizados após o próximo envio, pois a consulta de sessão não retorna as análises.
- Limpar o histórico em Configurações remove somente as referências locais; não exclui sessões do servidor.
- O microfone depende do navegador e da permissão do usuário; o formulário sempre permite preencher por teclado.
- A leitura em voz alta depende da síntese de voz do navegador e das vozes instaladas. Com a opção ativa, somente novas respostas do chat e o resultado do questionário são lidos. O histórico não inicia áudio automaticamente.

## Visual e acessibilidade

As seis imagens em `prototipo/` orientam o layout: menu com item ativo verde, títulos azuis, conversa em balões, questionário escuro com botão azul-claro, histórico pesquisável e cartões de ajuda. O login foi implementado a partir dos metadados, estilos e assets obtidos diretamente do Figma MCP para o frame `11:4`. Em 1920 × 1080, preserva as coordenadas do cartão, dos campos, dos botões e da fotografia. O arquivo Figma consultado contém apenas frames desktop; até 1100 px, os mesmos elementos se reorganizam em uma coluna e a fotografia fica oculta. O perfil de Configurações identifica o visitante da demonstração; alterações de conta dependem de autenticação futura.

A Fredoka variável fica em `fonts/Fredoka-Variable.ttf`, com licença em `fonts/OFL.txt`; não depende de uma chamada a um serviço de fontes. Os títulos usam peso 600 e `#00419E`, o nome do assistente usa peso 500 e `#019541`, e o texto principal usa peso 400 e preto. O nome verde do assistente recebe tamanho de texto grande para favorecer o contraste; botões usam verde mais escuro para leitura do texto branco.

O CSS específico do login conserva as cores do protótipo, incluindo o botão verde `#02983C`, o contorno Google `#FF0400` e bordas `#D9D9D9`. Os campos usam a Inter local em `fonts/Inter-Variable.ttf`, com licença em `fonts/Inter-OFL.txt`. As preferências de fonte, entrelinhas amplas e alto contraste continuam disponíveis.

Em `/configuracoes`, os tamanhos Normal, Grande e Enorme equivalem a 18, 22 e 26 px na configuração padrão do navegador, respeitando o tamanho padrão definido pelo usuário. As entrelinhas são 1,45, 1,65 e 2. As opções também permitem alto contraste, leitura de respostas, redução de movimentos e links sublinhados, com amostra de leitura e botão para restaurar o padrão. A preferência de movimentos reduzidos do sistema é sempre respeitada.

Botões principais têm pelo menos 48 px de altura. O menu móvel abre até 900 px, contém o foco, fecha por Escape e devolve o foco ao botão de abertura. Os formulários mantêm rótulos, mensagens de estado e foco visível. Os layouts permitem quebra de texto e se reorganizam quando a fonte aumenta. As verificações de navegador cobrem larguras de 320, 390, 768, 1024 e 1440 px, incluindo fonte Enorme, entrelinhas amplas e alto contraste; isso não substitui testes de uso com pessoas mais velhas e leitores de tela.

## Verificação

Na raiz do projeto:

```powershell
.\.venv\Scripts\python.exe -m pytest
node --test --test-isolation=none tests/frontend.test.mjs
```

Node é necessário somente para os testes de JavaScript; o comando acima foi verificado com Node 24. O site funciona sem Node. Os testes verificam as páginas e recursos servidos, contratos HTTP, valores monetários, limites dos campos, respostas desconhecidas e referências de histórico. Para conferir visualmente, navegue pelas telas em uma janela larga e no modo móvel do navegador.

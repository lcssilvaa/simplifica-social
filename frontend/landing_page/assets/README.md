# Recursos da landing page

- `familia.jpg`: fotografia que a landing original já usava, salva localmente a partir de [Unsplash](https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=1920&q=80).
- `logo.png`: marca horizontal recebida com a landing.
- `apoio-familiar.jpg`: [Phillip Flores / Unsplash](https://unsplash.com/photos/woman-pushing-stroller-with-child-in-park-bmqA1-785_M), sob a licença Unsplash, usada no exemplo de apoio familiar.
- `inclusao.jpg`: [Centre for Ageing Better / Unsplash](https://unsplash.com/photos/a-man-riding-a-wheelchair-Lh6myXOOurI), disponibilizada em domínio público e sob a licença Unsplash, usada no exemplo de inclusão.
- `../../img/login-figma/photo.png`: fotografia já existente no projeto, usada no exemplo de acolhimento sênior.
- `../../img/favicon.png`: símbolo enviado pelo usuário, sem fundo, aplicado às páginas principais. A imagem foi editada com a ferramenta integrada **imagegen** a partir de `../../img/chat-figma/assistant.png`, preservando a marca; a versão de uso tem 128 × 128 px e canal alfa.

O favicon não substitui a logo do login ou os ícones dos componentes existentes.

## Prompt usado no imagegen

```text
Use case: background-extraction. Asset type: transparent website favicon and brand symbol. Edit target: the supplied original Simplifica Social symbol (blue and green people, yellow circle and supporting yellow hand). Remove only the white/off-white background and make it genuine alpha transparency, including all white gaps separating the colored shapes. Preserve the exact original outlines, shape arrangement, relative proportions, colors and gradients. Do not redesign, add outlines, shadows, text, lettering, circular containers or any background. Crop away excess transparent outer whitespace and center the complete unchanged symbol in a square canvas with a small safe transparent margin so it is legible as a browser tab icon. Deliver a high-quality transparent PNG suitable for the project favicon.
```

## Dados dos benefícios

Os nomes, as descrições, as fotos e o link oficial são conteúdo estático de `../index.html`, sem carregamento pela API. A apresentação usa o Bolsa Família e os três exemplos fictícios existentes no projeto, com essa identificação preservada. Para alterar os benefícios apresentados na landing, edite o HTML. As fotos são ilustrativas; não identificam participantes dos programas.

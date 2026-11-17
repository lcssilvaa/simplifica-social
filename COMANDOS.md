# Principais comandos

Execute os comandos na **raiz do projeto**. Os exemplos abaixo usam **Windows / PowerShell** e Python 3.12 ou superior. Não é necessário ativar o ambiente virtual.

## Preparar o ambiente (primeira vez)

```powershell
python --version
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

O `.env.example` seleciona o Ollama. Para executar sem modelo local, altere no `.env`:

```dotenv
LLM_PROVIDER=mock
```

## Run: executar no próprio computador

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --no-access-log
```

- Site (landing page): <http://localhost:8000>
- Login (acesso de demonstração): <http://localhost:8000/login>
- Assistente integrado: <http://localhost:8000/conversar>
- Guia para editar textos, imagens e páginas: [frontend/README.md](frontend/README.md)
- Swagger (interface para testar a API): <http://localhost:8000/docs>
- Saúde da API: <http://localhost:8000/health>
- Catálogo de benefícios: <http://localhost:8000/api/benefits>

Use **Ctrl+C** no terminal para parar. O `--reload` reinicia a aplicação ao alterar o código. As sessões ficam em memória e são perdidas a cada reinício; mantenha apenas um worker.

## Run: acessar por outro dispositivo na mesma rede

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --no-access-log
```

Em outro terminal, descubra o IP do computador que está executando a API:

```powershell
ipconfig
```

Procure o **Endereço IPv4** do adaptador Wi-Fi ou Ethernet conectado à rede. Por exemplo, se ele for `192.168.1.10`, abra no celular ou em outro computador da mesma rede:

```text
http://192.168.1.10:8000
```

Substitua o IP do exemplo pelo IP do seu computador. `0.0.0.0` é o endereço de escuta do servidor; no navegador do outro dispositivo, use o IP encontrado.

Se não conectar, confira se os dispositivos estão na mesma rede, se ela permite comunicação entre dispositivos e se o Firewall do Windows permite o Python na rede privada e a porta TCP 8000.

## Executar em outra porta

Pare a execução anterior e use, por exemplo, a porta `8001`:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 --no-access-log
```

Nesse caso, use `:8001` também na URL de acesso.

## Usar Ollama

Com o aplicativo Ollama instalado, baixe o modelo e confira os modelos disponíveis:

```powershell
ollama pull qwen3:4b
ollama list
```

Se o servidor Ollama ainda não estiver em execução, inicie-o em outro terminal:

```powershell
ollama serve
```

Configure o `.env` e reinicie a API com um dos comandos de run acima:

```dotenv
LLM_PROVIDER=ollama
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=qwen3:4b
OLLAMA_TIMEOUT_SECONDS=120
```

Não é necessário executar `ollama run`. Para acessar a API pela rede, o Ollama pode continuar no `localhost` do computador que executa a API. O endpoint `/health` verifica apenas a API, sem verificar o modelo.

## Testes e dependências

```powershell
# Executar todos os testes
.\.venv\Scripts\python.exe -m pytest

# Executar um arquivo de testes
.\.venv\Scripts\python.exe -m pytest tests/test_health.py

# Verificar conflitos entre dependências instaladas
.\.venv\Scripts\python.exe -m pip check

# Instalar dependências após mudanças em requirements.txt
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Docker

Com o Docker Desktop em execução e usando contêineres Linux:

```powershell
# Validar a configuração
docker compose config --quiet

# Construir a imagem e iniciar no terminal
docker compose up --build

# Alternativa: construir e iniciar em segundo plano
docker compose up --build -d

# Ver o estado dos contêineres
docker compose ps

# Acompanhar os logs (Ctrl+C para sair)
docker compose logs -f api

# Parar e remover os contêineres
docker compose down
```

O Compose atual publica o site em <http://localhost:8000> e a documentação da API em <http://localhost:8000/docs>, com acesso local. Para testar pela mesma rede, use o comando de run com `--host 0.0.0.0` fora do Docker. Parar ou recriar a aplicação apaga as sessões em memória.

## Linux / macOS

Na preparação, use `python3 -m venv .venv` e copie o arquivo de configuração somente se ele ainda não existir:

```bash
test -f .env || cp .env.example .env
.venv/bin/python -m pip install -r requirements.txt
```

Nos comandos Python deste guia, substitua `.\.venv\Scripts\python.exe` por `.venv/bin/python`. Os comandos do Docker e do Ollama são os mesmos.

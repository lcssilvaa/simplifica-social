"""Páginas do site. Os arquivos editáveis ficam na pasta frontend/."""

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

FRONTEND_DIR = Path(__file__).resolve().parents[3] / "frontend"
router = APIRouter(include_in_schema=False)

# Rotas explícitas: nenhum caminho de arquivo é recebido do navegador.
PAGES = {
    "/": "login.html",
    "/login": "login.html",
    "/inicio": "index.html",
    "/conversar": "chatbot.html",
    "/historico": "historico.html",
    "/identidade": "identidade.html",
    "/configuracoes": "configuracoes.html",
    "/ajuda": "ajuda.html",
}


def page_response(filename: str):
    async def serve_page() -> FileResponse:
        return FileResponse(FRONTEND_DIR / filename)

    return serve_page


for path, filename in PAGES.items():
    router.add_api_route(path, page_response(filename), methods=["GET"])

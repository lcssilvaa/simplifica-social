from html.parser import HTMLParser

import pytest


class PageLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        for name in ("src", "href"):
            value = attributes.get(name, "")
            if value.startswith("/"):
                self.links.append((tag, value))


@pytest.mark.parametrize(
    "path",
    ["/", "/login", "/inicio", "/conversar", "/historico", "/identidade", "/configuracoes", "/ajuda", "/chat-teste"],
)
def test_pages_and_linked_resources_are_served(client, path):
    response = client.get(path)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    assert 'lang="pt-BR"' in response.text
    if path != "/chat-teste":
        assert '/frontend/img/favicon.png?v=2' in response.text
    parser = PageLinks()
    parser.feed(response.text)
    for tag, link in parser.links:
        resource = client.get(link)
        assert resource.status_code == 200, f"{path}: recurso ausente {link}"
        if tag == "script":
            assert "javascript" in resource.headers["content-type"]
        elif link.endswith(".css"):
            assert resource.headers["content-type"].startswith("text/css")


def test_frontend_does_not_catch_unknown_api_routes(client):
    assert client.get("/api/not-a-route").status_code == 404
    assert client.get("/pagina-inexistente").status_code == 404
    assert client.get("/frontend/../.env").status_code == 404


def test_landing_precedes_login_and_connects_existing_flows(client):
    landing = client.get("/")
    parser = PageLinks()
    parser.feed(landing.text)
    links = {link for tag, link in parser.links if tag == "a"}
    assert {"/login", "/login?next=conversar", "/login?next=identidade"} <= links
    assert 'href="#login"' not in landing.text
    assert 'href="#beneficios-todos"' not in landing.text
    assert "Tela de login em construção" not in landing.text

    for path in ("/login", "/login?next=conversar", "/login?next=identidade"):
        login = client.get(path)
        assert login.status_code == 200
        assert "Explorar demonstração" in login.text
        assert login.text != landing.text

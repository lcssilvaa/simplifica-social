def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_docs_and_openapi(client):
    assert client.get("/docs").status_code == 200
    schema = client.get("/openapi.json").json()
    assert set(schema["paths"]) == {
        "/health",
        "/api/chat",
        "/api/sessions",
        "/api/sessions/{session_id}",
        "/api/benefits",
        "/api/benefits/{codigo}",
    }
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 200
    assert "Explorar demonstração" in response.text

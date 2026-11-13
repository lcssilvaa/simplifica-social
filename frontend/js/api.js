// Único ponto de comunicação com o backend FastAPI.
export class ApiError extends Error {
    constructor(message, status = 0) {
        super(message);
        this.status = status;
    }
}

async function request(path, body) {
    let response;
    try {
        response = await fetch(`/api${path}`, body === undefined ? {} : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch {
        throw new ApiError("Não foi possível conectar ao servidor. Confira sua conexão e tente novamente.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = typeof data.detail === "string" ? data.detail : "Não foi possível concluir a solicitação.";
        throw new ApiError(detail, response.status);
    }
    return data;
}

export const createSession = () => request("/sessions", { channel: "WEB" });
export const getSession = id => request(`/sessions/${encodeURIComponent(id)}`);
export const sendMessage = (id, message) => request("/chat", {
    session_id: id, channel: "WEB", message,
});

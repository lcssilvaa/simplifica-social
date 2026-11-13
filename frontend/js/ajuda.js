import "./layout.js";
import { helpTopics } from "./config.js";
import { element } from "./ui.js";

const container = document.querySelector("#help-topics");
const dialog = document.querySelector("#help-dialog");
helpTopics.forEach(topic => {
    const card = element("button", "help-card");
    card.type = "button";
    const icon = element("span", `feature-icon ${topic.color}`, topic.icon);
    icon.setAttribute("aria-hidden", "true");
    const text = element("span", "card-text");
    text.append(element("span", "help-card-title", topic.title), element("span", "help-card-description", topic.description));
    const arrow = element("span", "arrow", "→");
    arrow.setAttribute("aria-hidden", "true");
    card.append(icon, text, arrow);
    card.addEventListener("click", () => {
        document.querySelector("#modalTitle").textContent = topic.title;
        const content = document.querySelector("#modalContent");
        content.replaceChildren(...topic.paragraphs.map(paragraph => element("p", "", paragraph)));
        dialog.showModal();
    });
    container.append(card);
});
dialog.addEventListener("click", event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});

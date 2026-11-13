import { navigation, pageTitles, site } from "./config.js";
import { applyPreferences } from "./accessibility.js";

applyPreferences();

// Imagens compartilhadas e imagens de destaque são alteradas em config.js.
document.querySelectorAll("[data-image]").forEach(image => {
    const source = site.images[image.dataset.image];
    if (source) image.src = source;
});

const sidebar = document.querySelector("[data-sidebar]");
const header = document.querySelector("[data-header]");

if (sidebar && header) {
    const page = document.body.dataset.page;
    sidebar.id = "sidebar";
    const brand = document.createElement("a");
    brand.className = "brand";
    brand.href = "/inicio";
    const logo = document.createElement("img");
    logo.src = site.images.logo;
    logo.alt = "";
    logo.className = "logo";
    brand.setAttribute("aria-label", `${site.name} — início`);
    const symbol = document.createElement("span");
    symbol.className = "brand-symbol";
    symbol.append(logo);
    const wordmark = document.createElement("span");
    wordmark.className = "brand-wordmark";
    const name = document.createElement("strong");
    name.textContent = "simplifica";
    const social = document.createElement("span");
    social.textContent = "social";
    wordmark.append(name, social);
    brand.append(symbol, wordmark);

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Menu principal");
    navigation.forEach(item => {
        const link = document.createElement("a");
        link.className = "nav-item";
        link.href = item.href;
        if (page === item.id) link.setAttribute("aria-current", "page");
        const icon = document.createElement("img");
        icon.src = `/frontend/img/${item.icon}`;
        icon.alt = "";
        icon.className = "nav-icon";
        link.append(icon, document.createTextNode(item.title));
        nav.append(link);
    });
    const footer = document.createElement("div");
    footer.className = "sidebar-foot";
    const tagline = document.createElement("small");
    tagline.textContent = site.tagline;
    const demo = document.createElement("span");
    demo.className = "demo-badge";
    demo.textContent = "Demonstração";
    footer.append(document.createTextNode(site.name), tagline, demo);
    sidebar.replaceChildren(brand, nav, footer);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "menu-toggle icon-button";
    toggle.textContent = "☰";
    toggle.setAttribute("aria-label", "Abrir menu");
    toggle.setAttribute("aria-controls", "sidebar");
    toggle.setAttribute("aria-expanded", "false");
    const title = document.createElement("h1");
    title.textContent = pageTitles[page] || site.name;
    const help = document.createElement("a");
    help.className = "icon-button header-help";
    help.href = "/ajuda";
    help.textContent = "?";
    help.setAttribute("aria-label", "Central de ajuda");
    const profile = document.createElement("a");
    profile.className = "icon-button profile-avatar";
    profile.href = "/configuracoes";
    profile.textContent = "SS";
    profile.setAttribute("aria-label", "Abrir configurações e acessibilidade");
    header.replaceChildren(toggle, title, help, profile);

    // No celular o menu usa um fundo que pode ser fechado com clique ou Escape.
    const overlay = document.createElement("button");
    overlay.type = "button";
    overlay.className = "menu-overlay";
    overlay.tabIndex = -1;
    overlay.hidden = true;
    overlay.setAttribute("aria-label", "Fechar menu");
    document.body.append(overlay);
    const mobile = window.matchMedia("(max-width: 900px)");
    const close = document.createElement("button");
    close.type = "button";
    close.className = "icon-button sidebar-close";
    close.textContent = "×";
    close.setAttribute("aria-label", "Fechar menu");
    sidebar.prepend(close);
    close.addEventListener("click", () => setMenu(false, true));
    function setMenu(open, restoreFocus = false) {
        sidebar.classList.toggle("open", open);
        sidebar.inert = mobile.matches && !open;
        close.hidden = !mobile.matches;
        overlay.hidden = !open;
        document.body.classList.toggle("menu-open", open);
        document.querySelector(".main-area").inert = open;
        if (open) {
            sidebar.setAttribute("role", "dialog");
            sidebar.setAttribute("aria-modal", "true");
            sidebar.setAttribute("aria-label", "Menu de navegação");
        } else {
            sidebar.removeAttribute("role");
            sidebar.removeAttribute("aria-modal");
            sidebar.removeAttribute("aria-label");
        }
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
        if (open) close.focus();
        else if (restoreFocus) toggle.focus();
    }
    toggle.addEventListener("click", () => setMenu(!sidebar.classList.contains("open"), true));
    overlay.addEventListener("click", () => setMenu(false, true));
    document.addEventListener("keydown", event => {
        if (!sidebar.classList.contains("open")) return;
        if (event.key === "Escape") setMenu(false, true);
        if (event.key === "Tab") {
            const links = [...sidebar.querySelectorAll("button, a")];
            const first = links[0];
            const last = links.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first.focus();
            }
        }
    });
    mobile.addEventListener("change", () => setMenu(false));
    setMenu(false);
}

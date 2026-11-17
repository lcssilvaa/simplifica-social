import { applyPreferences } from "/frontend/js/accessibility.js";

applyPreferences();
document.querySelector("#year").textContent = String(new Date().getFullYear());

const header = document.querySelector(".header");
const toggle = document.querySelector("#navToggle");
const mobile = window.matchMedia("(max-width: 1100px)");
function updateHeaderHeight() {
  document.documentElement.style.setProperty("--landing-header-height", `${header.offsetHeight}px`);
}
if ("ResizeObserver" in window) new ResizeObserver(updateHeaderHeight).observe(header);
else window.addEventListener("resize", updateHeaderHeight);
updateHeaderHeight();
function setMenu(open, restoreFocus = false) {
  header.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  updateHeaderHeight();
  if (restoreFocus) toggle.focus();
}
toggle.addEventListener("click", () => setMenu(!header.classList.contains("is-open")));
header.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && header.classList.contains("is-open")) setMenu(false, true);
});
document.addEventListener("click", event => {
  if (header.classList.contains("is-open") && !header.contains(event.target)) setMenu(false);
});
mobile.addEventListener("change", () => setMenu(false));

const sections = [...document.querySelectorAll("main > section[id]")];
const navLinks = [...document.querySelectorAll(".nav__link")];
let scrollPending = false;
function markSection() {
  const offset = scrollY + header.offsetHeight + 100;
  const current = sections.filter(section => section.offsetTop <= offset).at(-1)?.id;
  navLinks.forEach(link => {
    if (link.hash === `#${current}`) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
  scrollPending = false;
}
window.addEventListener("scroll", () => {
  if (!scrollPending) { scrollPending = true; requestAnimationFrame(markSection); }
}, { passive: true });
markSection();

const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
const reduceMotion = () => document.documentElement.classList.contains("reduce-motion") || motionPreference.matches;

// O conteúdo continua no HTML; o carrossel só controla a navegação lateral.
const track = document.querySelector("#benefitTrack");
const benefitCards = [...track.querySelectorAll(".benefit")];
const previous = document.querySelector("#benefitPrev");
const next = document.querySelector("#benefitNext");
const dots = document.querySelector("#benefitDots");
const status = document.querySelector("#benefitStatus");
const compactCarousel = window.matchMedia("(max-width: 900px)");
let pageSize = compactCarousel.matches ? 1 : 2;
let currentPage = 0;
let trackWidth = 0;
const pageCount = () => Math.ceil(benefitCards.length / pageSize);
const pageOffset = page => benefitCards[page * pageSize].offsetLeft - benefitCards[0].offsetLeft;

function updateCarousel() {
  const first = currentPage * pageSize;
  const end = Math.min(first + pageSize, benefitCards.length);
  previous.disabled = currentPage === 0;
  next.disabled = currentPage === pageCount() - 1;
  benefitCards.forEach((card, index) => { card.inert = index < first || index >= end; });
  [...dots.children].forEach((dot, index) => {
    if (index === currentPage) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
  const label = pageSize === 1
    ? `Benefício ${first + 1} de ${benefitCards.length}`
    : `Benefícios ${first + 1} a ${end} de ${benefitCards.length}`;
  if (status.textContent !== label) status.textContent = label;
}

function goToPage(page, animate = true) {
  currentPage = Math.max(0, Math.min(page, pageCount() - 1));
  updateCarousel();
  track.scrollTo({ left: pageOffset(currentPage), behavior: animate && !reduceMotion() ? "smooth" : "auto" });
}

function resizeCarousel() {
  if (trackWidth === track.clientWidth) return;
  const first = currentPage * pageSize;
  trackWidth = track.clientWidth;
  pageSize = compactCarousel.matches ? 1 : 2;
  currentPage = Math.min(Math.floor(first / pageSize), pageCount() - 1);
  dots.replaceChildren();
  for (let page = 0; page < pageCount(); page += 1) {
    const dot = document.createElement("button");
    dot.className = "carousel-dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Ir para a página ${page + 1} dos benefícios`);
    dot.setAttribute("aria-controls", "benefitTrack");
    dot.addEventListener("click", () => goToPage(page));
    dots.append(dot);
  }
  goToPage(currentPage, false);
}

previous.addEventListener("click", () => goToPage(currentPage - 1));
next.addEventListener("click", () => goToPage(currentPage + 1));
track.addEventListener("keydown", event => {
  if (event.target !== track) return;
  const pages = { ArrowLeft: currentPage - 1, ArrowRight: currentPage + 1, Home: 0, End: pageCount() - 1 };
  if (!(event.key in pages)) return;
  event.preventDefault();
  goToPage(pages[event.key]);
});
let carouselScrollPending = false;
track.addEventListener("scroll", () => {
  if (carouselScrollPending) return;
  carouselScrollPending = true;
  requestAnimationFrame(() => {
    const stride = benefitCards[1].offsetLeft - benefitCards[0].offsetLeft;
    currentPage = Math.max(0, Math.min(Math.round(track.scrollLeft / (stride * pageSize)), pageCount() - 1));
    updateCarousel();
    carouselScrollPending = false;
  });
}, { passive: true });
resizeCarousel();
if ("ResizeObserver" in window) new ResizeObserver(resizeCarousel).observe(track);
else window.addEventListener("resize", resizeCarousel);
track.classList.add("is-enhanced");
document.querySelector("#benefitControls").hidden = false;

// A conversa ilustrativa reaparece em sequência quando a seção volta à tela.
const chatPreview = document.querySelector("#chatPreview");
const messages = [...chatPreview.querySelectorAll(".chat-msg")];
let chatTimers = [];
let chatInView = false;
let motionReduced = reduceMotion();

function clearChatTimers() {
  chatTimers.forEach(clearTimeout);
  chatTimers = [];
}

function resetChat() {
  clearChatTimers();
  chatPreview.classList.toggle("is-animated", !reduceMotion());
  messages.forEach(message => message.classList.toggle("is-visible", reduceMotion()));
}

function animateChat() {
  resetChat();
  if (reduceMotion()) return;
  void chatPreview.offsetWidth;
  messages.forEach((message, index) => {
    chatTimers.push(setTimeout(() => message.classList.add("is-visible"), 240 + index * 650));
  });
}

if ("IntersectionObserver" in window) {
  resetChat();
  new IntersectionObserver(entries => {
    chatInView = entries[0].isIntersecting;
    if (chatInView) animateChat();
    else resetChat();
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0 }).observe(chatPreview);
}

function syncMotionPreference() {
  if (motionReduced === reduceMotion()) return;
  motionReduced = reduceMotion();
  goToPage(currentPage, false);
  if (chatInView) animateChat();
  else resetChat();
}
motionPreference.addEventListener("change", syncMotionPreference);
new MutationObserver(syncMotionPreference).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    clearChatTimers();
    chatPreview.classList.remove("is-animated");
  } else if (chatInView) animateChat();
});
window.addEventListener("pagehide", clearChatTimers);

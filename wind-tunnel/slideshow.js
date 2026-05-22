(function () {
  const deck = document.querySelector(".deck");
  if (!deck) return;

  const slides = Array.from(deck.querySelectorAll(".slide"));
  const prevBtn = document.querySelector("[data-prev]");
  const nextBtn = document.querySelector("[data-next]");
  const counter = document.querySelector("[data-counter]");
  const sectionLabel = document.querySelector("[data-section-label]");
  const dotsContainer = document.querySelector(".deck-dots");

  if (!slides.length) return;

  slides.forEach((s, i) => s.dataset.idx = String(i));

  // Hide dot indicators when there are too many slides (keep UI usable).
  // For long decks we render section pills instead.
  const MAX_DOTS = 20;
  const useSectionNav = slides.length > MAX_DOTS;

  if (dotsContainer) {
    if (useSectionNav) {
      const sections = [];
      slides.forEach((s, i) => {
        const name = s.dataset.section || "Slides";
        const last = sections[sections.length - 1];
        if (!last || last.name !== name) {
          sections.push({ name, start: i, end: i });
        } else {
          last.end = i;
        }
      });
      sections.forEach((sec) => {
        const pill = document.createElement("button");
        pill.className = "deck-section-pill";
        pill.type = "button";
        pill.textContent = sec.name;
        pill.dataset.start = String(sec.start);
        pill.dataset.end = String(sec.end);
        pill.addEventListener("click", () => go(sec.start));
        dotsContainer.appendChild(pill);
      });
      dotsContainer.classList.add("deck-sections");
    } else {
      slides.forEach((_, i) => {
        const dot = document.createElement("button");
        dot.className = "deck-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", "Go to slide " + (i + 1));
        dot.addEventListener("click", () => go(i));
        dotsContainer.appendChild(dot);
      });
    }
  }

  let current = 0;

  function activate(slide) {
    // Lazy-load iframes (YouTube embeds etc.) only when the slide is shown.
    // Use removeAttribute so we don't retry on subsequent visits.
    slide.querySelectorAll("iframe[data-src]").forEach((iframe) => {
      const src = iframe.getAttribute("data-src");
      if (src) {
        iframe.setAttribute("src", src);
        iframe.removeAttribute("data-src");
      }
    });
  }

  function updateDotsState() {
    if (!dotsContainer) return;
    Array.from(dotsContainer.children).forEach((d, i) => {
      if (useSectionNav) {
        const start = parseInt(d.dataset.start, 10);
        const end = parseInt(d.dataset.end, 10);
        d.classList.toggle("active", current >= start && current <= end);
      } else {
        d.classList.toggle("active", i === current);
      }
    });
  }

  function go(idx) {
    if (idx < 0 || idx >= slides.length) return;
    slides[current].classList.remove("active");
    current = idx;
    slides[current].classList.add("active");
    activate(slides[current]);
    if (counter) counter.textContent = (current + 1) + " / " + slides.length;
    if (sectionLabel) sectionLabel.textContent = slides[current].dataset.section || "";
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === slides.length - 1;
    updateDotsState();
    if (history.replaceState) {
      history.replaceState(null, "", "#slide-" + (current + 1));
    }
    // Scroll deck into view (only matters when not in fullscreen mode)
    if (!document.body.classList.contains("deck-fullscreen")) {
      window.scrollTo({ top: deck.offsetTop - 80, behavior: "smooth" });
    }
  }

  if (prevBtn) prevBtn.addEventListener("click", () => go(current - 1));
  if (nextBtn) nextBtn.addEventListener("click", () => go(current + 1));

  document.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(current + 1); }
    if (e.key === "ArrowLeft"  || e.key === "PageUp")   { e.preventDefault(); go(current - 1); }
    if (e.key === "Home") { e.preventDefault(); go(0); }
    if (e.key === "End")  { e.preventDefault(); go(slides.length - 1); }
  });

  // Listen for hash changes so in-page #slide-N links jump the deck.
  function slideFromHash() {
    const m = window.location.hash.match(/^#slide-(\d+)$/);
    if (!m) return null;
    return Math.min(Math.max(parseInt(m[1], 10) - 1, 0), slides.length - 1);
  }

  window.addEventListener("hashchange", () => {
    const idx = slideFromHash();
    if (idx !== null && idx !== current) go(idx);
  });

  // Initial state
  const initial = slideFromHash() ?? 0;
  slides.forEach(s => s.classList.remove("active"));
  current = initial;
  slides[current].classList.add("active");
  activate(slides[current]);
  if (counter) counter.textContent = (current + 1) + " / " + slides.length;
  if (sectionLabel) sectionLabel.textContent = slides[current].dataset.section || "";
  if (prevBtn) prevBtn.disabled = current === 0;
  if (nextBtn) nextBtn.disabled = current === slides.length - 1;
  updateDotsState();
})();

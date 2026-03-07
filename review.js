import { assembleReviewHtml, REVIEW_STORAGE_KEY } from "./review-shared.js";

const editorTitleEl = document.getElementById("review-document-title");
const previewEl = document.getElementById("review-preview");
const printBtn = document.getElementById("review-print-btn");
const resetBtn = document.getElementById("review-reset-btn");
const toastEl = document.getElementById("review-toast");

const state = {
  payload: null,
  originalHtml: ""
};

let toastTimer;

init().catch((error) => {
  console.error(error);
  previewEl.innerHTML = '<p class="muted">Could not load the review document. Generate a scheme again from the main page.</p>';
});

async function init() {
  const raw = sessionStorage.getItem(REVIEW_STORAGE_KEY);
  if (!raw) {
    previewEl.innerHTML = '<p class="muted">No review document found. Go back to the generator and create one first.</p>';
    printBtn.disabled = true;
    resetBtn.disabled = true;
    return;
  }

  state.payload = JSON.parse(raw);
  state.originalHtml = assembleReviewHtml(state.payload);
  editorTitleEl.textContent = state.payload.title || "Scheme of Work";
  document.addEventListener("error", handleBrokenImage, true);
  renderPreview(state.originalHtml);
  await initEditor();
  bindEvents();
}

function bindEvents() {
  printBtn.addEventListener("click", async () => {
    syncFromEditor();
    await waitForImages(previewEl);
    window.print();
  });

  resetBtn.addEventListener("click", () => {
    const editor = tinymce.get("document-editor");
    if (!editor) {
      return;
    }
    editor.setContent(state.originalHtml);
    persistHtml(state.originalHtml);
    renderPreview(state.originalHtml);
    showToast("Review document reset.");
  });
}

async function initEditor() {
  await tinymce.init({
    selector: "#document-editor",
    license_key: "gpl",
    menubar: true,
    promotion: false,
    branding: false,
    height: 760,
    plugins: "lists link image table code autoresize preview searchreplace visualblocks",
    toolbar: "undo redo | blocks | bold italic underline | alignleft aligncenter alignright | bullist numlist | outdent indent | link image table | removeformat code preview",
    content_style: "body { font-family: 'Source Serif 4', Georgia, serif; font-size: 16px; line-height: 1.6; padding: 1rem; max-width: 900px; margin: 0 auto; } img { max-width: 100%; height: auto; } table { width: 100%; border-collapse: collapse; } td, th { border: 1px solid #cfd9e2; padding: 8px; } .cover-title { font-family: 'Source Serif 4', Georgia, serif; }",
    setup(editor) {
      editor.on("init", () => {
        const savedHtml = state.payload.editedHtml || state.originalHtml;
        editor.setContent(savedHtml);
        renderPreview(savedHtml);
      });
      editor.on("change input undo redo", () => {
        syncFromEditor();
      });
    }
  });
}

function syncFromEditor() {
  const editor = tinymce.get("document-editor");
  if (!editor || !state.payload) {
    return;
  }
  const html = editor.getContent();
  persistHtml(html);
  renderPreview(html);
}

function persistHtml(html) {
  state.payload.editedHtml = html;
  sessionStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(state.payload));
}

function renderPreview(html) {
  previewEl.innerHTML = html;
}

async function waitForImages(container) {
  const images = [...container.querySelectorAll("img")];
  const pending = images.map((image) => {
    if (image.complete) {
      return image.naturalWidth > 0 ? Promise.resolve() : Promise.resolve();
    }

    return new Promise((resolve) => {
      const done = () => {
        image.removeEventListener("load", done);
        image.removeEventListener("error", done);
        resolve();
      };
      image.addEventListener("load", done, { once: true });
      image.addEventListener("error", done, { once: true });
    });
  });

  await Promise.all(pending);
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function handleBrokenImage(event) {
  const target = event.target;
  if (!(target instanceof HTMLImageElement)) {
    return;
  }

  const removableParent = target.closest(".lesson-image-item, .lesson-images-gallery, .lesson-image-viewer-wrap, .hardware-image-cell");
  if (removableParent && removableParent.children.length <= 1) {
    removableParent.remove();
    return;
  }

  target.remove();
}

function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add("show");
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

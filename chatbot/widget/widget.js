(function () {
  "use strict";
  var ENDPOINT = (document.currentScript && document.currentScript.dataset.endpoint) || "/api/chatbot/message";
  var CONTACT = "https://www.matrixtsl.com/contact-us/";
  var history = [];
  var busy = false;

  var css = ".mc-btn{position:fixed;right:20px;bottom:20px;z-index:99999;width:56px;height:56px;border-radius:50%;border:0;background:#0b3d6b;color:#fff;font-size:26px;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3)}" +
    ".mc-panel{position:fixed;right:20px;bottom:90px;z-index:99999;width:360px;max-width:calc(100vw - 24px);height:520px;max-height:calc(100vh - 110px);background:#fff;color:#1b1b1b;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.3);display:none;flex-direction:column;font:14px/1.45 system-ui,Segoe UI,Arial,sans-serif;overflow:hidden}" +
    ".mc-panel.open{display:flex}.mc-head{background:#0b3d6b;color:#fff;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;font-weight:600}" +
    ".mc-head button{background:none;border:0;color:#fff;font-size:20px;cursor:pointer}" +
    ".mc-notice{background:#fff7e0;color:#5b4a00;padding:6px 12px;font-size:12px;border-bottom:1px solid #eee}.mc-notice a{color:#0b3d6b}" +
    ".mc-log{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px}" +
    ".mc-msg{max-width:88%;padding:8px 11px;border-radius:10px;white-space:pre-wrap;word-wrap:break-word}.mc-msg.user{align-self:flex-end;background:#0b3d6b;color:#fff}" +
    ".mc-msg.bot{align-self:flex-start;background:#eef2f6}.mc-msg a{color:#0b3d6b;word-break:break-all}" +
    ".mc-form{display:flex;gap:6px;padding:10px;border-top:1px solid #e3e3e3}.mc-form input{flex:1;padding:8px 10px;border:1px solid #bbb;border-radius:8px;font:inherit}" +
    ".mc-form button{background:#0b3d6b;color:#fff;border:0;border-radius:8px;padding:0 14px;cursor:pointer;font:inherit}.mc-form button:disabled{opacity:.5}";
  var style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  var btn = el("button", "mc-btn", "💬");
  btn.setAttribute("aria-label", "Open Matrix TSL chat assistant");
  var panel = el("div", "mc-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Matrix TSL assistant");
  var head = el("div", "mc-head");
  head.appendChild(el("span", "", "Matrix TSL assistant"));
  var close = el("button", "", "×");
  close.setAttribute("aria-label", "Close chat");
  head.appendChild(close);
  var notice = el("div", "mc-notice", "AI assistant – please verify important details. ");
  var talk = el("a", "", "Talk to a human");
  talk.href = CONTACT; talk.target = "_blank"; talk.rel = "noopener";
  notice.appendChild(talk);
  var log = el("div", "mc-log");
  log.setAttribute("aria-live", "polite");
  var form = el("form", "mc-form");
  var input = el("input");
  input.type = "text"; input.maxLength = 1000; input.placeholder = "Ask about Matrix products…"; input.setAttribute("aria-label", "Your question");
  var send = el("button", "", "Send");
  send.type = "submit";
  form.appendChild(input); form.appendChild(send);
  [head, notice, log, form].forEach(function (n) { panel.appendChild(n); });
  document.body.appendChild(panel);
  document.body.appendChild(btn);

  // Safe rendering: text nodes only, URLs become links, **bold** supported.
  function render(target, text) {
    var re = /(https?:\/\/[^\s)\]>"']+[^\s)\]>"'.,;:!?])|\*\*([^*]+)\*\*/g, last = 0, m;
    while ((m = re.exec(text))) {
      target.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1]) {
        var a = el("a", "", m[1]); a.href = m[1]; a.target = "_blank"; a.rel = "noopener";
        target.appendChild(a);
      } else target.appendChild(el("strong", "", m[2]));
      last = re.lastIndex;
    }
    target.appendChild(document.createTextNode(text.slice(last)));
  }

  function add(role, text) {
    var d = el("div", "mc-msg " + role);
    if (role === "bot") render(d, text); else d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    return d;
  }

  btn.onclick = function () {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) {
      if (!log.children.length) add("bot", "Hello! I can answer questions about Matrix TSL products, support and company information using our website.");
      input.focus();
    }
  };
  close.onclick = function () { panel.classList.remove("open"); };

  form.onsubmit = function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || busy) return;
    busy = true; send.disabled = true; input.value = "";
    add("user", q);
    var wait = add("bot", "Searching our site…");
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, history: history.slice(-12) }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        wait.textContent = "";
        var text = res.ok && res.j.answer ? res.j.answer : (res.j.error || "Sorry, something went wrong.") + " You can also contact us: " + CONTACT;
        render(wait, text);
        if (res.ok) { history.push({ role: "user", content: q }, { role: "assistant", content: res.j.answer }); }
      })
      .catch(function () { wait.textContent = "Sorry, I couldn't reach the assistant. Please contact us: " + CONTACT; })
      .then(function () { busy = false; send.disabled = false; log.scrollTop = log.scrollHeight; input.focus(); });
  };
})();

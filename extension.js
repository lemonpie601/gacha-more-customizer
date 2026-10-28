/* Gacha Forge · 픽업 인원 v1.0.0 — 커스터마이저 추가 패치용 개인 확장 (Gacha Forge 1.8.13 / Marinara Engine 2.5.1).
 * 게임 설정 왼쪽 목록에 [픽업 인원]을 따로 더하고, 지금 열려 있는 월드의 픽업 배너 신규 5성(1~3명)·신규 4성(1~6명) 수를 정합니다.
 * 월드마다 따로 저장됩니다. 서버 쪽 추가 패치(gf-featured-addon)와 커스터마이저 패치·확장이 먼저 설치되어 있어야 합니다. */
(() => {
  "use strict";
  const KEY = "__GF_FEATURED_ADDON";
  if (typeof window[KEY] === "function") { try { window[KEY](); } catch {} }

  const INSTANCE = Math.random().toString(36).slice(2, 10);
  const HOST_TAG = "marinara-capability-gacha-forge";
  const API = "/api/gacha-forge/gf-featured/settings";
  const life = new AbortController();
  const on = (t, type, fn, opts = {}) => t.addEventListener(type, fn, { ...opts, signal: life.signal });
  let disposed = false;

  const host = () => document.querySelector(HOST_TAG);
  const RUN_ID_RE = /^[A-Za-z0-9:_-]{1,128}$/;
  const currentRunId = () => {
    const h = host();
    const id = String((h && ((h._run && h._run.runId) || h._activeRunId)) || "").trim();
    return RUN_ID_RE.test(id) ? id : "";
  };

  function headers() {
    const out = { "X-Marinara-CSRF": "1", "Content-Type": "application/json" };
    try { const s = window.localStorage.getItem("marinara_admin_secret")?.trim(); if (s) out["X-Admin-Secret"] = s; } catch {}
    return out;
  }
  const ERRORS = {
    "invalid-settings": "값이 허용 범위를 벗어났습니다.",
    "bad-request": "이 월드를 서버에서 찾지 못했습니다. 게임에서 월드를 다시 열어 주세요.",
  };
  async function callApi(path, body) {
    let res;
    try {
      res = await fetch(path, { method: "POST", credentials: "same-origin", headers: headers(), body: new TextEncoder().encode(JSON.stringify(body)) });
    } catch { throw Object.assign(Error("서버에 연결하지 못했습니다."), { code: "network" }); }
    let data = null;
    try { data = await res.json(); } catch {}
    if (res.status === 404) throw Object.assign(Error("서버에 픽업 인원 추가 패치가 없습니다. 커스터마이저 패치와 추가 패치를 설치하고 마리나라를 다시 시작해 주세요."), { code: "missing" });
    if (res.status === 401 || res.status === 403) throw Object.assign(Error("서버 권한 확인에 실패했습니다."), { code: "auth" });
    if (!res.ok || !data) throw Object.assign(Error("서버 오류가 발생했습니다 (HTTP " + res.status + ")."), { code: "http" });
    if (!data.ok) throw Object.assign(Error(ERRORS[data.error] || data.message || data.error || "서버 오류가 발생했습니다."), { code: data.error || "error" });
    return data;
  }

  const CSS = `
.gff-view{display:flex;flex-direction:column;gap:var(--sp-2,10px);flex:1 1 auto;min-width:0;min-height:0}
.gff-view .st-plate{flex:0 0 auto}
.gff-fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(calc(var(--f,10px)*17),1fr));gap:var(--sp-2,10px) var(--sp-3,16px)}
.gff-field{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:calc(var(--f,10px)*.2) var(--sp-2,10px)}
.gff-field .st-lbl{grid-column:1;letter-spacing:.04em;font-size:var(--t-xs,12px);color:var(--text,#e8ecf6)}
.gff-hint{grid-column:1;font-size:var(--t-tiny,11px);letter-spacing:.04em;color:var(--steel-faint,#7e93ae)}
.gff-note{font-size:var(--t-tiny,11px);letter-spacing:.04em;line-height:1.5;color:var(--steel-faint,#7e93ae);margin-top:var(--sp-2,10px)}
.gff-warn{font-size:var(--t-xs,12px);letter-spacing:.03em;color:var(--amber,#e9b44c)}
.gff-warn:empty{display:none}
.gff-world{color:var(--text,#e8ecf6);font-weight:600}
.gff-num{grid-column:2;grid-row:1/span 2;display:inline-flex;align-items:center;gap:calc(var(--f,10px)*.3)}
.gff-num input{width:calc(var(--f,10px)*6.4);text-align:right;font-variant-numeric:tabular-nums;-moz-appearance:textfield;background:var(--ink-3,#1e2a40);border:1px solid var(--steel-dark,#34435e);
  color:var(--text,#e8ecf6);font-family:var(--display,inherit);font-weight:700;font-size:var(--t-sm,13px);padding:calc(var(--f,10px)*.35) calc(var(--f,10px)*.5);--cut:.4em;clip-path:var(--clip-chip,none);border-radius:var(--radius-sm,3px)}
.gff-num input::-webkit-inner-spin-button,.gff-num input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.gff-num input:focus{outline:none;border-color:var(--coral,#f2643c)}
.gff-num input[aria-invalid="true"]{border-color:var(--alarm,#ff6b6b)}
.gff-num .st-k{font-size:var(--t-xs,12px)}
.gff-foot{display:flex;align-items:center;gap:var(--sp-2,10px);flex:none}
.gff-status{flex:1 1 auto;min-width:0;min-height:1.2em;font-size:var(--t-xs,12px);letter-spacing:.04em;color:var(--steel-faint,#7e93ae)}
.gff-status[data-tone="error"]{color:var(--alarm,#ff6b6b)}
.gff-status[data-tone="ok"]{color:var(--jade,#3cc9a0)}
.gff-foot .st-compress.-go:not([disabled]){background:var(--coral,#f2643c);color:var(--on-coral,#fff)}
`;
  const h = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v; else n.setAttribute(k, v === true ? "" : String(v));
    }
    for (const kid of kids) if (kid !== null && kid !== undefined && kid !== false && kid !== "") n.append(kid);
    return n;
  };
  const setStatus = (n, text, tone = "") => { n.textContent = text || ""; if (tone) n.dataset.tone = tone; else delete n.dataset.tone; };

  const FIELDS = {
    featuredFive: { label: "픽업 5성 인원", unit: "명", min: 1, max: 3, hint: (v) => (v === 1 ? "게임 기본 · 신규 1명" : "신규 " + v + "명 · 전용 무기도 " + v + "개") },
    featuredFour: { label: "픽업 4성 인원", unit: "명", min: 1, max: 6, hint: (v) => (v === 1 ? "게임 기본 · 신규 1명" : "신규 " + v + "명 · 복각 4성과 같은 확률") },
  };

  function createView() {
    const root = h("div", { class: "gff-view", "data-gff-view": INSTANCE });
    root.append(h("style", { text: CSS }));
    const inputs = {}, hints = {};
    const field = (id) => {
      const f = FIELDS[id];
      const input = h("input", { type: "number", inputmode: "numeric", min: f.min, max: f.max, step: 1, "aria-label": f.label });
      const hint = h("span", { class: "gff-hint" });
      inputs[id] = input; hints[id] = hint;
      return h("label", { class: "gff-field" }, h("span", { class: "st-lbl", text: f.label }), hint, h("span", { class: "gff-num" }, input, h("span", { class: "st-k", text: f.unit })));
    };
    const world = h("span", { class: "k" });
    const warn = h("div", { class: "gff-warn" });
    const status = h("div", { class: "gff-status", role: "status" });
    const revert = h("button", { class: "st-compress -ghost", type: "button", text: "되돌리기" });
    const save = h("button", { class: "st-compress -go", type: "button", text: "이 월드에 적용" });
    root.append(
      warn,
      h("div", { class: "st-plate" },
        h("div", { class: "hd" }, h("h3", { text: "픽업 배너 인원" }), world),
        h("div", { class: "gff-fields" }, field("featuredFive"), field("featuredFour")),
        h("div", { class: "gff-note", text: "이 월드에만 적용됩니다. 늘리면 소환 탭을 열 때 지금 배너에도 모자란 인원을 새로 만듭니다 (LLM·이미지 생성 비용, 1~2분). 줄이면 남는 인원은 픽업에서 빠지기만 하고 지워지지 않으며, 다시 늘리면 그대로 돌아옵니다." })),
      h("div", { class: "gff-foot" }, status, revert, save),
    );
    let server = null, loadedFor = "", busy = false;
    const current = () => { const o = {}; for (const id of Object.keys(FIELDS)) o[id] = inputs[id].value === "" ? NaN : Number(inputs[id].value); return o; };
    const dirty = () => { const c = current(); return !!server && Object.keys(c).some((k) => c[k] !== server[k]); };
    function refresh() {
      const c = current(); let invalid = false;
      for (const [id, f] of Object.entries(FIELDS)) {
        const v = c[id], bad = !Number.isInteger(v) || v < f.min || v > f.max;
        inputs[id].setAttribute("aria-invalid", bad && server ? "true" : "false");
        hints[id].textContent = !server ? "" : bad ? f.min + "~" + f.max + " 사이로 입력해 주세요" : f.hint(v);
        invalid = invalid || bad;
        inputs[id].disabled = !server;
      }
      save.disabled = busy || invalid || !dirty() || !loadedFor || loadedFor !== currentRunId();
      revert.disabled = busy || !dirty();
    }
    function fill(settings, run) {
      server = { featuredFive: 1, featuredFour: 1, ...settings };
      for (const id of Object.keys(FIELDS)) inputs[id].value = server[id];
      world.textContent = "이 월드만 · " + ((run && run.name) || (loadedFor ? "ID " + loadedFor.slice(0, 12) : ""));
      refresh();
    }
    function checkCustomizer() {
      const r = root.getRootNode();
      const has = !!(r && r.querySelector && r.querySelector("[data-gf-customizer-tab]"));
      warn.textContent = has ? "" : "커스터마이저 확장이 꺼져 있거나 없습니다. 이 추가 패치는 커스터마이저 패치·확장과 함께 쓰도록 만들어졌습니다.";
    }
    for (const input of Object.values(inputs)) input.addEventListener("input", () => { setStatus(status, ""); refresh(); });
    revert.onclick = () => { if (server) fill(server, null); setStatus(status, ""); };
    async function load() {
      const rid = currentRunId();
      checkCustomizer();
      if (!rid) { server = null; loadedFor = ""; world.textContent = ""; setStatus(status, "월드를 확인하지 못했습니다. 게임에서 월드를 연 뒤 다시 눌러 주세요.", "error"); return refresh(); }
      if (busy) return;
      busy = true; refresh(); setStatus(status, "불러오는 중입니다…");
      try {
        const d = await callApi(API + "/get", { runId: rid });
        if (disposed) return;
        loadedFor = rid; fill(d.settings, d.run); setStatus(status, "");
      } catch (e) { server = null; loadedFor = ""; setStatus(status, e.message, "error"); }
      finally { busy = false; refresh(); }
    }
    save.onclick = async () => {
      if (busy || save.disabled) return;
      const rid = loadedFor;
      busy = true; refresh(); setStatus(status, "저장하는 중입니다…");
      try {
        const c = current();
        const d = await callApi(API, { runId: rid, featuredFive: c.featuredFive, featuredFour: c.featuredFour });
        fill(d.settings, d.run);
        setStatus(status, "저장했습니다. 소환 탭을 다시 열면 반영됩니다.", "ok");
      } catch (e) { setStatus(status, "저장하지 못했습니다. " + e.message, "error"); }
      finally { busy = false; refresh(); }
    };
    refresh();
    return { root, title: "픽업 인원", opened() { if (!server || !dirty() || loadedFor !== currentRunId()) load(); else checkCustomizer(); } };
  }

  /* ═════ Mount into the game's Settings rail as its own section ═════ */
  const view = createView();
  let active = null, hiddenKids = [], deselected = [], titleSwap = null, wanted = false, scheduled = false, observer = null, observed = null;
  const boundRails = new WeakSet();
  const roots = () => { const r = []; for (const el of document.querySelectorAll(HOST_TAG)) if (el.shadowRoot) r.push(el.shadowRoot); r.push(document); return r; };
  function findScreen() {
    for (const r of roots()) for (const s of r.querySelectorAll('[data-screen="settings"]')) if (s.isConnected && s.getClientRects().length) return s;
    return null;
  }
  function restore() {
    for (const [n, value, prio] of hiddenKids) if (n.isConnected) n.style.setProperty("display", value, prio);
    hiddenKids = [];
    for (const n of deselected) if (n.isConnected) n.setAttribute("aria-selected", "true");
    deselected = [];
    if (titleSwap && titleSwap.el.isConnected) titleSwap.el.textContent = titleSwap.text;
    titleSwap = null;
    if (active) { view.root.remove(); if (active.tab.isConnected) active.tab.setAttribute("aria-selected", "false"); }
    active = null;
  }
  function show(screen, rail, pane, tab) {
    if (!(active && active.pane === pane && view.root.parentNode === pane)) {
      const reopen = !active;
      restore();
      for (const n of Array.from(pane.children)) {
        if (n === view.root) continue;
        hiddenKids.push([n, n.style.getPropertyValue("display"), n.style.getPropertyPriority("display")]);
        n.style.setProperty("display", "none", "important");
      }
      pane.append(view.root);
      active = { pane, tab };
      if (reopen) view.opened(); else view.opened();
    }
    for (const n of rail.children) {
      if (n === tab || n.getAttribute("aria-selected") !== "true") continue;
      n.setAttribute("aria-selected", "false");
      if (!deselected.includes(n)) deselected.push(n);
    }
    tab.setAttribute("aria-selected", "true");
    const h2 = screen.querySelector(".head-id h2") || screen.getRootNode().querySelector?.(".head-id h2");
    if (h2 && h2.textContent !== view.title) { if (!titleSwap || titleSwap.el !== h2) titleSwap = { el: h2, text: h2.textContent }; h2.textContent = view.title; }
  }
  function mount() {
    if (disposed) return;
    ensureObserver();
    const screen = findScreen();
    if (!screen) { restore(); wanted = false; return; }
    const rail = screen.querySelector(".st-rail"), pane = screen.querySelector(".st-pane");
    if (!rail || !pane) return;
    for (const stale of rail.querySelectorAll("[data-gf-featured-tab]")) if (stale.getAttribute("data-gf-featured-tab") !== INSTANCE) stale.remove();
    let tab = rail.querySelector('[data-gf-featured-tab="' + INSTANCE + '"]');
    if (!tab) {
      tab = h("button", { class: "st-sect", type: "button", role: "tab", "aria-selected": "false", "data-gf-featured-tab": INSTANCE }, h("span", { class: "k", text: "Gacha" }), h("span", { class: "n", text: "픽업 인원" }));
      on(tab, "click", (e) => { e.preventDefault(); e.stopPropagation(); if (disposed) return; wanted = true; mount(); });
      const after = rail.querySelector("[data-gf-customizer-tab]");
      if (after && after.nextSibling) rail.insertBefore(tab, after.nextSibling); else rail.append(tab);
    }
    if (!boundRails.has(rail)) {
      boundRails.add(rail);
      on(rail, "click", (e) => { if (disposed || e.target.closest?.("[data-gf-featured-tab]")) return; if (wanted) { wanted = false; restore(); } }, { capture: true });
    }
    if (!wanted) { if (active) restore(); return; }
    show(screen, rail, pane, tab);
  }
  function schedule() { if (disposed || scheduled) return; scheduled = true; setTimeout(() => { scheduled = false; mount(); }, 80); }
  function ensureObserver() {
    const el = document.querySelector(HOST_TAG);
    const next = el?.shadowRoot || document.body;
    if (!next || (next === observed && observer)) return;
    observer?.disconnect();
    observed = next;
    observer = new MutationObserver((recs) => { if (disposed) return; for (const r of recs) { if (active && view.root.contains(r.target)) continue; return schedule(); } });
    observer.observe(observed, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-screen", "style", "hidden"] });
    if (observed !== document.body && document.body) observer.observe(document.body, { childList: true });
  }
  if (document.readyState === "loading") on(document, "DOMContentLoaded", mount, { once: true }); else mount();
  on(window, "hashchange", schedule);
  on(window, "popstate", schedule);
  const interval = setInterval(() => {
    if (disposed) return;
    if (!observed || !observed.isConnected || (observed === document.body && document.querySelector(HOST_TAG)?.shadowRoot)) { observer?.disconnect(); observer = null; observed = null; schedule(); }
  }, 5000);
  window[KEY] = () => {
    if (disposed) return;
    disposed = true; life.abort(); clearInterval(interval); observer?.disconnect(); restore();
    for (const r of roots()) for (const t of r.querySelectorAll("[data-gf-featured-tab]")) t.remove();
    view.root.remove();
    if (window[KEY]) delete window[KEY];
  };
})();

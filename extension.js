/* Gacha Forge · 픽업 인원 v1.1.1 — Gacha Forge Customizer 추가 패치용 개인 확장 (Gacha Forge 1.8.13 / Marinara Engine 2.5.1).
 * 커스터마이저 설정 화면(설정 → 커스터마이저) 맨 아래, 커스터마이저의 저장 버튼 줄 밑에 [픽업 인원] 판을 넣고, 지금 열린 월드의
 * 픽업 배너 신규 5성(1~3명)·신규 4성(1~6명) 수를 정합니다. 월드마다 따로 저장됩니다.
 * 커스터마이저 확장·서버 패치와 이 저장소의 서버 추가 패치(server/)가 필요합니다. 커스터마이저가 없으면 아무것도 그리지 않습니다. */
(() => {
  "use strict";
  const KEY = "__GF_FEATURED_ADDON";
  if (typeof window[KEY] === "function") { try { window[KEY](); } catch {} }

  const HOST_TAG = "marinara-capability-gacha-forge";
  const CUSTOMIZER_VIEW = '[data-gfc-view="set"]';
  const API = "/api/gacha-forge/gf-featured/settings";
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
      res = await fetch(path, { method: "POST", credentials: "same-origin", cache: "no-store", headers: headers(), body: new TextEncoder().encode(JSON.stringify(body)) });
    } catch { throw Object.assign(Error("서버에 연결하지 못했습니다."), { code: "network" }); }
    let data = null;
    try { data = await res.json(); } catch {}
    if (res.status === 404) throw Object.assign(Error("서버에 픽업 인원 추가 패치가 없습니다. 추가 패치를 커스터마이저 패치 뒤에 넣고 마리나라를 다시 시작해 주세요."), { code: "missing" });
    if (res.status === 401 || res.status === 403) throw Object.assign(Error("서버 권한 확인에 실패했습니다."), { code: "auth" });
    if (!res.ok || !data) throw Object.assign(Error("서버 오류가 발생했습니다 (HTTP " + res.status + ")."), { code: "http" });
    if (!data.ok) throw Object.assign(Error(ERRORS[data.error] || data.message || data.error || "서버 오류가 발생했습니다."), { code: data.error || "error" });
    return data;
  }

  // Layout reuses the customizer's own classes (st-plate, gfc-fields, gfc-field, gfc-num, gfc-hint, gfc-foot, gfc-status),
  // whose styles live inside the customizer view this plate is placed in. Only a few extras are added here.
  const CSS = `
.gff-plate{margin-top:var(--sp-3,16px)}
.gff-plate .gff-note{font-size:var(--t-tiny,11px);letter-spacing:.04em;line-height:1.5;color:var(--steel-faint,#7e93ae);margin-top:var(--sp-2,10px)}
.gff-plate .gff-row{margin-top:var(--sp-2,10px)}
.gff-plate .gfc-num input:disabled{opacity:.5}
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

  function createPlate() {
    const inputs = {}, hints = {};
    const field = (id) => {
      const f = FIELDS[id];
      const input = h("input", { type: "number", inputmode: "numeric", min: f.min, max: f.max, step: 1, "aria-label": f.label });
      const hint = h("span", { class: "gfc-hint" });
      inputs[id] = input; hints[id] = hint;
      return h("label", { class: "gfc-field" }, h("span", { class: "st-lbl", text: f.label }), hint, h("span", { class: "gfc-num" }, input, h("span", { class: "st-k", text: f.unit })));
    };
    const kicker = h("span", { class: "k", text: "이 월드만" });
    const status = h("div", { class: "gfc-status", role: "status" });
    const revert = h("button", { class: "st-compress -ghost", type: "button", text: "되돌리기" });
    const save = h("button", { class: "st-compress -go", type: "button", text: "이 월드에 적용" });
    const plate = h("div", { class: "st-plate gff-plate", "data-gff-plate": "1" },
      h("style", { text: CSS }),
      h("div", { class: "hd" }, h("h3", { text: "픽업 인원" }), kicker),
      h("div", { class: "gfc-fields" }, field("featuredFive"), field("featuredFour")),
      h("div", { class: "gff-note", text: "지금 열린 월드에만 적용됩니다. 늘리면 소환 탭을 열 때 지금 배너에도 모자란 인원을 새로 만듭니다 (LLM·이미지 생성 비용, 1~2분). 줄이면 남는 인원은 픽업에서 빠지기만 하고 지워지지 않으며, 다시 늘리면 그대로 돌아옵니다." }),
      h("div", { class: "gfc-foot gff-row" }, status, revert, save));
    let server = null, loadedFor = "", busy = false, token = 0;
    const current = () => { const o = {}; for (const id of Object.keys(FIELDS)) o[id] = inputs[id].value === "" ? NaN : Number(inputs[id].value); return o; };
    const dirty = () => { const c = current(); return !!server && Object.keys(c).some((k) => c[k] !== server[k]); };
    function refresh() {
      const c = current(); let invalid = false;
      for (const [id, f] of Object.entries(FIELDS)) {
        const v = c[id], bad = !Number.isInteger(v) || v < f.min || v > f.max;
        inputs[id].setAttribute("aria-invalid", bad && server ? "true" : "false");
        inputs[id].disabled = !server || busy;
        hints[id].textContent = !server ? "" : bad ? f.min + "~" + f.max + " 사이로 입력해 주세요" : f.hint(v);
        invalid = invalid || bad;
      }
      save.disabled = busy || invalid || !dirty() || !loadedFor || loadedFor !== currentRunId();
      revert.disabled = busy || !dirty();
    }
    function fill(settings, run) {
      server = { featuredFive: 1, featuredFour: 1, ...settings };
      for (const id of Object.keys(FIELDS)) inputs[id].value = server[id];
      kicker.textContent = "이 월드만" + (run && run.name ? " · " + run.name : "");
      refresh();
    }
    for (const input of Object.values(inputs)) input.addEventListener("input", () => { setStatus(status, ""); refresh(); });
    revert.onclick = () => { if (server) fill(server, null); setStatus(status, ""); };
    async function load() {
      const rid = currentRunId();
      const mine = ++token;
      if (!rid) { server = null; loadedFor = ""; kicker.textContent = "이 월드만"; setStatus(status, "월드를 확인하지 못했습니다. 게임에서 월드를 연 뒤 다시 열어 주세요.", "error"); return refresh(); }
      busy = true; refresh(); setStatus(status, "불러오는 중입니다…");
      try {
        const d = await callApi(API + "/get", { runId: rid });
        if (disposed || mine !== token) return;
        loadedFor = rid; fill(d.settings, d.run); setStatus(status, "");
      } catch (e) { if (mine !== token) return; server = null; loadedFor = ""; setStatus(status, e.message, "error"); }
      finally { if (mine === token) { busy = false; refresh(); } }
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
    return {
      plate,
      // Called whenever the customizer section is (re)shown. Keeps unsaved edits for the same world.
      shown() { if (busy) return; if (!server || loadedFor !== currentRunId() || !dirty()) load(); },
    };
  }

  /* ═════ Place the plate inside the customizer's settings view ═════ */
  const ui = createPlate();
  let wasVisible = false, scheduled = false, observer = null, observed = null;
  const roots = () => { const r = []; for (const el of document.querySelectorAll(HOST_TAG)) if (el.shadowRoot) r.push(el.shadowRoot); r.push(document); return r; };
  function findCustomizerView() {
    for (const r of roots()) for (const v of r.querySelectorAll(CUSTOMIZER_VIEW)) if (v.isConnected) return v;
    return null;
  }
  function place() {
    if (disposed) return;
    ensureObserver();
    const view = findCustomizerView();
    if (!view) { wasVisible = false; return; }
    // Below the customizer's own 되돌리기 / 서버에 적용 row, so its buttons clearly belong to the plates above.
    const foot = Array.from(view.children).find((n) => n !== ui.plate && n.classList && n.classList.contains("gfc-foot"));
    if (ui.plate.parentNode !== view || (foot && ui.plate.previousElementSibling !== foot)) {
      if (foot) foot.after(ui.plate); else view.append(ui.plate);
    }
    const visible = view.getClientRects().length > 0 && getComputedStyle(view).display !== "none";
    if (visible && !wasVisible) ui.shown();
    wasVisible = visible;
  }
  function schedule() { if (disposed || scheduled) return; scheduled = true; setTimeout(() => { scheduled = false; place(); }, 80); }
  function ensureObserver() {
    const el = document.querySelector(HOST_TAG);
    const next = el?.shadowRoot || document.body;
    if (!next || (next === observed && observer)) return;
    observer?.disconnect();
    observed = next;
    observer = new MutationObserver((recs) => { if (disposed) return; for (const r of recs) { if (ui.plate.contains(r.target)) continue; return schedule(); } });
    observer.observe(observed, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-screen", "style", "hidden", "aria-selected"] });
    if (observed !== document.body && document.body) observer.observe(document.body, { childList: true });
  }
  const onNav = () => schedule();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", place, { once: true }); else place();
  window.addEventListener("hashchange", onNav);
  window.addEventListener("popstate", onNav);
  const interval = setInterval(() => {
    if (disposed) return;
    if (!observed || !observed.isConnected || (observed === document.body && document.querySelector(HOST_TAG)?.shadowRoot)) { observer?.disconnect(); observer = null; observed = null; }
    place();
  }, 2000);
  window[KEY] = () => {
    if (disposed) return;
    disposed = true; clearInterval(interval); observer?.disconnect();
    window.removeEventListener("hashchange", onNav); window.removeEventListener("popstate", onNav);
    ui.plate.remove();
    for (const r of roots()) for (const t of r.querySelectorAll("[data-gff-plate]")) t.remove();
    if (window[KEY]) delete window[KEY];
  };
})();

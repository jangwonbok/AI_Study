(function () {
  const data = window.STUDY_DATA || { weeks: [] };
  const pad = (n) => String(n).padStart(2, "0");

  // ── 작업물 자동 추가 ──────────────────────────────────────────
  // auto-works.js가 받아 온 파일 목록(연도/월/weekN/폴더/…)에서 study-data.js에 아직 없는 것만 카드로 만듦
  //   폴더/파일.mp4·webm·mov → 영상 카드,  폴더/파일.html → 웹페이지 카드,  폴더/하위폴더/index.html → 사이트 카드
  //   분류는 폴더 이름 (Main은 Web)
  (function addAutoWorks() {
    const files = window.WORK_FILES || [];
    if (!files.length) return;
    data.weeks = data.weeks || [];
    const known = new Set(
      data.weeks.flatMap((w) =>
        (w.items || []).flatMap((i) => [i.video, i.thumbnail, i.preview, ...(i.links || []).map((l) => l.url)])
      )
    );
    const fileSet = new Set(files);
    const nameOf = (s) =>
      s
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]?\d{3,4}x\d{3,4}/g, "")
        .split(/[-_\s]+/)
        .filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");

    files.forEach((path) => {
      const m = path.match(/^(\d{4})\/(\d{2})\/week(\d+)\/([^/]+)\/(.+)$/);
      if (!m || known.has(path)) return;
      const [, year, month, week, folder, rest] = m;
      const parts = rest.split("/");
      const category = folder === "Main" ? "Web" : folder;
      let item = null;
      if (parts.length === 1 && /\.(mp4|webm|mov)$/i.test(rest)) {
        item = { title: nameOf(rest), category, video: path, links: [{ label: "Open video", url: path, type: "video" }] };
      } else if (parts.length === 1 && /\.html?$/i.test(rest)) {
        item = { title: nameOf(rest), category, links: [{ label: "View page", url: path, type: "demo" }] };
      } else if (parts.length === 2 && /^index\.html?$/i.test(parts[1])) {
        const thumb = ["jpg", "png", "webp"].map((x) => `${path.slice(0, -parts[1].length)}thumb.${x}`).find((p) => fileSet.has(p));
        item = { title: nameOf(parts[0]), category, thumbnail: thumb, links: [{ label: "View site", url: path, type: "demo" }] };
      }
      if (!item) return;
      known.add(path);
      let w = data.weeks.find((x) => x.year === +year && x.month === +month && x.week === +week);
      if (!w) data.weeks.push((w = { year: +year, month: +month, week: +week, items: [] }));
      (w.items = w.items || []).push(item);
    });
  })();

  // year/month/week 값으로 ID·이름을 만들고 최신순으로 정렬
  const weeks = (data.weeks || [])
    .map((w) => ({
      ...w,
      monthKey: `${w.year}-${pad(w.month)}`,
      id: w.id || `${w.year}-${pad(w.month)}-w${w.week}`,
      label: w.label || `Week ${w.week}`,
    }))
    .sort((a, b) => b.year - a.year || b.month - a.month || b.week - a.week);

  const ALL = "All";
  // compact: 카드를 작은 썸네일로 줄인 상태
  const state = { query: "", category: ALL, compact: false };

  const $ = (sel) => document.querySelector(sel);
  const LINK_ICONS = { demo: "▶", video: "◉", doc: "▤", external: "↗" };
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 한글 파일명이 들어간 상대경로도 안전하게 열리도록 인코딩
  const toHref = (url) => (/^[a-z]+:/i.test(url) || url.startsWith("#") ? url : encodeURI(url));
  const weekName = (w) => `${w.year}.${pad(w.month)} · ${w.label}`;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null) continue;
      if (k === "text") node.textContent = v;
      else node.setAttribute(k, v);
    }
    (children || []).forEach((c) => c && node.append(c));
    return node;
  }

  function matches(item) {
    if (state.category !== ALL && item.category !== state.category) return false;
    if (!state.query) return true;
    const haystack = [item.title, item.category, item.description, ...(item.tools || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(state.query);
  }

  // 소개 문구는 단어마다 나눠서 처음 열 때 한 단어씩 떠오르게 함
  function setWords(node, text, offset) {
    const parts = text.split(/(\s+)/);
    node.replaceChildren(
      ...parts.map((w, i) =>
        /^\s+$/.test(w) ? document.createTextNode(w) : el("span", { class: "word", style: `--i:${offset + i / 2}`, text: w })
      )
    );
  }

  function renderHeader() {
    document.title = data.title || document.title;
    $("#site-title").textContent = data.title || "";
    setWords($("#site-desc"), data.description || "", 0);
    if (data.repo) $("#repo-link").href = data.repo;
    else $("#repo-link").remove();
  }

  function renderFilters() {
    const categories = [ALL, ...new Set(weeks.flatMap((w) => (w.items || []).map((i) => i.category).filter(Boolean)))];
    $("#filters").replaceChildren(
      ...categories.map((cat) => {
        const b = el("button", { type: "button", class: "chip", "aria-pressed": String(cat === state.category), text: cat });
        b.addEventListener("click", () => {
          state.category = cat;
          renderFilters();
          renderWorks();
        });
        return b;
      })
    );
  }

  const pageUrlOf = (item) => {
    const demo = (item.links || []).find((l) => l.type === "demo");
    return item.preview || (demo && demo.url);
  };

  // 미리보기 영상은 화면에 들어왔을 때만 재생 (playIO)
  function makeVideo(src) {
    const v = el("video", {
      src: toHref(src),
      muted: "",
      playsinline: "",
      loop: "",
      preload: "metadata",
      tabindex: "-1",
      "aria-hidden": "true",
    });
    v.muted = true;
    return v;
  }

  // 카드 미리보기: 영상은 꽉 차게, 썸네일·웹페이지는 흐린 배경 위에 브라우저 창처럼 띄움
  function renderMedia(item) {
    if (item.video) return el("span", { class: "media" }, [makeVideo(item.video)]);
    const pageUrl = pageUrlOf(item);
    if (item.thumbnail || pageUrl) {
      const view = item.thumbnail
        ? el("span", { class: "window-view" }, [el("img", { src: toHref(item.thumbnail), alt: "", loading: "lazy", draggable: "false" })])
        : // 실제 페이지를 4배 크기로 띄운 뒤 1/4로 줄여서 보여줌
          el("span", { class: "window-view page-preview" }, [
            el("iframe", { src: toHref(pageUrl), loading: "lazy", tabindex: "-1", "aria-hidden": "true", title: "" }),
          ]);
      return el("span", { class: "media media-window" }, [
        item.thumbnail && el("img", { class: "backdrop", src: toHref(item.thumbnail), alt: "", loading: "lazy", draggable: "false" }),
        el("span", { class: "window" }, [el("span", { class: "window-bar", "aria-hidden": "true" }, [el("i"), el("i"), el("i")]), view]),
      ]);
    }
    return el("span", { class: "media media-text", "aria-hidden": "true", text: item.title });
  }

  // 작업 하나 = 카드 하나. 누르면 상세 화면
  // 작게 보기에선 옆 카드를 누르면 가운데로, 가운데 카드를 누르면 상세 화면
  function renderTile(item, i, week) {
    const num = pad(i + 1);
    const href = item.video || pageUrlOf(item) || item.thumbnail || "#";
    const tile = el("a", { class: "tile", href: toHref(href), "aria-label": `${num}. ${item.title} — view details` }, [
      el("span", { class: "tile-frame" }, [renderMedia(item), item.category && el("span", { class: "tag", text: item.category })]),
      el("span", { class: "caption", "aria-hidden": "true" }, [
        el("span", { class: "caption-num", text: num }),
        el("span", { class: "caption-title", text: item.title }),
      ]),
    ]);
    tile.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      if (state.compact && i !== active) scrollToEntry(i);
      else openDetail(i);
    });
    return { item, week, num, node: tile, media: tile.querySelector(".media") };
  }

  // 상세 화면 정보 카드 아래쪽의 도구·링크
  function infoParts(item) {
    return [
      item.tools && item.tools.length
        ? el("ul", { class: "tools", "aria-label": "Tools used" }, item.tools.map((t) => el("li", { text: t })))
        : null,
      item.links && item.links.length
        ? el(
            "div",
            { class: "links" },
            item.links.map((l) =>
              el("a", { class: "link", href: toHref(l.url), target: "_blank", rel: "noopener" }, [
                el("span", { class: "ico-text", "aria-hidden": "true", text: LINK_ICONS[l.type] || "↗" }),
                document.createTextNode(l.label || l.url),
              ])
            )
          )
        : null,
    ].filter(Boolean);
  }

  // ── 상세 화면 (참고 사이트의 프로젝트 페이지) ─────────────────
  // 누른 카드가 오른쪽 맨 위 큰 카드로 커지고(FLIP), 왼쪽 제목이 작업 이름으로 바뀜.
  // ⓘ(또는 카드 클릭)를 누르면 카드 속 그림이 사라지고 흰 바탕에 제목·설명이 떠오름.
  // 축소 버튼(또는 Esc·브라우저 뒤로)으로 돌아가면 큰 카드가 목록 속 원래 자리로 줄어듦
  const view = $("#detail-view");
  const infoBtn = $("#info-toggle");
  const linkBtn = $("#open-link");
  const detailState = { open: false, entry: null, index: -1, returnY: 0, pushed: false };

  // first(처음 자리) → 지금 자리로 1.1초 동안 옮겨 오는 애니메이션
  // fromRadius: 처음 자리에서 보이던 모서리 둥글기(px) — 크기가 바뀌는 동안 모서리도 함께 바뀜
  const radiusOf = (node) => parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0;
  function flip(node, first, fromRadius) {
    if (reduceMotion) return;
    const last = node.getBoundingClientRect();
    if (!last.width || !first.width) return;
    const sx = first.width / last.width;
    const sy = first.height / last.height;
    node.animate(
      [
        {
          transformOrigin: "0 0",
          transform: `translate(${first.left - last.left}px,${first.top - last.top}px) scale(${sx},${sy})`,
          // 줄여 보이는 만큼 키워 둬야 눈에 보이는 둥글기가 처음 자리와 같음
          borderRadius: `${fromRadius / sx}px / ${fromRadius / sy}px`,
        },
        { transformOrigin: "0 0", transform: "none", borderRadius: getComputedStyle(node).borderRadius },
      ],
      { duration: 1100, easing: "cubic-bezier(.23,1,.32,1)" }
    );
  }

  // 웹 작업은 실제 페이지를 화면 가득 띄워서 그 안에서 둘러볼 수 있게
  // 휠은 바깥 페이지가 먼저 받고, 카드가 화면에 꽉 차면 그때부터 안쪽 페이지가 직접 스크롤함
  // (안쪽 페이지의 스크롤 애니메이션이 그대로 동작) · 안쪽 맨 위에서 위로 굴리면 다시 바깥으로
  // 안쪽 스크롤바는 숨겨서 스크롤바가 두 개로 보이지 않게 함 (다른 출처라 안을 못 보면 그냥 안에서 스크롤)
  function livePreview(url, title) {
    const frame = el("iframe", { src: toHref(url), title: `${title} — live page`, loading: "lazy" });
    frame.addEventListener("load", () => {
      let doc;
      try {
        doc = frame.contentDocument;
      } catch (_) {}
      const card = frame.closest(".sec-card");
      if (!doc || !doc.head || !card) return;
      doc.head.append(Object.assign(doc.createElement("style"), { textContent: "html{scrollbar-width:none}html::-webkit-scrollbar{display:none}" }));
      const win = frame.contentWindow;
      win.addEventListener(
        "wheel",
        (ev) => {
          const docked = Math.abs(card.getBoundingClientRect().top) <= 2;
          if (docked && (ev.deltaY > 0 || win.scrollY > 0)) return;
          ev.preventDefault();
          ev.stopPropagation();
          if (lenis) window.dispatchEvent(new WheelEvent("wheel", { deltaX: ev.deltaX, deltaY: ev.deltaY, deltaMode: ev.deltaMode, bubbles: true, cancelable: true }));
          else window.scrollBy(ev.deltaX, ev.deltaY);
        },
        { capture: true, passive: false }
      );
    });
    return el("span", { class: "media live" }, [frame]);
  }

  function sectionCard({ title, text, media, extra }) {
    const body = el("p", { class: "sec-text" });
    setWords(body, text, 0);
    const card = el("div", { class: "sec-card" }, [
      el("div", { class: "sec-media" }, [media]),
      el("div", { class: "sec-info" }, [el("h4", { class: "sec-title", text: title }), el("div", { class: "sec-body" }, [body, ...(extra || [])])]),
    ]);
    // 참고 사이트처럼 카드를 눌러도 정보가 켜지고 꺼짐 (링크는 그대로 열림)
    card.addEventListener("click", (e) => !e.target.closest("a") && setDetailInfo(!document.body.classList.contains("is-info")));
    return el("article", { class: "sec" }, [card]);
  }

  function setDetailInfo(on) {
    document.body.classList.toggle("is-info", on);
    infoBtn.setAttribute("aria-pressed", String(on));
    infoBtn.setAttribute("aria-label", on ? "Hide work info" : "Show work info");
  }
  infoBtn.addEventListener("click", () => setDetailInfo(!document.body.classList.contains("is-info")));

  function showDetailHeadline() {
    const { item, week } = detailState.entry;
    swapLine($("#active-title"), item.title);
    swapLine($("#active-sub"), [item.category, weekName(week)].filter(Boolean).join(" · "));
  }

  function openDetail(i, instant) {
    const e = entries[i];
    if (!e || detailState.open) return;
    if (openDropdown) openDropdown.close(false);
    const first = e.node.getBoundingClientRect();
    const firstRadius = radiusOf(e.node);
    Object.assign(detailState, { open: true, entry: e, index: i, returnY: scrollY, pushed: !instant });

    const page = pageUrlOf(e.item);
    const sections = [
      // 첫 카드는 목록 카드의 미리보기를 그대로 옮겨 옴 (영상이 끊기지 않게)
      { title: "Overview", text: e.item.description || e.item.title, media: e.media, extra: infoParts(e.item) },
      page && { title: "Live site", text: "Scroll down to look around the live site.", media: livePreview(page, e.item.title) },
    ].filter(Boolean);
    e.media.style.removeProperty("--py");
    view.replaceChildren(...sections.map(sectionCard));
    view.hidden = false;
    document.body.classList.add("is-detail");
    setDetailInfo(false);
    scrollToY(0, true);
    if (!instant) flip(view.querySelector(".sec-card"), first, firstRadius);

    showDetailHeadline();
    const link = (e.item.links || []).find((l) => l.type === "demo") || (e.item.links || [])[0];
    if (link) {
      linkBtn.href = toHref(link.url);
      linkBtn.setAttribute("aria-label", `${link.label || "Open"} — ${e.item.title}`);
      linkBtn.hidden = false;
    } else linkBtn.hidden = true;
    sizeBtn.setAttribute("aria-label", "Back to list");

    const hash = `#${idOf(sel.year, sel.month, sel.week)}/${e.num}`;
    if (instant) history.replaceState(null, "", hash);
    else history.pushState({ detail: true }, "", hash);
  }

  function closeDetail() {
    if (!detailState.open) return;
    const { entry, returnY } = detailState;
    const hero = view.querySelector(".sec-card");
    const first = hero.getBoundingClientRect();
    const firstRadius = radiusOf(hero);
    entry.node.querySelector(".tile-frame").prepend(entry.media);
    detailState.open = false;
    document.body.classList.remove("is-detail");
    setDetailInfo(false);
    view.hidden = true;
    view.replaceChildren();
    scrollToY(returnY, true);
    flip(entry.node, first, firstRadius);
    // 나머지 카드는 서서히 다시 나타남
    if (!reduceMotion) entries.forEach((x) => x !== entry && x.node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 250, easing: "ease", fill: "backwards" }));
    sizeBtn.setAttribute("aria-label", state.compact ? "Expand works" : "Shrink works");
    history.replaceState(null, "", "#" + idOf(sel.year, sel.month, sel.week));
    active = -1;
    track();
  }
  // 상세 화면에 들어올 때 기록을 하나 쌓았으면 뒤로 가기로 닫음 (브라우저 뒤로 버튼과 같은 길)
  function leaveDetail() {
    if (!detailState.open) return;
    if (detailState.pushed) history.back();
    else closeDetail();
  }
  addEventListener("popstate", () => detailState.open && closeDetail());
  // 뒤로 가기 때 브라우저가 스크롤을 멋대로 되돌리지 않게 (목록 위치는 closeDetail이 맞춤)
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  // ── 연·월·주 선택 ────────────────────────────────────────
  // 셋을 각각 따로 바꿀 수 있고, 바꾸는 즉시 그 주의 작업으로 화면이 바뀜 (기록이 없는 주는 빈 화면)
  // 처음엔 주소의 #2026-11-w1 (뒤에 /03이 붙으면 그 작업의 상세 화면), 없으면 기록이 있는 최신 주
  const idOf = (y, m, w) => `${y}-${pad(m)}-w${w}`;
  const latest = weeks[0] || { year: new Date().getFullYear(), month: new Date().getMonth() + 1, week: 1 };
  const sel = { year: latest.year, month: latest.month, week: latest.week };
  const hash = /^#(\d{4})-(\d{1,2})-w(\d)(?:\/(\d+))?$/.exec(decodeURIComponent(location.hash));
  if (hash) Object.assign(sel, { year: +hash[1], month: Math.min(12, Math.max(1, +hash[2])), week: Math.min(5, Math.max(1, +hash[3])) });

  // 연도는 기록이 있는 해부터 올해까지, 주는 한 달 최대 5주
  const thisYear = new Date().getFullYear();
  const dataYears = weeks.map((w) => w.year);
  const YEARS = [];
  for (let y = Math.max(thisYear, ...dataYears); y >= Math.min(thisYear, ...dataYears); y--) YEARS.push(y);
  const WEEKS = [1, 2, 3, 4, 5];

  const weekOf = (y, m, n) => weeks.find((w) => w.year === y && w.month === m && w.week === n);
  const periodName = () => `${sel.year}.${pad(sel.month)} · Week ${sel.week}`;
  // 검색·분류에 맞는 작업이 하나라도 있는지 (목록에서 진하게 보여 줄 값)
  const hasWorks = (fn) => weeks.some((w) => fn(w) && (w.items || []).some(matches));

  // ── 커스텀 드롭다운 ──────────────────────────────────────
  // 흰 알약 버튼을 누르면 아래로 목록 카드가 펼쳐짐. 마우스·키보드(↑↓←→ Home End Enter Esc Tab) 모두 지원
  const CHEVRON = '<svg class="lucide lucide-chevron-down" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const CHECK = '<svg class="lucide lucide-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  let openDropdown = null;

  function dropdown(label, key, options) {
    const id = `dd-${key}`;
    const current = options.find((o) => o.value === sel[key]);
    const trigger = el(
      "button",
      { type: "button", class: "dd-trigger", id: `${id}-btn`, "aria-haspopup": "listbox", "aria-expanded": "false", "aria-controls": `${id}-list`, "aria-label": `${label}: ${current ? current.text : ""}` },
      [el("span", { class: "dd-value", text: current ? current.text : "" })]
    );
    trigger.insertAdjacentHTML("beforeend", CHEVRON);

    const items = options.map(({ value, text, has }) => {
      const on = value === sel[key];
      const o = el("li", { role: "option", class: `dd-option${has ? " has-works" : ""}`, "aria-selected": String(on), tabindex: "-1", "data-value": String(value) }, [
        el("span", { text }),
      ]);
      if (on) o.insertAdjacentHTML("beforeend", CHECK);
      o.addEventListener("click", () => choose(value));
      return o;
    });
    const list = el("ul", { class: "dd-list", id: `${id}-list`, role: "listbox", "aria-label": label, "data-lenis-prevent": "" }, items);
    const wrap = el("div", { class: `dd dd-${key}` }, [trigger, list]);

    const api = { wrap, close };
    function open() {
      if (openDropdown && openDropdown !== api) openDropdown.close(false);
      openDropdown = api;
      wrap.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      const i = Math.max(0, items.findIndex((o) => o.getAttribute("aria-selected") === "true"));
      items[i].focus({ preventScroll: true });
    }
    function close(refocus) {
      wrap.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (openDropdown === api) openDropdown = null;
      if (refocus) trigger.focus({ preventScroll: true });
    }
    function choose(value) {
      close(value === sel[key]);
      if (value === sel[key]) return;
      sel[key] = value;
      renderWorks();
      // 다시 그린 같은 드롭다운 버튼으로 포커스를 돌려 둠
      document.getElementById(`${id}-btn`)?.focus({ preventScroll: true });
    }

    trigger.addEventListener("click", () => (wrap.classList.contains("is-open") ? close(false) : open()));
    trigger.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      open();
    });
    list.addEventListener("keydown", (e) => {
      const i = items.indexOf(document.activeElement);
      // 월 목록은 격자라 ↑↓는 한 줄(열 수)만큼 이동 — 열 수는 화면 폭에 따라 CSS가 정함
      const cols = getComputedStyle(list).gridTemplateColumns.split(" ").length;
      const move ={ ArrowDown: cols, ArrowUp: -cols, ArrowRight: 1, ArrowLeft: -1, Home: -items.length, End: items.length }[e.key];
      if (move !== undefined) {
        e.preventDefault();
        e.stopPropagation();
        items[Math.max(0, Math.min(items.length - 1, i + move))].focus({ preventScroll: true });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        choose(Number(items[i].dataset.value));
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      } else if (e.key === "Tab") close(false);
    });
    return wrap;
  }
  // 바깥을 누르면 닫힘
  document.addEventListener("pointerdown", (e) => {
    if (openDropdown && !openDropdown.wrap.contains(e.target)) openDropdown.close(false);
  });

  function renderPeriods() {
    const { year, month } = sel;
    $("#periods").replaceChildren(
      dropdown("Year", "year", YEARS.map((y) => ({ value: y, text: `${y}년`, has: hasWorks((w) => w.year === y) }))),
      dropdown(
        "Month",
        "month",
        Array.from({ length: 12 }, (_, i) => ({ value: i + 1, text: `${i + 1}월`, has: hasWorks((w) => w.year === year && w.month === i + 1) }))
      ),
      dropdown(
        "Week",
        "week",
        WEEKS.map((n) => ({ value: n, text: `${n}주차`, has: hasWorks((w) => w.year === year && w.month === month && w.week === n) }))
      )
    );
  }

  const works = $("#works");

  // 선택한 연·월·주의 작업을 검색·분류로 걸러서 카드로
  function renderWorks() {
    const filtering = state.query || state.category !== ALL;
    renderPeriods();
    history.replaceState(null, "", "#" + idOf(sel.year, sel.month, sel.week));

    const w = weekOf(sel.year, sel.month, sel.week);
    const all = w ? w.items || [] : [];
    const items = all.filter(matches);

    // 결과 개수는 검색·필터 중일 때만 표시
    $("#result-count").textContent = filtering ? `${items.length} result${items.length === 1 ? "" : "s"} in this week` : "";
    $("#week-meta").textContent = w ? [w.period, w.summary].filter(Boolean).join(" — ") : `No study log for ${periodName()} yet.`;

    // 빈 화면일 때 왼쪽 제목에 보여 줄 문구
    emptyText = all.length
      ? ["Nothing matches.", "Try another word or category."]
      : ["Nothing here yet.", periodName()];

    works.setAttribute("aria-label", periodName());
    const list = items.map((item, i) => renderTile(item, i, w));
    const emptyNote = all.length ? "Nothing matches your search." : "No works for this week yet.";
    works.replaceChildren(...(list.length ? list.map((e) => e.node) : [el("p", { class: "empty", text: emptyNote })]));
    setEntries(list);
  }

  // ── 지금 보는 작업 ───────────────────────────────────────
  // 화면 가운데에 가장 가까운 카드
  let entries = [];
  let active = -1;
  let emptyText = ["", ""];

  // 한 줄 글자를 마스크 안에서 위로 밀어내고 새 글자를 아래에서 올림
  function swapLine(line, text) {
    const old = line.querySelector(".line-text:not(.is-leaving)");
    if (old && old.textContent === text) return;
    if (old) {
      if (reduceMotion) old.remove();
      else {
        old.classList.add("is-leaving");
        old.addEventListener("animationend", () => old.remove(), { once: true });
      }
    }
    if (text) line.append(el("span", { class: "line-text", text }));
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    const e = entries[i];
    swapLine($("#active-title"), e ? e.item.title : emptyText[0]);
    swapLine($("#active-sub"), e ? [e.item.category, weekName(e.week)].filter(Boolean).join(" · ") : emptyText[1]);
    $("#counter").textContent = e ? `${e.num} / ${pad(entries.length)}` : "";
    entries.forEach((x) => x.node.classList.toggle("is-active", x === e));
    $("#dots")
      .querySelectorAll(".dot")
      .forEach((d, k) => (k === i ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
  }

  // 화면에 들어온 카드는 떠오르고, 영상은 보일 때만 재생
  const playIO = new IntersectionObserver(
    (list) =>
      list.forEach(({ target, isIntersecting }) => {
        if (reduceMotion) return;
        if (isIntersecting) target.play().catch(() => {});
        else target.pause();
      }),
    { threshold: 0.2 }
  );
  let revealReady = false;
  const revealIO = new IntersectionObserver(
    (list) => {
      let k = 0;
      list.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.style.setProperty("--d", k++);
        target.classList.add("is-in");
        revealIO.unobserve(target);
      });
    },
    { rootMargin: "0px 0px -6% 0px" }
  );
  function observeTiles() {
    revealIO.disconnect();
    entries.forEach((e) => e.node.classList.contains("tile") && revealIO.observe(e.node));
  }

  function setEntries(list) {
    entries = list;
    active = -1;
    playIO.disconnect();
    works.querySelectorAll("video").forEach((v) => playIO.observe(v));
    if (revealReady) observeTiles();
    const tiles = list.filter((e) => e.node.classList.contains("tile"));
    $("#dots").replaceChildren(
      ...tiles.map((e, i) => {
        const d = el("button", { type: "button", class: "dot", "aria-label": `${e.num}. ${e.item.title}` });
        d.addEventListener("click", () => scrollToEntry(i));
        return d;
      })
    );
    scrollToY(0, true);
    setActive(0);
  }

  // ── 크게 ↔ 작게 ──────────────────────────────────────────
  // 카드 너비가 바뀌는 동안(CSS 1.2초) 보던 카드를 매 프레임 화면 가운데에 붙잡아 둠
  const sizeBtn = $("#size-toggle");
  let holdRaf = 0;
  function setCompact(on) {
    if (state.compact === on) return;
    const keep = active;
    state.compact = on;
    document.body.classList.toggle("is-compact", on);
    sizeBtn.setAttribute("aria-pressed", String(on));
    sizeBtn.setAttribute("aria-label", on ? "Expand works" : "Shrink works");
    const until = performance.now() + (reduceMotion ? 0 : 1300);
    cancelAnimationFrame(holdRaf);
    const hold = () => {
      const node = entries[keep] && entries[keep].node;
      if (node) {
        const r = node.getBoundingClientRect();
        scrollToY(scrollY + r.top + r.height / 2 - innerHeight / 2, true);
      }
      holdRaf = performance.now() < until ? requestAnimationFrame(hold) : 0;
    };
    hold();
  }
  // 상세 화면에선 참고 사이트의 "Back to Home"처럼 목록으로 돌아가는 버튼
  sizeBtn.addEventListener("click", () => (detailState.open ? leaveDetail() : setCompact(!state.compact)));

  // ── 마그네틱 버튼 ─────────────────────────────────────────
  // 참고 사이트와 같은 값: 버튼 가운데에서 40px 안에 커서가 오면 (거리 × 0.15 × 가까울수록 줄어드는 비율)만큼
  // 커서 쪽으로 끌려가고, 벗어나면 더 단단한 스프링으로 제자리에 돌아옴
  const MAGNET = {
    strength: 0.15,
    radius: 40,
    follow: { k: 150, c: 12, m: 0.1 },
    release: { k: 160, c: 26, m: 0.14 },
  };
  function magnet(btn) {
    const s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, spring: MAGNET.follow, inside: false, raf: 0, t: 0 };
    const frame = (now) => {
      const dt = Math.min(0.05, (now - s.t) / 1000);
      s.t = now;
      // 잘게 나눠 적분해야 스프링이 튀지 않음
      const n = Math.max(1, Math.ceil(dt / 0.004));
      const h = dt / n;
      const { k, c, m } = s.spring;
      for (let i = 0; i < n; i++) {
        s.vx += ((-k * (s.x - s.tx) - c * s.vx) / m) * h;
        s.vy += ((-k * (s.y - s.ty) - c * s.vy) / m) * h;
        s.x += s.vx * h;
        s.y += s.vy * h;
      }
      const settled = Math.hypot(s.x - s.tx, s.y - s.ty) < 0.01 && Math.hypot(s.vx, s.vy) < 0.01;
      if (settled) Object.assign(s, { x: s.tx, y: s.ty, vx: 0, vy: 0 });
      btn.style.setProperty("--mx", `${s.x.toFixed(2)}px`);
      btn.style.setProperty("--my", `${s.y.toFixed(2)}px`);
      s.raf = settled ? 0 : requestAnimationFrame(frame);
    };
    const to = (x, y, spring) => {
      Object.assign(s, { tx: x, ty: y, spring });
      if (!s.raf) {
        s.t = performance.now();
        s.raf = requestAnimationFrame(frame);
      }
    };
    const release = () => {
      if (!s.inside) return;
      s.inside = false;
      to(0, 0, MAGNET.release);
    };
    addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy);
      if (d >= MAGNET.radius || !r.width) return release();
      const t = 1 - d / MAGNET.radius;
      const f = t * t * (3 - 2 * t);
      s.inside = true;
      to(dx * MAGNET.strength * f, dy * MAGNET.strength * f, MAGNET.follow);
    });
    document.documentElement.addEventListener("mouseleave", release);
  }
  if (!reduceMotion && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll(".icon-btn").forEach(magnet);
    followCursorY(sizeBtn);
  }

  // 축소 버튼은 커서의 세로 위치를 따라 위아래로 움직임 (참고 사이트와 같이 매 프레임 남은 거리의 8%씩, 화면 위아래 여백 안에서)
  function followCursorY(btn) {
    const EDGE = 24;
    let pointerY = innerHeight / 2;
    let y = 0;
    let raf = 0;
    const frame = () => {
      raf = 0;
      // 휴대폰 폭에선 오른쪽 아래에 고정
      if (innerWidth <= 860) {
        y = 0;
        btn.style.setProperty("--fy", "0px");
        return;
      }
      const half = btn.offsetHeight / 2;
      const target = Math.min(Math.max(pointerY, EDGE + half), innerHeight - EDGE - half) - innerHeight / 2;
      const d = target - y;
      y = Math.abs(d) <= 0.1 ? target : y + d * 0.08;
      btn.style.setProperty("--fy", `${y.toFixed(2)}px`);
      if (Math.abs(d) > 0.1) raf = requestAnimationFrame(frame);
    };
    const kick = () => raf || (raf = requestAnimationFrame(frame));
    addEventListener(
      "mousemove",
      (e) => {
        pointerY = e.clientY;
        kick();
      },
      { passive: true }
    );
    addEventListener("resize", kick);
  }

  // ── 스크롤 ───────────────────────────────────────────────
  // Lenis로 부드럽게 (없거나 동작 줄이기 설정이면 기본 스크롤)
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.09 });
    const raf = (t) => {
      lenis.raf(t);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
  function scrollToY(y, immediate) {
    // 화면 내용이 막 바뀐 뒤엔 Lenis가 아는 문서 높이가 예전 값이라 먼저 다시 잼
    if (lenis && immediate) lenis.resize();
    if (lenis) lenis.scrollTo(y, { immediate: !!immediate, force: true });
    else scrollTo({ top: y, behavior: immediate || reduceMotion ? "auto" : "smooth" });
  }
  // 카드 가운데가 화면 가운데에 오도록
  function scrollToEntry(i) {
    const node = entries[i] && entries[i].node;
    if (!node) return;
    const r = node.getBoundingClientRect();
    scrollToY(scrollY + r.top + r.height / 2 - innerHeight / 2);
  }
  const step = (dir) => scrollToEntry(Math.max(0, Math.min(active + dir, entries.length - 1)));

  // 가운데에 가장 가까운 카드를 찾고, 카드 속 그림은 스크롤보다 조금 느리게 움직임(패럴랙스)
  // 위치를 모두 먼저 읽은 다음에 씀 — 읽기·쓰기를 번갈아 하면 카드마다 레이아웃을 다시 계산해서 버벅임
  function track() {
    if (!entries.length || detailState.open) return;
    const mid = innerHeight / 2;
    const rects = entries.map((e) => e.node.getBoundingClientRect());
    let best = 0;
    let bestD = Infinity;
    rects.forEach((r, i) => {
      const c = r.top + r.height / 2;
      const d = Math.abs(c - mid);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
      const e = entries[i];
      if (reduceMotion || !e.media || r.bottom < 0 || r.top > innerHeight) return;
      const py = `${(((c - mid) / innerHeight) * -7).toFixed(1)}%`;
      if (e.py !== py) {
        e.py = py;
        e.media.style.setProperty("--py", py);
      }
    });
    setActive(best);
  }
  // 작게 보기에선 스크롤이 멈추면 가장 가까운 카드를 가운데로 맞춤
  // 상세 화면(풀페이지)에선 가장 가까운 섹션이 화면을 꽉 채우도록 맞춤
  let snapTimer = 0;
  function snap() {
    if (detailState.open) {
      const secs = [...view.querySelectorAll(".sec")];
      if (secs.length < 2) return;
      const top = secs.map((s) => s.getBoundingClientRect().top).reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a));
      if (Math.abs(top) > 1) scrollToY(scrollY + top);
      return;
    }
    const node = entries[active] && entries[active].node;
    if (!state.compact || holdRaf || !node) return;
    const r = node.getBoundingClientRect();
    if (Math.abs(r.top + r.height / 2 - innerHeight / 2) > 1) scrollToEntry(active);
  }
  let ticking = false;
  const onScroll = () => {
    clearTimeout(snapTimer);
    snapTimer = setTimeout(snap, 180);
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      track();
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);

  // 로고는 상세 화면이면 목록으로, 목록이면 첫 카드로
  $("#site-title").addEventListener("click", (e) => {
    e.preventDefault();
    if (detailState.open) leaveDetail();
    else scrollToY(0);
  });

  const search = $("#search");
  search.addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderWorks();
  });

  // "/" 키로 검색창 바로가기, 검색창에서 Esc로 검색어 지우기, ←/→로 카드 이동
  document.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    // 상세 화면에선 Esc로 정보 → 목록 순서로 닫음
    if (detailState.open) {
      if (e.key !== "Escape") return;
      if (document.body.classList.contains("is-info")) setDetailInfo(false);
      else leaveDetail();
      return;
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      search.focus();
    } else if (e.key === "Escape" && document.activeElement === search && search.value) {
      search.value = "";
      state.query = "";
      renderWorks();
    } else if (!typing && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    }
  });

  renderHeader();
  renderFilters();
  renderWorks();
  // 주소에 /03처럼 작업 번호가 있으면 그 작업의 상세 화면으로 바로 시작
  if (hash && hash[4]) openDetail(+hash[4] - 1, true);
  // 글꼴이 준비된 뒤(최대 1초 대기) 등장 애니메이션 시작 — 대체 글꼴로 먼저 지나가 버리지 않게
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1000))]).then(() => {
    document.body.classList.replace("is-loading", "is-entering");
    // 제목 줄을 다시 그려서 마스크 등장이 보이게
    document.querySelectorAll(".line-text").forEach((n) => n.remove());
    if (detailState.open) showDetailHeadline();
    else {
      const a = active;
      active = -1;
      setActive(Math.max(0, a));
    }
    setTimeout(() => {
      revealReady = true;
      observeTiles();
    }, 350);
    setTimeout(() => document.body.classList.remove("is-entering"), 2600);
  });
})();

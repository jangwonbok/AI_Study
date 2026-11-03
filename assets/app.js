(function () {
  const data = window.STUDY_DATA || { weeks: [] };
  const weeks = data.weeks || [];
  const state = { query: "", category: "전체" };

  const $ = (sel) => document.querySelector(sel);
  const LINK_ICONS = { demo: "▶", video: "◉", doc: "▤", external: "↗" };

  // 한글 폴더명이 들어간 상대경로도 안전하게 열리도록 인코딩
  const toHref = (url) => (/^[a-z]+:/i.test(url) || url.startsWith("#") ? url : encodeURI(url));

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
    if (state.category !== "전체" && item.category !== state.category) return false;
    if (!state.query) return true;
    const haystack = [item.title, item.category, item.description, ...(item.tools || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(state.query);
  }

  function renderHeader() {
    document.title = data.title || document.title;
    $("#site-title").textContent = data.title || "";
    $("#site-desc").textContent = data.description || "";
    if (data.repo) $("#repo-link").href = data.repo;
    else $("#repo-link").remove();

    const itemCount = weeks.reduce((n, w) => n + (w.items || []).length, 0);
    const linkCount = weeks.reduce(
      (n, w) => n + (w.items || []).reduce((m, i) => m + (i.links || []).length, 0),
      0
    );
    const stats = $("#stats");
    [["진행 월", groupByMonth(weeks).length], ["진행 주차", weeks.length], ["학습 항목", itemCount], ["관련 자료", linkCount]].forEach(([label, value]) =>
      stats.append(el("div", {}, [el("dt", { text: label }), el("dd", { text: String(value) })]))
    );
  }

  function renderFilters() {
    const categories = ["전체", ...new Set(weeks.flatMap((w) => (w.items || []).map((i) => i.category).filter(Boolean)))];
    const box = $("#filters");
    box.replaceChildren(
      ...categories.map((cat) => {
        const b = el("button", { type: "button", class: "chip", "aria-pressed": String(cat === state.category), text: cat });
        b.addEventListener("click", () => {
          state.category = cat;
          renderFilters();
          renderWeeks();
        });
        return b;
      })
    );
  }

  function renderCard(item) {
    const body = el("div", { class: "card-body" }, [
      item.category && el("span", { class: "category", text: item.category }),
      el("h4", { text: item.title }),
      item.description && el("p", { text: item.description }),
      item.tools && item.tools.length
        ? el("ul", { class: "tools", "aria-label": "사용 도구" }, item.tools.map((t) => el("li", { text: t })))
        : null,
      item.links && item.links.length
        ? el(
            "div",
            { class: "links" },
            item.links.map((l) =>
              el("a", { class: "link", href: toHref(l.url), target: "_blank", rel: "noopener" }, [
                el("span", { class: "ico", "aria-hidden": "true", text: LINK_ICONS[l.type] || "↗" }),
                document.createTextNode(l.label || l.url),
              ])
            )
          )
        : null,
    ]);
    const video = item.video
      ? el("video", { src: toHref(item.video), controls: "", preload: "metadata", playsinline: "" })
      : null;
    return el("article", { class: "card" }, [video, body]);
  }

  // "2026-11" → "2026년 11월"
  function monthLabel(key) {
    const [y, m] = String(key || "").split("-");
    return y && m ? `${y}년 ${Number(m)}월` : "기타";
  }

  // weeks 배열 순서를 유지하면서 month 값으로 묶기
  function groupByMonth(list) {
    const groups = new Map();
    list.forEach((w) => {
      const key = w.month || "etc";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(w);
    });
    return [...groups.entries()].map(([key, ws]) => ({ key, weeks: ws }));
  }

  function renderWeek(week, items) {
    return el("section", { class: "week", id: week.id }, [
      el("div", { class: "week-head" }, [
        el("h3", { text: week.label }),
        week.period && el("span", { class: "period", text: week.period }),
        el("a", { class: "anchor", href: "#" + week.id, title: "이 주차 링크", text: "# 링크" }),
      ]),
      week.summary && el("p", { class: "week-summary", text: week.summary }),
      items.length
        ? el("div", { class: "items" }, items.map(renderCard))
        : el("p", { class: "empty", text: "아직 등록된 항목이 없습니다." }),
    ]);
  }

  function renderWeeks() {
    const container = $("#weeks");
    const nav = $("#week-nav");
    container.replaceChildren();
    nav.replaceChildren();
    const filtering = state.query || state.category !== "전체";

    groupByMonth(weeks).forEach((group) => {
      const visible = group.weeks
        .map((w) => ({ week: w, items: (w.items || []).filter(matches) }))
        .filter((v) => v.items.length || !filtering);
      if (!visible.length) return;

      const monthId = "m-" + group.key;
      const itemTotal = visible.reduce((n, v) => n + v.items.length, 0);
      const monthInfo = (data.months || {})[group.key] || {};

      nav.append(
        el("li", { class: "nav-month" }, [
          el("a", { class: "month-link", href: "#" + monthId, "data-week": monthId, text: monthLabel(group.key) }),
          el(
            "ol",
            {},
            visible.map((v) =>
              el("li", {}, [
                el("a", { href: "#" + v.week.id, "data-week": v.week.id }, [
                  document.createTextNode(v.week.label),
                  el("span", { class: "count", text: String(v.items.length) }),
                ]),
              ])
            )
          ),
        ])
      );

      container.append(
        el("section", { class: "month", id: monthId }, [
          el("div", { class: "month-head" }, [
            el("h2", { text: monthLabel(group.key) }),
            el("span", { class: "meta", text: `${visible.length}개 주차 · ${itemTotal}개 항목` }),
          ]),
          monthInfo.summary && el("p", { class: "month-summary", text: monthInfo.summary }),
          ...visible.map((v) => renderWeek(v.week, v.items)),
        ])
      );
    });

    if (!container.children.length) {
      container.append(el("p", { class: "empty", text: "조건에 맞는 항목이 없습니다." }));
    }
    observeWeeks();
  }

  // 스크롤 위치에 맞춰 왼쪽 주차 메뉴 강조
  let observer;
  function observeWeeks() {
    if (observer) observer.disconnect();
    if (!("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const ids = [entry.target.id, entry.target.closest(".month")?.id];
          document.querySelectorAll(".week-nav a").forEach((a) =>
            a.classList.toggle("is-current", ids.includes(a.dataset.week))
          );
        });
      },
      { rootMargin: "-90px 0px -60% 0px" }
    );
    document.querySelectorAll(".week").forEach((s) => observer.observe(s));
  }

  $("#search").addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderWeeks();
  });

  renderHeader();
  renderFilters();
  renderWeeks();
})();

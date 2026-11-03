(function () {
  const data = window.STUDY_DATA || { weeks: [] };
  const pad = (n) => String(n).padStart(2, "0");

  // year/month/week 값으로 ID·이름을 만들고 최신순으로 정렬
  const weeks = (data.weeks || [])
    .map((w) => ({
      ...w,
      monthKey: `${w.year}-${pad(w.month)}`,
      id: w.id || `${w.year}-${pad(w.month)}-w${w.week}`,
      label: w.label || `${w.week}주차`,
    }))
    .sort((a, b) => b.year - a.year || b.month - a.month || b.week - a.week);

  const state = { query: "", category: "전체" };

  const $ = (sel) => document.querySelector(sel);
  const LINK_ICONS = { demo: "▶", video: "◉", doc: "▤", external: "↗" };

  // 한글 파일명이 들어간 상대경로도 안전하게 열리도록 인코딩
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

  // 순서를 유지하면서 keyFn 값으로 묶기
  function groupBy(list, keyFn) {
    const groups = new Map();
    list.forEach((x) => {
      const key = keyFn(x);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(x);
    });
    return [...groups.entries()];
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
    const monthCount = new Set(weeks.map((w) => w.monthKey)).size;
    const stats = $("#stats");
    [["진행 월", monthCount], ["진행 주차", weeks.length], ["학습 항목", itemCount]].forEach(([label, value]) =>
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
      el("h5", { text: item.title }),
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

  function renderWeek(week, items) {
    return el("section", { class: "week", id: week.id }, [
      el("div", { class: "week-head" }, [
        el("h4", { text: week.label }),
        week.period && el("span", { class: "period", text: week.period }),
        el("a", { class: "anchor", href: "#" + week.id, title: "이 주차 링크", text: "# 링크" }),
      ]),
      week.summary && el("p", { class: "week-summary", text: week.summary }),
      items.length
        ? el("div", { class: "items" }, items.map(renderCard))
        : el("p", { class: "empty", text: "아직 등록된 항목이 없습니다." }),
    ]);
  }

  const navLink = (cls, id, text, count) =>
    el("a", { class: cls, href: "#" + id, "data-target": id }, [
      document.createTextNode(text),
      count != null && el("span", { class: "count", text: String(count) }),
    ]);

  function renderWeeks() {
    const container = $("#weeks");
    const nav = $("#week-nav");
    container.replaceChildren();
    nav.replaceChildren();
    const filtering = state.query || state.category !== "전체";

    const visible = weeks
      .map((w) => ({ week: w, items: (w.items || []).filter(matches) }))
      .filter((v) => v.items.length || !filtering);

    groupBy(visible, (v) => v.week.year).forEach(([year, yearWeeks]) => {
      const yearId = `y-${year}`;
      const monthGroups = groupBy(yearWeeks, (v) => v.week.month);
      const yearNav = el("ol");
      const yearSection = el("section", { class: "year", id: yearId }, [
        el("div", { class: "year-head" }, [el("h2", { text: `${year}년` })]),
      ]);

      monthGroups.forEach(([month, monthWeeks]) => {
        const monthKey = `${year}-${pad(month)}`;
        const monthId = `m-${monthKey}`;
        const itemTotal = monthWeeks.reduce((n, v) => n + v.items.length, 0);
        const monthInfo = (data.months || {})[monthKey] || {};

        yearNav.append(
          el("li", { class: "nav-month" }, [
            navLink("month-link", monthId, `${month}월`),
            el("ol", {}, monthWeeks.map((v) => el("li", {}, [navLink("", v.week.id, v.week.label, v.items.length)]))),
          ])
        );

        yearSection.append(
          el("section", { class: "month", id: monthId }, [
            el("div", { class: "month-head" }, [
              el("h3", { text: `${month}월` }),
              el("span", { class: "meta", text: `${monthWeeks.length}개 주차 · ${itemTotal}개 항목` }),
            ]),
            monthInfo.summary && el("p", { class: "month-summary", text: monthInfo.summary }),
            ...monthWeeks.map((v) => renderWeek(v.week, v.items)),
          ])
        );
      });

      nav.append(el("li", { class: "nav-year" }, [navLink("year-link", yearId, `${year}년`), yearNav]));
      container.append(yearSection);
    });

    if (!container.children.length) {
      container.append(el("p", { class: "empty", text: "조건에 맞는 항목이 없습니다." }));
    }
    observeWeeks();
  }

  // 스크롤 위치에 맞춰 왼쪽 메뉴의 연도·월·주차 강조
  let observer;
  function observeWeeks() {
    if (observer) observer.disconnect();
    if (!("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const t = entry.target;
          const ids = [t.id, t.closest(".month")?.id, t.closest(".year")?.id];
          document.querySelectorAll(".week-nav a").forEach((a) =>
            a.classList.toggle("is-current", ids.includes(a.dataset.target))
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

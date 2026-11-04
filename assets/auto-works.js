/*
 * 작업물 자동 찾기
 * ------------------------------------------------------------
 * GitHub에 올라간 파일 목록을 받아 window.WORK_FILES에 담은 뒤 app.js를 불러옴.
 * app.js는 이 목록에서 study-data.js에 아직 없는 작업물을 찾아 리스트에 자동으로 붙임.
 * 목록을 못 받아오면(오프라인·요청 한도 초과 등) study-data.js에 적은 것만 보여줌.
 */
(function () {
  const CACHE_KEY = "work-files";
  const CACHE_MS = 5 * 60 * 1000;
  const repo = ((window.STUDY_DATA || {}).repo || "").match(/github\.com\/([^/]+)\/([^/#?]+)/);

  function start(files) {
    window.WORK_FILES = files || [];
    const s = document.createElement("script");
    s.src = "assets/app.js";
    document.body.append(s);
  }

  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.at < CACHE_MS) return start(cached.files);
  } catch (_) {}

  if (!repo) return start();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  fetch(`https://api.github.com/repos/${repo[1]}/${repo[2].replace(/\.git$/, "")}/git/trees/main?recursive=1`, { signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((json) => {
      const files = (json.tree || []).filter((t) => t.type === "blob" && /^\d{4}\/\d{2}\/week\d+\//.test(t.path)).map((t) => t.path);
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), files }));
      } catch (_) {}
      start(files);
    })
    .catch(() => start())
    .finally(() => clearTimeout(timer));
})();

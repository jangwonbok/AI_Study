/*
 * AI 스터디 기록 데이터
 * ------------------------------------------------------------
 * 매주 이 파일만 수정하면 홈페이지가 자동으로 갱신됩니다.
 * 새 주차는 weeks 배열의 "맨 위"에 추가하세요. (최신 주차가 먼저 보입니다)
 * 홈페이지에서는 연도 → 월 → 주차 순으로 자동으로 묶여 보입니다.
 *
 * 작업물 폴더 규칙:  연도/월/week번호/   예) 2026/11/week1/, 2026/12/week1/, 2027/01/week1/
 *
 * 자동 추가: 연도/월/weekN/폴더/ 에 영상(mp4)·웹페이지(html)·사이트(하위폴더/index.html)를 넣고 푸시하면
 *           여기에 적지 않아도 홈페이지 리스트에 자동으로 붙습니다. (제목은 파일 이름, 분류는 폴더 이름)
 *           제목·설명을 다듬고 싶을 때만 아래에 직접 적으세요. 적은 내용이 우선합니다.
 *
 * 주차(week) 항목
 *   year     : 연도                                       예) 2026
 *   month    : 월                                         예) 11
 *   week     : 몇 주차                                    예) 2
 *   period   : 기간 (선택)                                예) "2026.11.09 – 11.15"
 *   summary  : 이번 주 한 줄 요약 (선택)
 *   items    : 학습 항목 목록
 *   (화면 이름 "Week 2"와 링크 ID "2026-11-w2"는 자동으로 만들어집니다)
 *
 * 학습 항목(item)
 *   title       : 항목 제목
 *   category    : 분류 (예: Web, Video, Image, Prompt, Automation …)
 *   description : 설명
 *   tools       : 사용한 AI 도구 목록 (선택)
 *   video       : 카드에서 바로 재생할 영상 경로 (선택)
 *   thumbnail   : 카드 상단에 보여줄 이미지 경로 (선택, 영상·웹페이지보다 우선)
 *   preview     : 카드 상단에 미리보기로 띄울 웹페이지 경로 (선택)
 *                 비워두면 type이 "demo"인 링크의 페이지를 자동으로 미리보기합니다.
 *   links       : 관련 링크 목록 (선택)
 *                 type: "demo"(결과물) | "video"(영상) | "doc"(문서/자료) | "external"(외부 사이트)
 *
 * 경로는 이 index.html 기준 상대경로(예: "2026/11/week1/Main/portfolio/index.html")
 * 또는 https:// 로 시작하는 외부 주소를 쓰면 됩니다.
 */
window.STUDY_DATA = {
  title: "AI Study",
  description: "Things I learn and make with AI, week by week.",
  repo: "https://github.com/jangwonbok/AI_Study",

  // 월 제목 옆에 붙일 한 줄 요약 (선택)  "연도-월": { summary: "..." }
  months: {
    "2026-11": { summary: "" }
  },

  weeks: [
    {
      year: 2026,
      month: 11,
      week: 1,
      period: "2026.11.02 – 11.08",
      summary: "Built a portfolio website, a project detail page and intro films with AI.",
      items: [
        {
          title: "Portfolio website built with AI",
          category: "Web",
          description:
            "Described the design direction and content to AI and built a one-screen, slide-style portfolio site (Muplus1), with an intro film for each project.",
          tools: [],
          thumbnail: "2026/11/week1/Main/portfolio/thumb.jpg",
          links: [
            { label: "View site", url: "2026/11/week1/Main/portfolio/index.html", type: "demo" }
          ]
        },
        {
          title: "Open2U detail page",
          category: "Detail",
          description:
            "A project detail page for SK telecom's Open2U purchase contract system, built with AI — hero, overview and key screens.",
          tools: [],
          links: [
            { label: "View page", url: "2026/11/week1/Detail/open2u-works-detail.html", type: "demo" }
          ]
        },
        {
          title: "KT Communis detail page",
          category: "Detail",
          description: "A project detail page for KT Communis, built with AI.",
          tools: [],
          links: [
            { label: "View page", url: "2026/11/week1/Detail/kt-communis-detail.html", type: "demo" }
          ]
        },
        {
          title: "KT MyCare detail page",
          category: "Detail",
          description: "A project detail page for KT MyCare, built with AI.",
          tools: [],
          links: [
            { label: "View page", url: "2026/11/week1/Detail/kt-mycare-detail.html", type: "demo" }
          ]
        },
        {
          title: "Open2U hero",
          category: "Video",
          description: "The hero film for the Open2U detail page, made with AI.",
          tools: [],
          video: "2026/11/week1/Video/open2u-hero.mp4",
          links: [
            { label: "Open video", url: "2026/11/week1/Video/open2u-hero.mp4", type: "video" },
            { label: "Embed snippet", url: "2026/11/week1/Video/open2u-visual-snippet.html", type: "doc" }
          ]
        },
        {
          title: "GS Caltex hero",
          category: "Video",
          description: "The main hero film for GS Caltex, made with AI.",
          tools: [],
          video: "2026/11/week1/Video/gs-caltex-hero.mp4",
          links: [
            { label: "Open video", url: "2026/11/week1/Video/gs-caltex-hero.mp4", type: "video" }
          ]
        },
        {
          title: "MyCare intro",
          category: "Video",
          description: "A short film introducing the MyCare service, made with AI.",
          tools: [],
          video: "2026/11/week1/Video/vdo_works_kt_mycare_912.mp4",
          links: [
            { label: "Open video", url: "2026/11/week1/Video/vdo_works_kt_mycare_912.mp4", type: "video" }
          ]
        },
        {
          title: "GS Caltex intro",
          category: "Video",
          description: "A short film introducing GS Caltex, made with AI.",
          tools: [],
          video: "2026/11/week1/Video/vdo_works_gscaltex_912.mp4",
          links: [
            { label: "Open video", url: "2026/11/week1/Video/vdo_works_gscaltex_912.mp4", type: "video" }
          ]
        },
        {
          title: "Catch On cinematic",
          category: "Video",
          description: "A cinematic film for Catch On, made with AI.",
          tools: [],
          video: "2026/11/week1/Video/catchon_cinematic_1920x1080.mp4",
          links: [
            { label: "Open video", url: "2026/11/week1/Video/catchon_cinematic_1920x1080.mp4", type: "video" }
          ]
        },
        {
          title: "Catch On hero",
          category: "Video",
          description: "The main hero film for Catch On, made with AI.",
          tools: [],
          video: "2026/11/week1/Video/catchon_hero_1920x1080.mp4",
          links: [
            { label: "Open video", url: "2026/11/week1/Video/catchon_hero_1920x1080.mp4", type: "video" }
          ]
        },
        {
          title: "Chainz hero",
          category: "Video",
          description: "The main hero film for Chainz, made with AI.",
          tools: [],
          video: "2026/11/week1/Video/chainz_hero_1920x1080.mp4",
          links: [
            { label: "Open video", url: "2026/11/week1/Video/chainz_hero_1920x1080.mp4", type: "video" }
          ]
        },
        {
          title: "KT Communis hero",
          category: "Video",
          description: "The main hero film for KT Communis, made with AI.",
          tools: [],
          video: "2026/11/week1/Video/kt_communis_hero_1920x1080_1.mp4",
          links: [
            { label: "Open video", url: "2026/11/week1/Video/kt_communis_hero_1920x1080_1.mp4", type: "video" }
          ]
        }
      ]
    }
  ]
};

/*
 * AI 스터디 기록 데이터
 * ------------------------------------------------------------
 * 매주 이 파일만 수정하면 홈페이지가 자동으로 갱신됩니다.
 * 새 주차는 weeks 배열의 "맨 위"에 추가하세요. (최신 주차가 먼저 보입니다)
 * 홈페이지에서는 연도 → 월 → 주차 순으로 자동으로 묶여 보입니다.
 *
 * 작업물 폴더 규칙:  연도/월/week번호/   예) 2026/11/week1/, 2026/12/week1/, 2027/01/week1/
 *
 * 주차(week) 항목
 *   year     : 연도                                       예) 2026
 *   month    : 월                                         예) 11
 *   week     : 몇 주차                                    예) 2
 *   period   : 기간 (선택)                                예) "2026.11.09 – 11.15"
 *   summary  : 이번 주 한 줄 요약 (선택)
 *   items    : 학습 항목 목록
 *   (화면 이름 "2주차"와 링크 ID "2026-11-w2"는 자동으로 만들어집니다)
 *
 * 학습 항목(item)
 *   title       : 항목 제목
 *   category    : 분류 (예: 웹 제작, 영상, 이미지, 프롬프트, 자동화 …)
 *   description : 설명
 *   tools       : 사용한 AI 도구 목록 (선택)
 *   video       : 카드에서 바로 재생할 영상 경로 (선택)
 *   links       : 관련 링크 목록 (선택)
 *                 type: "demo"(결과물) | "video"(영상) | "doc"(문서/자료) | "external"(외부 사이트)
 *
 * 경로는 이 index.html 기준 상대경로(예: "2026/11/week1/Main/portfolio/index.html")
 * 또는 https:// 로 시작하는 외부 주소를 쓰면 됩니다.
 */
window.STUDY_DATA = {
  title: "AI 스터디 아카이브",
  description: "AI 스터디에서 매주 배우고 만든 것들을 연도·월·주차별로 정리합니다.",
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
      summary: "AI로 포트폴리오 웹사이트와 소개 영상을 만들어 봤습니다.",
      items: [
        {
          title: "AI로 포트폴리오 웹사이트 만들기",
          category: "웹 제작",
          description:
            "AI에게 디자인 방향과 콘텐츠를 설명해 한 화면 슬라이드형 포트폴리오 사이트(뮤플러스1호)를 만들었습니다. 프로젝트별 소개 영상도 함께 넣었습니다.",
          tools: [],
          links: [
            { label: "결과물 보기", url: "2026/11/week1/Main/portfolio/index.html", type: "demo" }
          ]
        },
        {
          title: "AI 영상 제작 – 마이케어 소개 영상",
          category: "영상",
          description: "서비스(마이케어)를 소개하는 짧은 영상을 AI로 만들었습니다.",
          tools: [],
          video: "2026/11/week1/Video/vdo_works_kt_mycare_912.mp4",
          links: [
            { label: "영상 파일 열기", url: "2026/11/week1/Video/vdo_works_kt_mycare_912.mp4", type: "video" }
          ]
        }
      ]
    }
  ]
};

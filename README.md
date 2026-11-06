# AI 스터디 아카이브

AI 스터디에서 매주 배우고 만든 것들을 연도 · 월 · 주차별로 정리하는 저장소입니다.

- 홈페이지: https://jangwonbok.github.io/AI_Study/ (GitHub Pages 활성화 후 접속 가능)

## 연도 · 월 · 주차별 목록

### 2026년

#### 11월

| 주차 | 학습 항목 | 자료 |
| --- | --- | --- |
| 1주차 | AI로 포트폴리오 웹사이트 만들기 | [결과물](2026/11/week1/Main/portfolio/index.html) |
| 1주차 | AI 대시보드 – Monitoring & Insights | [결과물](2026/11/week1/Main/index.html) |
| 1주차 | AI 대시보드 – Plurals 워크스페이스 | [결과물](2026/11/week1/Main/plurals_dashboard.html) |
| 1주차 | AI 상세페이지 – Open2U | [결과물](2026/11/week1/Detail/open2u-works-detail.html) |
| 1주차 | AI 상세페이지 – KT 커뮤니스 | [결과물](2026/11/week1/Detail/kt-communis-detail.html) |
| 1주차 | AI 상세페이지 – KT 마이케어 | [결과물](2026/11/week1/Detail/kt-mycare-detail.html) |
| 1주차 | AI About 페이지 – LUMO v6 | [결과물](2026/11/week1/About/bigbang-about-v6/bigbang-about/index.html) |
| 1주차 | AI About 페이지 – LUMO v2 | [결과물](2026/11/week1/About/bigbang-about-v2/bigbang-about/index.html) |
| 1주차 | AI 영상 제작 – Open2U 히어로 영상 | [영상](2026/11/week1/Video/open2u-hero.mp4) |
| 1주차 | AI 영상 제작 – GS칼텍스 히어로 영상 | [영상](2026/11/week1/Video/gs-caltex-hero.mp4) |
| 1주차 | AI 영상 제작 – 마이케어 소개 영상 | [영상](2026/11/week1/Video/vdo_works_kt_mycare_912.mp4) |
| 1주차 | AI 영상 제작 – GS칼텍스 소개 영상 | [영상](2026/11/week1/Video/vdo_works_gscaltex_912.mp4) |
| 1주차 | AI 영상 제작 – 캐치온 시네마틱 영상 | [영상](2026/11/week1/Video/catchon_cinematic_1920x1080.mp4) |
| 1주차 | AI 영상 제작 – 캐치온 히어로 영상 | [영상](2026/11/week1/Video/catchon_hero_1920x1080.mp4) |
| 1주차 | AI 영상 제작 – 체인즈 히어로 영상 | [영상](2026/11/week1/Video/chainz_hero_1920x1080.mp4) |
| 1주차 | AI 영상 제작 – KT 커뮤니스 히어로 영상 | [영상](2026/11/week1/Video/kt_communis_hero_1920x1080_1.mp4) |

## 폴더 구조

작업물은 `연도/월/week번호/` 폴더에 넣습니다. (링크가 깨지지 않도록 폴더명은 영문·숫자로 씁니다)

```
index.html              홈페이지 (수정할 필요 없음)
assets/                 홈페이지 스타일·스크립트
data/study-data.js      ← 매주 이 파일만 수정
2026/                   2026년
  11/                     11월
    week1/                  1주차
      Main/portfolio/
      Video/
    week2/                  2주차
  12/                     12월
    week1/
2027/
  01/
    week1/
```

월 폴더는 정렬이 잘 되도록 두 자리(`01`, `02` … `12`)로 씁니다.

## 작업물 자동 추가

`연도/월/weekN/폴더/` 에 파일을 넣고 푸시만 하면, 홈페이지가 GitHub의 파일 목록을 읽어 리스트에 자동으로 카드를 붙입니다.
(`study-data.js` 에 이미 적은 파일은 중복으로 추가하지 않습니다)

| 넣는 위치 | 만들어지는 카드 |
| --- | --- |
| `폴더/파일.mp4` (webm·mov) | 영상 카드 |
| `폴더/파일.html` | 웹페이지 카드 (페이지 미리보기) |
| `폴더/하위폴더/index.html` | 사이트 카드 (같은 폴더의 `thumb.jpg`·`png`·`webp`가 있으면 썸네일로 사용) |

- 분류는 폴더 이름을 그대로 씁니다 (`Main` → `Web`, `Detail`, `Video` …).
- 제목은 파일 이름으로 만듭니다. 예) `kt-communis-detail.html` → `Kt Communis Detail`
- 제목·설명을 직접 다듬고 싶으면 아래처럼 `study-data.js` 에 적으면 됩니다. 적은 내용이 우선합니다.
- 로컬에서 열면 GitHub에 이미 푸시된 파일만 자동으로 잡힙니다.

## 매주 업데이트하는 방법 (직접 적기)

1. 주차 폴더(예: `2026/11/week2/`)를 만들고 결과물을 넣습니다.
2. `data/study-data.js` 의 `weeks` 배열에 아래 블록을 추가합니다.
   연도·월·주차 숫자만 적으면 홈페이지에서 자동으로 최신순으로 정렬되고 묶입니다.

   ```js
   {
     year: 2026,
     month: 11,
     week: 2,
     period: "2026.11.09 – 11.15",
     summary: "이번 주 한 줄 요약",
     items: [
       {
         title: "학습 항목 제목",
         category: "웹 제작",          // 분류 필터에 자동으로 추가됩니다
         description: "무엇을 배우고 만들었는지",
         tools: ["사용한 AI 도구"],
         // video: "2026/11/week2/Video/sample.mp4",   // 카드에서 바로 재생 (선택)
         // thumbnail: "2026/11/week2/Main/thumb.jpg", // 썸네일 이미지 (선택, 없으면 demo 링크 페이지를 자동 미리보기)
         links: [
           { label: "결과물 보기", url: "2026/11/week2/Main/index.html", type: "demo" },
           { label: "참고 자료", url: "https://example.com", type: "external" }
         ]
       }
     ]
   },
   ```

   링크 `type`: `demo`(결과물) · `video`(영상) · `doc`(문서) · `external`(외부 사이트)

   월 제목 옆에 요약을 붙이고 싶으면 `months` 에 `"2026-11": { summary: "..." }` 를 적습니다.

3. 위 README 표에도 한 줄 추가합니다.
4. 커밋 후 푸시합니다.

   ```bash
   git add .
   git commit -m "2026년 11월 2주차 스터디 내용 추가"
   git push
   ```

## GitHub Pages 켜기 (최초 1회)

저장소 **Settings → Pages → Build and deployment** 에서
Source: `Deploy from a branch`, Branch: `main` / `(root)` 선택 후 저장하면
몇 분 뒤 위 홈페이지 주소로 접속할 수 있습니다.

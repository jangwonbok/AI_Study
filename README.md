# AI 스터디 아카이브

AI 스터디에서 매주 배우고 만든 것들을 월별·주차별·항목별로 정리하는 저장소입니다.

- 홈페이지: https://jangwonbok.github.io/AI_Study/ (GitHub Pages 활성화 후 접속 가능)

## 월별 · 주차별 목록

### 2026년 11월

| 주차 | 학습 항목 | 자료 |
| --- | --- | --- |
| 1주차 | AI로 포트폴리오 웹사이트 만들기 | [결과물](2026-11/week1/Main/portfolio/index.html) |
| 1주차 | AI 영상 제작 – 마이케어 소개 영상 | [영상](2026-11/week1/Video/vdo_works_kt_mycare_912.mp4) |

## 폴더 구조

작업물은 `연-월/week번호/` 폴더에 넣습니다. (링크가 깨지지 않도록 폴더명은 영문·숫자로 씁니다)

```
index.html              홈페이지 (수정할 필요 없음)
assets/                 홈페이지 스타일·스크립트
data/study-data.js      ← 매주 이 파일만 수정
2026-11/                2026년 11월
  week1/                  1주차
    Main/portfolio/
    Video/
  week2/                  2주차
2026-12/                2026년 12월
  week1/
```

## 매주 업데이트하는 방법

1. 해당 월 폴더 아래에 주차 폴더(예: `2026-11/week2/`)를 만들고 결과물을 넣습니다.
   새 달이 시작되면 `2026-12/week1/` 처럼 월 폴더부터 만듭니다.
2. `data/study-data.js` 의 `weeks` 배열 **맨 위**에 아래 블록을 추가합니다.
   `month` 값이 같은 주차끼리 홈페이지에서 한 달로 묶입니다.

   ```js
   {
     month: "2026-11",
     id: "2026-11-w2",
     label: "11월 2주차",
     period: "2026.11.09 – 11.15",
     summary: "이번 주 한 줄 요약",
     items: [
       {
         title: "학습 항목 제목",
         category: "웹 제작",          // 분류 필터에 자동으로 추가됩니다
         description: "무엇을 배우고 만들었는지",
         tools: ["사용한 AI 도구"],
         // video: "2026-11/week2/Video/sample.mp4",   // 카드에서 바로 재생 (선택)
         links: [
           { label: "결과물 보기", url: "2026-11/week2/Main/index.html", type: "demo" },
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
   git commit -m "11월 2주차 스터디 내용 추가"
   git push
   ```

## GitHub Pages 켜기 (최초 1회)

저장소 **Settings → Pages → Build and deployment** 에서
Source: `Deploy from a branch`, Branch: `main` / `(root)` 선택 후 저장하면
몇 분 뒤 위 홈페이지 주소로 접속할 수 있습니다.

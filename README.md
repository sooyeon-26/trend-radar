# Trend Radar

RSS 뉴스 제목을 매일 수집하고, 자주 등장하는 키워드와 함께 언급된 단어를 탐색하는 트렌드 대시보드입니다.

뉴스 목록을 그대로 보여주는 대신 카테고리별 언급량, 전일 대비 변화, 동시 등장 관계를 계산했습니다. 대시보드에서 신호를 선택하면 관련 기사까지 이어서 확인할 수 있습니다.

## 만든 이유

실시간 검색어는 순위는 보여주지만 왜 해당 단어가 떠올랐는지는 설명하기 어렵습니다. Trend Radar는 키워드의 크기뿐 아니라 변화 추이, 연관 키워드, 근거 기사를 한 흐름으로 확인하기 위해 만들었습니다.

## 현재 동작하는 범위

- RSS 기사 수집과 URL 기준 중복 제거
- `kiwipiepy`를 이용한 한국어 명사 추출과 불용어 정리
- 정치·경제·IT·사회 등 9개 카테고리별 키워드 집계
- 1일·3일·7일 기준 상위 키워드와 날짜별 언급량 조회
- 같은 기사에 등장한 키워드 관계망과 관련 기사 조회
- 전일 대비 증가율과 기사·연관어 수를 이용한 신호 분류
- 수집 성공 여부, 기사 수, 실패한 RSS 수 확인
- GitHub Actions를 이용한 매일 09:17 KST 수집

## 데이터 흐름

```text
RSS 피드
  → Python 크롤러
  → 키워드 추출·카테고리 집계
  → MongoDB (articles, trends, pipeline_runs)
  → Express API
  → React 대시보드
```

## 기술 선택

| 구분 | 사용 기술 | 맡은 역할 |
| --- | --- | --- |
| Frontend | React, Vite, Recharts | 필터, 차트, 관계망, 신호 상세 화면 |
| Backend | Express, Mongoose | 트렌드 집계와 조회 API |
| Crawler | Python, feedparser, kiwipiepy | RSS 수집과 한국어 키워드 추출 |
| Storage | MongoDB | 기사, 일별 집계, 파이프라인 상태 저장 |
| Automation | GitHub Actions | 정해진 시각의 수집과 결과 검증 |

## 구현하면서 신경 쓴 점

### 결과의 근거를 남기기

신호 점수만 제시하지 않고 관련 기사와 연관 키워드를 함께 노출했습니다. 수집 작업도 `pipeline_runs`에 시작·완료 시각과 처리 건수를 기록해 데이터가 언제 갱신됐는지 확인할 수 있습니다.

### 형태소 분석 실패에 대비하기

기본 추출기는 `kiwipiepy`입니다. 패키지를 사용할 수 없는 환경에서는 정규식 기반 추출로 전환해 전체 수집 작업이 중단되지 않도록 했습니다.

### 집계와 화면 계산을 나누기

기사와 일별 키워드 수는 크롤러에서 저장하고, 기간·카테고리별 조합과 신호 요약은 API와 프론트엔드에서 담당합니다. 수집 로직을 다시 실행하지 않고도 화면 필터를 바꿀 수 있습니다.

## 로컬 실행

요구 환경은 Node.js 20.19 이상 또는 22.12 이상, Python 3.12, MongoDB입니다.

```bash
# API
cd backend
cp .env.example .env
npm install
npm run dev

# crawler (새 터미널)
cd crawler
python -m venv .venv
# Windows PowerShell
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python crawler.py

# frontend (새 터미널)
cd frontend
npm install
npm run dev
```

프론트엔드는 개발 환경에서 `http://localhost:4000` API를 사용합니다. 주소가 다르면 `VITE_API_ORIGIN`을 설정합니다.

## 확인 명령

```bash
cd frontend
npm run lint
npm test
npm run build
```

## 주요 API

```text
GET /api/pipeline/status
GET /api/trends/galaxies?days=1|3|7
GET /api/trends/top?days=1|3|7|all&category=society
GET /api/trends/:keyword?category=society
GET /api/trends/related/:keyword?category=society
GET /api/trends/articles/:keyword?category=society
GET /api/trends/rising?category=society
GET /api/trends/network?days=1|3|7&category=society
```

## 현재 한계

- RSS 제목만 분석하므로 기사 본문 전체의 맥락을 반영하지 않습니다.
- 신호 점수는 언급량과 연관 데이터에 가중치를 준 규칙 기반 지표이며, 미래 유행을 예측하는 모델은 아닙니다.
- 언론사의 제목 작성 방식과 RSS 제공 상태에 따라 카테고리별 데이터 양이 달라질 수 있습니다.

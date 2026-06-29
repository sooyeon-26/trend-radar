# Trend Radar

RSS 뉴스 데이터를 수집해 오늘의 주요 키워드, 급상승 신호, 키워드 관계망, 근거 기사를 한 화면에서 확인하는 트렌드 분석 대시보드입니다.

단순히 기사 제목을 나열하는 서비스가 아니라, 매일 수집되는 뉴스 제목에서 의미 있는 명사를 추출하고 카테고리별 언급량과 동시 등장 관계를 계산해 “지금 어떤 이슈가 강하게 떠오르는지”를 시각적으로 탐색할 수 있도록 만들었습니다.

## 핵심 기능

- RSS 기반 뉴스 기사 수집 및 MongoDB 저장
- 한국어 형태소 분석 기반 키워드 추출
- 오늘, 3일, 7일 단위 인기 키워드 조회
- 정치, 경제, IT, 사회, 세계, 문화, 스포츠, 과학, 건강 카테고리 분류
- 키워드별 날짜별 언급량 추이 그래프
- 같은 기사에서 함께 등장한 키워드 관계망 구성
- 급상승 키워드 및 전일 대비 증가율 계산
- 관련 기사 리스트 제공으로 분석 근거 확인
- 수집 파이프라인 상태, 기사 수, 키워드 수, 실패 RSS 수 모니터링
- GitHub Actions 기반 매일 자동 크롤링 및 수집 결과 검증

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| Frontend | React, Vite, Axios, Recharts |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| Crawler | Python, feedparser, pymongo, kiwipiepy |
| Automation | GitHub Actions |

## 아키텍처

```txt
RSS feeds
  -> Python crawler
  -> keyword extraction / stopword filtering
  -> MongoDB articles, trends, pipeline_runs
  -> Express API
  -> React dashboard
```

```txt
trend-radar/
├─ backend/    Express API, MongoDB models, trend aggregation routes
├─ crawler/    RSS crawler, keyword extraction, daily trend persistence
├─ frontend/   React dashboard, charts, signal summary UI
└─ .github/    scheduled crawler workflow
```

## 주요 구현 포인트

### 1. 뉴스 수집 파이프라인

`crawler/crawler.py`는 여러 RSS 피드를 순회하며 기사 제목, 링크, 출처, 카테고리, 게시일을 수집합니다. 중복 URL은 제거하고 최근 7일 데이터만 유지해 대시보드가 최신 흐름에 집중하도록 구성했습니다.

### 2. 한국어 키워드 추출

`kiwipiepy`를 사용할 수 있으면 형태소 분석으로 명사 후보를 추출하고, 사용할 수 없는 환경에서는 정규식 기반 추출로 폴백합니다. 언론사명, 도메인, 조사, 일반 동사형 표현, 의미 약한 뉴스 표현은 불용어와 후처리 규칙으로 제거합니다.

### 3. 트렌드 집계와 관계망

키워드는 날짜와 카테고리 단위로 집계해 `trends` 컬렉션에 저장합니다. API에서는 카테고리별 TOP 키워드, 키워드 추이, 급상승 키워드, 관련 키워드, 관련 기사, 전체 관계망을 제공하며, 같은 기사에 함께 등장한 키워드를 연결해 이슈 간 관계를 볼 수 있게 했습니다.

### 4. 데이터 신뢰도 표시

`pipeline_runs` 컬렉션에 수집 시작/완료 시각, 수집 기사 수, 키워드 수, 카테고리 수, RSS 실패 수, 에러 메시지를 저장합니다. 프론트엔드는 이 상태를 주기적으로 조회해 데이터가 정상적으로 갱신되고 있는지 보여줍니다.

### 5. 포트폴리오용 시각화

프론트엔드는 키워드 순위표에 그치지 않고, 카테고리를 은하처럼 배치한 “트렌드 유니버스” 인터페이스와 신호 요약 카드, 언급량 추이 그래프를 제공합니다. 사용자는 카테고리와 기간을 바꾸며 이슈의 규모, 확산, 근거 기사를 함께 탐색할 수 있습니다.

## API

```txt
GET /api/pipeline/status

GET /api/trends/galaxies?days=1|3|7
GET /api/trends/universe?days=1|3|7
GET /api/trends/top?days=1|3|7|all&category=society
GET /api/trends/:keyword?category=society
GET /api/trends/related/:keyword?category=society
GET /api/trends/articles/:keyword?category=society
GET /api/trends/rising?category=society
GET /api/trends/clusters?category=society
GET /api/trends/network?days=1|3|7&category=society
```

## 데이터 모델

### Article

- `title`: 기사 제목
- `url`: 기사 URL, 중복 방지 기준
- `source`: RSS 출처
- `category`, `categoryLabel`: 분야 구분
- `publishedAt`: `YYYY-MM-DD` 형식 게시일
- `keywords`: 추출된 키워드 목록

### Trend

- `keyword`: 키워드
- `date`: 집계 날짜
- `category`, `categoryLabel`: 분야 구분
- `count`: 해당 날짜/분야의 언급량

### PipelineRun

- `status`: `collecting`, `completed`, `failed`, `empty`
- `startedAt`, `completedAt`, `lastCollectedAt`
- `articleCount`, `keywordCount`, `categoryCount`, `sourceCount`, `failedSourceCount`
- `errorMessage`

## 실행 방법

### 1. Backend

```bash
cd backend
npm install
npm run dev
```

`backend/.env`:

```txt
MONGO_URI=your_mongodb_connection_string
MONGO_DB=trend-radar
PORT=4000
```

### 2. Crawler

```bash
cd crawler
python3 -m venv venv
source venv/bin/activate
pip install requests beautifulsoup4 pymongo python-dotenv feedparser certifi kiwipiepy
python crawler.py
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

기본 접속 주소:

```txt
http://localhost:5173
```

## 자동 크롤링

`.github/workflows/crawl.yml`은 매일 09:17 KST에 크롤러를 실행합니다. 실행 후 당일 기사 수와 트렌드 수를 검증하고 GitHub Actions Summary에 결과를 남깁니다.

GitHub 저장소 Secrets에 아래 값을 등록해야 합니다.

```txt
MONGO_URI
MONGO_DB
```

`MONGO_DB`를 생략하면 `test` DB를 사용합니다.

## 포트폴리오 설명 예시

> Trend Radar는 RSS 뉴스 데이터를 매일 자동 수집하고, 한국어 키워드 추출과 동시 등장 분석을 통해 현재 이슈의 강도와 연결 관계를 보여주는 트렌드 분석 대시보드입니다. Python 크롤러, MongoDB, Express API, React 시각화를 직접 연결해 데이터 수집부터 분석, 시각화, 운영 상태 모니터링까지 하나의 파이프라인으로 구현했습니다.

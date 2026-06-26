# Trend Radar

RSS 뉴스 데이터를 수집해 인기 키워드, 키워드 관계망, 관련 기사 근거를 보여주는 트렌드 분석 대시보드입니다.

## 주요 기능

- RSS 뉴스 제목 수집 및 MongoDB 저장
- 인기 키워드 TOP 10 조회
- 기간 필터: 오늘, 3일, 7일, 전체
- 키워드별 날짜별 언급량 그래프
- 같은 기사에서 함께 등장한 키워드 관계망
- 관련 기사 리스트로 분석 근거 확인
- 급상승 키워드 비교
- 정치, 경제, IT, 사회 클러스터 분류
- GitHub Actions 기반 매일 자동 크롤링 워크플로우

## 구조

```txt
trend-radar/
├─ backend/   Express.js + Mongoose API
├─ crawler/   Python RSS crawler
├─ frontend/  React + Recharts dashboard
└─ .github/   scheduled crawler workflow
```

## 데이터 흐름

```txt
RSS feeds
→ Python crawler
→ MongoDB articles / trends
→ Express API
→ React dashboard
```

## API

```txt
GET /api/trends/top?days=1|3|7|all
GET /api/trends/:keyword
GET /api/trends/related/:keyword
GET /api/trends/articles/:keyword
GET /api/trends/rising
GET /api/trends/clusters
```

## 실행 방법

### Backend

```bash
cd backend
npm install
npm run dev
```

`backend/.env`:

```txt
MONGO_URI=your_mongodb_connection_string
PORT=4000
```

### Crawler

```bash
cd crawler
python3 -m venv venv
source venv/bin/activate
pip install requests beautifulsoup4 pymongo python-dotenv feedparser certifi kiwipiepy
python crawler.py
```

### Frontend

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

`.github/workflows/crawl.yml`은 매일 00:00 UTC에 크롤러를 실행합니다.

GitHub 저장소 Secrets에 아래 값을 등록해야 합니다.

```txt
MONGO_URI
MONGO_DB
```

`MONGO_DB`를 생략하면 `test` DB를 사용합니다.

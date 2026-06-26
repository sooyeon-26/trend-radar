import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import feedparser
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

try:
    from kiwipiepy import Kiwi
except ImportError:
    Kiwi = None

load_dotenv("../backend/.env")

mongo_uri = os.getenv("MONGO_URI")
KST = ZoneInfo("Asia/Seoul")


def get_db():
    if not mongo_uri:
        raise SystemExit(
            "MONGO_URI 환경변수가 비어 있습니다. "
            "GitHub Actions Secrets에 MONGO_URI를 등록해야 합니다."
        )

    client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
    return client[os.getenv("MONGO_DB", "test")]


def utc_now():
    return datetime.now(timezone.utc)


def get_source_count():
    return sum(
        len(rss_urls)
        for category_config in CATEGORIES.values()
        for rss_urls in category_config["feeds"].values()
    )


def start_pipeline_run(db, source_count):
    result = db.pipeline_runs.insert_one(
        {
            "status": "collecting",
            "startedAt": utc_now(),
            "completedAt": None,
            "lastCollectedAt": None,
            "articleCount": 0,
            "keywordCount": 0,
            "categoryCount": 0,
            "sourceCount": source_count,
            "failedSourceCount": 0,
            "errorMessage": None,
        }
    )

    return result.inserted_id


def finish_pipeline_run(
    db,
    pipeline_run_id,
    status,
    article_count,
    keyword_count,
    category_count,
    source_count,
    failed_source_count,
    error_message=None,
):
    completed_at = utc_now()

    db.pipeline_runs.update_one(
        {"_id": pipeline_run_id},
        {
            "$set": {
                "status": status,
                "completedAt": completed_at,
                "lastCollectedAt": completed_at,
                "articleCount": article_count,
                "keywordCount": keyword_count,
                "categoryCount": category_count,
                "sourceCount": source_count,
                "failedSourceCount": failed_source_count,
                "errorMessage": error_message,
            }
        },
    )


def mark_latest_pipeline_failed(error):
    try:
        db = get_db()
        completed_at = utc_now()
        latest_run = db.pipeline_runs.find_one(
            {"status": "collecting"}, sort=[("startedAt", -1)]
        )

        if latest_run:
            db.pipeline_runs.update_one(
                {"_id": latest_run["_id"]},
                {
                    "$set": {
                        "status": "failed",
                        "completedAt": completed_at,
                        "failedSourceCount": latest_run.get("failedSourceCount", 0),
                        "errorMessage": str(error),
                    }
                },
            )
    except Exception as update_error:
        print(f"파이프라인 실패 상태 저장 실패: {update_error}")

CATEGORIES = {
    "society": {
        "label": "사회",
        "feeds": {
            "yonhap": [
                "https://www.yna.co.kr/rss/news.xml",
            ],
            "sbs": [
                "https://news.sbs.co.kr/news/newsflashRssFeed.do?plink=RSSREADER",
            ],
            "jtbc": [
                "https://fs.jtbc.co.kr/RSS/newsflash.xml",
            ],
            "chosun": [
                "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml",
            ],
        },
    },
    "politics": {
        "label": "정치",
        "feeds": {
            "google_news": [
                "https://news.google.com/rss/headlines/section/topic/NATION?hl=ko&gl=KR&ceid=KR:ko",
            ],
        },
    },
    "economy": {
        "label": "경제",
        "feeds": {
            "google_news": [
                "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko",
            ],
            "mk": [
                "https://www.mk.co.kr/rss/30000001/",
                "https://www.mk.co.kr/rss/30100041/",
            ],
        },
    },
    "technology": {
        "label": "IT",
        "feeds": {
            "google_news": [
                "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko",
            ],
            "etnews": [
                "https://rss.etnews.com/Section902.xml",
            ],
        },
    },
    "world": {
        "label": "세계",
        "feeds": {
            "google_news": [
                "https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko",
            ],
        },
    },
    "culture": {
        "label": "문화",
        "feeds": {
            "google_news": [
                "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko",
            ],
        },
    },
    "sports": {
        "label": "스포츠",
        "feeds": {
            "google_news": [
                "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=ko&gl=KR&ceid=KR:ko",
            ],
        },
    },
    "science": {
        "label": "과학",
        "feeds": {
            "google_news": [
                "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=ko&gl=KR&ceid=KR:ko",
            ],
        },
    },
    "health": {
        "label": "건강",
        "feeds": {
            "google_news": [
                "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=ko&gl=KR&ceid=KR:ko",
            ],
        },
    },
}

STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "오늘",
    "단독",
    "속보",
    "종합",
    "기자",
    "뉴스",
    "대한",
    "관련",
    "이번",
    "우리",
    "정부",
    "한국",
    "기준",
    "지난",
    "올해",
    "내년",
    "오늘의",
    "속보입니다",
    "마치고",
    "출국한",
    "일정",
    "닷새",
    "1년",
    "2년",
    "3년",
    "10년",
    "오전",
    "오후",
    "무슨",
    "왜",
    "따르면",
    "com",
    "co",
    "kr",
    "net",
    "www",
    "daum",
    "nate",
    "chosun",
    "Chosunbiz",
    "연합뉴스",
    "연합뉴스TV",
    "조선일보",
    "조선비즈",
    "한국경제",
    "매일경제",
    "한겨레",
    "경향신문",
    "동아일보",
    "머니투데이",
    "아시아경제",
    "파이낸셜뉴스",
    "헬스조선",
    "지디넷코리아",
    "이투데이",
    "데일리안",
    "MBC",
    "KBS",
    "SBS",
    "JTBC",
    "YTN",
    "MBN",
    "채널A",
    "TV조선",
    "서울신문",
    "국민일보",
    "세계일보",
    "문화일보",
    "중앙일보",
    "한국일보",
    "서울경제",
    "헤럴드경제",
    "이데일리",
    "뉴스1",
    "뉴시스",
    "노컷뉴스",
    "프레시안",
    "오마이뉴스",
    "미디어오늘",
    "전자신문",
    "블로터",
    "ZDNet",
    "ZDNetKorea",
    "지디넷",
    "아이뉴스24",
    "디지털데일리",
    "테크M",
    "코인데스크",
    "토큰포스트",
    "연합인포맥스",
    "비즈워치",
    "더벨",
    "인베스트조선",
    "스포츠경향",
    "스포츠조선",
    "마이데일리",
    "스타뉴스",
    "starnews",
    "korea.com",
    "v.daum.net",
    "tokenpost",
    "TokenPost",
    "Chosunbiz",
    "데일리한국",
    "헬로디디",
    "발표",
    "발생",
    "공개",
    "출시",
    "전망",
    "논란",
    "확인",
    "추진",
    "검토",
    "예정",
    "진행",
}

PARTICLE_SUFFIXES = (
    "으로부터",
    "에게서",
    "에서는",
    "에서",
    "에게",
    "으로",
    "라고",
    "이라며",
    "라며",
    "이며",
    "이고",
    "인데",
    "에는",
    "부터",
    "까지",
    "보다",
    "처럼",
    "만큼",
    "조차",
    "마저",
    "이나",
    "거나",
    "하고",
    "와",
    "과",
    "은",
    "는",
    "이",
    "가",
    "을",
    "를",
    "에",
    "의",
    "도",
    "만",
    "로",
)

VERB_OR_ENDING_SUFFIXES = (
    "했습니다",
    "합니다",
    "했다",
    "한다",
    "됐다",
    "된다",
    "했다가",
    "한다며",
    "된다며",
    "했다고",
    "한다고",
    "됐다고",
    "된다고",
    "하며",
    "하면서",
    "하고",
    "하는",
    "되는",
    "했다는",
    "한다는",
    "된다는",
    "밝혔다",
    "밝혀",
    "발표했다",
    "공개했다",
    "출시했다",
    "전했다",
    "말했다",
    "보인다",
    "나왔다",
    "올랐다",
    "내렸다",
    "급락",
    "급등",
)

DOMAIN_PATTERN = re.compile(
    r"^(?:[a-z0-9-]+\.)+(?:com|net|co\.kr|kr|org|io)$",
    re.IGNORECASE,
)
DOMAIN_IN_TEXT_PATTERN = re.compile(
    r"\b(?:[a-z0-9-]+\.)+(?:com|net|co\.kr|kr|org|io)\b",
    re.IGNORECASE,
)
SOURCE_HINT_PATTERN = re.compile(
    r"(?:일보|신문|비즈|투데이|데일리|타임스|경향|헤럴드|"
    r"연합|인포맥스|포스트|스타뉴스|starnews|chosun|daum|nate|tokenpost|zdnet)",
    re.IGNORECASE,
)
SOURCE_PHRASES = tuple(
    sorted(
        {
            "연합뉴스TV",
            "연합뉴스",
            "조선일보",
            "조선비즈",
            "Chosunbiz",
            "한국경제",
            "매일경제",
            "한겨레",
            "경향신문",
            "동아일보",
            "머니투데이",
            "아시아경제",
            "파이낸셜뉴스",
            "헬스조선",
            "지디넷코리아",
            "이투데이",
            "데일리안",
            "서울신문",
            "국민일보",
            "세계일보",
            "문화일보",
            "중앙일보",
            "한국일보",
            "서울경제",
            "헤럴드경제",
            "이데일리",
            "뉴스1",
            "뉴시스",
            "노컷뉴스",
            "프레시안",
            "오마이뉴스",
            "미디어오늘",
            "전자신문",
            "ZDNetKorea",
            "ZDNet",
            "지디넷",
            "아이뉴스24",
            "디지털데일리",
            "테크M",
            "코인데스크",
            "토큰포스트",
            "연합인포맥스",
            "비즈워치",
            "더벨",
            "인베스트조선",
            "스포츠경향",
            "스포츠조선",
            "마이데일리",
            "스타뉴스",
            "starnews",
            "korea.com",
            "v.daum.net",
            "tokenpost",
            "TokenPost",
            "데일리한국",
            "헬로디디",
        },
        key=len,
        reverse=True,
    )
)

NOUN_TAGS = {"NNG", "NNP", "NNB", "NR", "SL"}
kiwi = Kiwi() if Kiwi else None


def strip_particle(word):
    normalized = word

    for _ in range(2):
        for suffix in PARTICLE_SUFFIXES:
            if normalized.endswith(suffix) and len(normalized) > len(suffix) + 1:
                normalized = normalized[: -len(suffix)]
                break
        else:
            break

    return normalized


def remove_source_terms(text):
    cleaned = DOMAIN_IN_TEXT_PATTERN.sub(" ", text)

    for phrase in SOURCE_PHRASES:
        cleaned = re.sub(re.escape(phrase), " ", cleaned, flags=re.IGNORECASE)

    return cleaned


def is_noun_candidate(word):
    normalized = word.strip("[](){}<>\"'“”‘’·….,:;!?")

    if len(word) < 2:
        return False
    if normalized in STOPWORDS or normalized.lower() in STOPWORDS:
        return False
    if DOMAIN_PATTERN.fullmatch(normalized):
        return False
    if SOURCE_HINT_PATTERN.search(normalized):
        return False
    if re.fullmatch(r"\d+[가-힣A-Za-z]*", normalized):
        return False
    if any(normalized.endswith(suffix) for suffix in VERB_OR_ENDING_SUFFIXES):
        return False
    if (
        re.fullmatch(r"[A-Za-z]+", normalized)
        and len(normalized) < 3
        and not normalized.isupper()
    ):
        return False

    return True


def extract_keywords_with_kiwi(title):
    cleaned_title = remove_source_terms(title)
    keywords = []

    for token in kiwi.tokenize(cleaned_title):
        keyword = token.form.strip()

        if token.tag not in NOUN_TAGS:
            continue
        if not is_noun_candidate(keyword):
            continue

        keywords.append(keyword)

    return keywords


def extract_keywords_with_rules(title):
    cleaned_title = remove_source_terms(title)
    words = re.findall(r"[가-힣A-Za-z0-9]+", cleaned_title)
    keywords = []

    for word in words:
        keyword = strip_particle(word.strip())

        if not is_noun_candidate(keyword):
            continue

        keywords.append(keyword)

    return keywords


def extract_keywords(title):
    if kiwi:
        return extract_keywords_with_kiwi(title)

    return extract_keywords_with_rules(title)


def get_keyword_extractor_name():
    return "kiwipiepy" if kiwi else "rule-based"


def get_entry_date(entry, fallback_date):
    parsed_date = entry.get("published_parsed") or entry.get("updated_parsed")

    if not parsed_date:
        return fallback_date

    return (
        datetime(*parsed_date[:6], tzinfo=timezone.utc)
        .astimezone(KST)
        .strftime("%Y-%m-%d")
    )


def main():
    db = get_db()
    source_count = get_source_count()
    pipeline_run_id = start_pipeline_run(db, source_count)
    now = datetime.now(KST)
    today = now.strftime("%Y-%m-%d")
    start_date = (now - timedelta(days=6)).strftime("%Y-%m-%d")
    deleted_articles = db.articles.delete_many({"publishedAt": {"$lt": start_date}})
    deleted_trends = db.trends.delete_many({"date": {"$lt": start_date}})
    counters_by_category_date = defaultdict(lambda: defaultdict(Counter))
    source_counts = defaultdict(int)
    category_counts = defaultdict(int)
    seen_urls = set()
    article_count = 0
    trend_keyword_count = 0
    failed_source_count = 0
    feed_errors = []
    touched_category_dates = set()

    print(f"키워드 추출 방식: {get_keyword_extractor_name()}")

    for category, category_config in CATEGORIES.items():
        category_label = category_config["label"]

        for source, rss_urls in category_config["feeds"].items():
            for rss_url in rss_urls:
                try:
                    feed = feedparser.parse(rss_url)
                except Exception as error:
                    failed_source_count += 1
                    feed_errors.append(f"{source}: {error}")
                    continue

                if getattr(feed, "bozo", False) and not feed.entries:
                    failed_source_count += 1
                    feed_errors.append(f"{source}: RSS 파싱 실패")
                    continue

                if not feed.entries:
                    failed_source_count += 1
                    feed_errors.append(f"{source}: 수집된 RSS 항목 없음")
                    continue

                for entry in feed.entries:
                    title = entry.get("title", "")
                    link = entry.get("link", "")

                    if not title or not link or link in seen_urls:
                        continue

                    seen_urls.add(link)
                    keywords = extract_keywords(title)
                    article_date = get_entry_date(entry, today)

                    if article_date < start_date or article_date > today:
                        continue

                    counters_by_category_date[category][article_date].update(keywords)
                    touched_category_dates.add((category, article_date))
                    source_counts[source] += 1
                    category_counts[category_label] += 1
                    article_count += 1

                    db.articles.update_one(
                        {"url": link},
                        {
                            "$set": {
                                "title": title,
                                "url": link,
                                "source": source,
                                "feedUrl": rss_url,
                                "category": category,
                                "categoryLabel": category_label,
                                "publishedAt": article_date,
                                "keywords": keywords,
                            }
                        },
                        upsert=True,
                    )

    for category, article_date in touched_category_dates:
        db.trends.delete_many({"date": article_date, "category": category})

        for keyword, count in counters_by_category_date[category][article_date].most_common(100):
            trend_keyword_count += 1
            db.trends.update_one(
                {"keyword": keyword, "date": article_date, "category": category},
                {
                    "$set": {
                        "keyword": keyword,
                        "date": article_date,
                        "category": category,
                        "categoryLabel": CATEGORIES[category]["label"],
                        "count": count,
                    }
                },
                upsert=True,
            )

    pipeline_status = (
        "completed" if article_count > 0 and trend_keyword_count > 0 else "empty"
    )
    finish_pipeline_run(
        db=db,
        pipeline_run_id=pipeline_run_id,
        status=pipeline_status,
        article_count=article_count,
        keyword_count=trend_keyword_count,
        category_count=len({category for category, _ in touched_category_dates}),
        source_count=source_count,
        failed_source_count=failed_source_count,
        error_message="; ".join(feed_errors[:3]) if feed_errors else None,
    )

    print("크롤링 완료")
    print(f"보관 기간 시작일: {start_date}")
    print(f"삭제된 오래된 기사 수: {deleted_articles.deleted_count}")
    print(f"삭제된 오래된 트렌드 수: {deleted_trends.deleted_count}")
    print(f"수집 기사 수: {article_count}")
    print(f"수집 키워드 수: {trend_keyword_count}")
    print(f"실패 RSS 수: {failed_source_count}")
    print("출처별 수집량:")
    for source, count in sorted(source_counts.items()):
        print(source, count)

    print("분야별 수집량:")
    for category_label, count in sorted(category_counts.items()):
        print(category_label, count)

    print("분야/날짜별 수집 키워드 TOP 10:")
    for category, article_date in sorted(touched_category_dates, key=lambda item: (item[1], item[0]), reverse=True):
        print(article_date, CATEGORIES[category]["label"])
        for keyword, count in counters_by_category_date[category][article_date].most_common(10):
            print(keyword, count)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        mark_latest_pipeline_failed(error)
        raise

import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta

import feedparser
import certifi
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("../backend/.env")

mongo_uri = os.getenv("MONGO_URI")

if not mongo_uri:
    raise SystemExit(
        "MONGO_URI 환경변수가 비어 있습니다. "
        "GitHub Actions Secrets에 MONGO_URI를 등록해야 합니다."
    )

client = MongoClient(mongo_uri, tlsCAFile=certifi.where())
db = client[os.getenv("MONGO_DB", "test")]

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
}


def extract_keywords(title):
    words = re.findall(r"[가-힣A-Za-z0-9]+", title)
    keywords = []

    for word in words:
        word = word.strip()
        if len(word) < 2:
            continue
        if re.fullmatch(r"\d+[가-힣A-Za-z]*", word):
            continue
        if word.endswith(("했다", "한다", "됐다", "된다", "하고", "하며", "까지", "부터")):
            continue
        if word in STOPWORDS:
            continue
        keywords.append(word)

    return keywords


def get_entry_date(entry, fallback_date):
    parsed_date = entry.get("published_parsed") or entry.get("updated_parsed")

    if not parsed_date:
        return fallback_date

    return datetime(*parsed_date[:6]).strftime("%Y-%m-%d")


def main():
    today = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d")
    counters_by_category_date = defaultdict(lambda: defaultdict(Counter))
    source_counts = defaultdict(int)
    category_counts = defaultdict(int)
    seen_urls = set()
    article_count = 0
    touched_category_dates = set()

    for category, category_config in CATEGORIES.items():
        category_label = category_config["label"]

        for source, rss_urls in category_config["feeds"].items():
            for rss_url in rss_urls:
                feed = feedparser.parse(rss_url)

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

    print("크롤링 완료")
    print(f"수집 기사 수: {article_count}")
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
    main()

import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timedelta

import feedparser
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("../backend/.env")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("MONGO_DB", "test")]

RSS_FEEDS = {
    "yonhap": [
        "https://www.yna.co.kr/rss/news.xml",
    ],
    "chosun": [
        "https://www.chosun.com/arc/outboundfeeds/rss/?outputType=xml",
    ],
    "mk": [
        "https://www.mk.co.kr/rss/30000001/",
        "https://www.mk.co.kr/rss/30100041/",
    ],
    "sbs": [
        "https://news.sbs.co.kr/news/newsflashRssFeed.do?plink=RSSREADER",
    ],
    "etnews": [
        "https://rss.etnews.com/Section902.xml",
    ],
    "jtbc": [
        "https://fs.jtbc.co.kr/RSS/newsflash.xml",
    ],
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
    counters_by_date = defaultdict(Counter)
    source_counts = defaultdict(int)
    seen_urls = set()
    article_count = 0
    touched_dates = set()

    for source, rss_urls in RSS_FEEDS.items():
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

                counters_by_date[article_date].update(keywords)
                touched_dates.add(article_date)
                source_counts[source] += 1
                article_count += 1

                db.articles.update_one(
                    {"url": link},
                    {
                        "$set": {
                            "title": title,
                            "url": link,
                            "source": source,
                            "feedUrl": rss_url,
                            "publishedAt": article_date,
                            "keywords": keywords,
                        }
                    },
                    upsert=True,
                )

    for article_date in touched_dates:
        db.trends.delete_many({"date": article_date})

        for keyword, count in counters_by_date[article_date].most_common(100):
            db.trends.update_one(
                {"keyword": keyword, "date": article_date},
                {
                    "$set": {
                        "keyword": keyword,
                        "date": article_date,
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

    print("날짜별 수집 키워드 TOP 10:")
    for article_date in sorted(touched_dates, reverse=True):
        print(article_date)
        for keyword, count in counters_by_date[article_date].most_common(10):
            print(keyword, count)


if __name__ == "__main__":
    main()

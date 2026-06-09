import os
import re
from collections import Counter
from datetime import datetime

import feedparser
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv("../backend/.env")

client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("MONGO_DB", "test")]

RSS_URLS = [
    "https://www.hani.co.kr/rss/",
    "https://rss.donga.com/total.xml",
]

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
}


def extract_keywords(title):
    words = re.findall(r"[가-힣A-Za-z0-9]+", title)
    keywords = []

    for word in words:
        word = word.strip()
        if len(word) < 2:
            continue
        if word in STOPWORDS:
            continue
        keywords.append(word)

    return keywords


def main():
    today = datetime.now().strftime("%Y-%m-%d")
    counter = Counter()

    for rss_url in RSS_URLS:
        feed = feedparser.parse(rss_url)

        for entry in feed.entries:
            title = entry.get("title", "")
            link = entry.get("link", "")

            keywords = extract_keywords(title)
            counter.update(keywords)

            db.articles.update_one(
                {"url": link},
                {
                    "$set": {
                        "title": title,
                        "url": link,
                        "source": rss_url,
                        "publishedAt": today,
                        "keywords": keywords,
                    }
                },
                upsert=True,
            )

    for keyword, count in counter.most_common(30):
        db.trends.update_one(
            {"keyword": keyword, "date": today},
            {
                "$set": {
                    "keyword": keyword,
                    "date": today,
                    "count": count,
                }
            },
            upsert=True,
        )

    print("크롤링 완료")
    print("수집 키워드 TOP 10:")
    for keyword, count in counter.most_common(10):
        print(keyword, count)


if __name__ == "__main__":
    main()

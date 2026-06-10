const express = require("express");
const Article = require("../models/Article");
const Trend = require("../models/Trend");

const router = express.Router();

const CLUSTERS = [
  {
    name: "정치",
    keywords: ["대통령", "선거", "국회", "정부", "여당", "야당", "김정은", "시진핑"],
  },
  {
    name: "경제",
    keywords: ["금리", "환율", "증시", "부동산", "투자", "경제", "시장", "물가"],
  },
  {
    name: "IT",
    keywords: ["AI", "반도체", "엔비디아", "젠슨", "기술", "데이터", "플랫폼"],
  },
  {
    name: "사회",
    keywords: ["경찰", "검찰", "의혹", "사건", "수사", "재판", "사고"],
  },
];

async function getLatestDate() {
  const latestTrend = await Trend.findOne().sort({ date: -1 }).lean();

  return latestTrend?.date;
}

function getStartDate(latestDate, days) {
  if (!latestDate || days === "all") {
    return null;
  }

  const dayCount = Number(days) || 1;
  const date = new Date(`${latestDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - Math.max(dayCount - 1, 0));

  return date.toISOString().slice(0, 10);
}

router.get("/top", async (req, res) => {
  try {
    const { days = "all" } = req.query;
    const latestDate = await getLatestDate();
    const startDate = getStartDate(latestDate, days);
    const match = startDate ? { date: { $gte: startDate } } : {};

    const trends = await Trend.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$keyword",
          keyword: { $first: "$keyword" },
          date: { $max: "$date" },
          count: { $sum: "$count" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      latestDate,
      startDate,
      trends,
    });
  } catch (error) {
    res.status(500).json({
      message: "인기 키워드 조회 실패",
      error: error.message,
    });
  }
});

router.get("/articles/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    const articles = await Article.find({ keywords: keyword })
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(8)
      .select("title url source publishedAt keywords")
      .lean();

    res.json(articles);
  } catch (error) {
    res.status(500).json({
      message: "관련 기사 조회 실패",
      error: error.message,
    });
  }
});

router.get("/rising", async (req, res) => {
  try {
    const latestDate = await getLatestDate();
    const previousTrend = await Trend.findOne({ date: { $lt: latestDate } })
      .sort({ date: -1 })
      .lean();
    const previousDate = previousTrend?.date;

    if (!latestDate) {
      return res.json({ latestDate: null, previousDate: null, rising: [] });
    }

    const [latestRows, previousRows] = await Promise.all([
      Trend.find({ date: latestDate }).lean(),
      previousDate ? Trend.find({ date: previousDate }).lean() : [],
    ]);

    const previousMap = new Map(
      previousRows.map((trend) => [trend.keyword, trend.count])
    );

    const rising = latestRows
      .map((trend) => {
        const previousCount = previousMap.get(trend.keyword) || 0;
        const delta = trend.count - previousCount;
        const growthRate =
          previousCount === 0 ? null : Math.round((delta / previousCount) * 100);

        return {
          keyword: trend.keyword,
          count: trend.count,
          previousCount,
          delta,
          growthRate,
        };
      })
      .filter((trend) => trend.delta > 0)
      .sort((a, b) => b.delta - a.delta || b.count - a.count)
      .slice(0, 8);

    res.json({ latestDate, previousDate, rising });
  } catch (error) {
    res.status(500).json({
      message: "급상승 키워드 조회 실패",
      error: error.message,
    });
  }
});

router.get("/clusters", async (req, res) => {
  try {
    const latestDate = await getLatestDate();
    const trends = latestDate ? await Trend.find({ date: latestDate }).lean() : [];

    const clusters = CLUSTERS.map((cluster) => {
      const matched = trends
        .filter((trend) => cluster.keywords.includes(trend.keyword))
        .sort((a, b) => b.count - a.count);

      return {
        name: cluster.name,
        count: matched.reduce((sum, trend) => sum + trend.count, 0),
        keywords: matched.slice(0, 5).map((trend) => ({
          keyword: trend.keyword,
          count: trend.count,
        })),
      };
    }).sort((a, b) => b.count - a.count);

    res.json({ latestDate, clusters });
  } catch (error) {
    res.status(500).json({
      message: "키워드 클러스터 조회 실패",
      error: error.message,
    });
  }
});

router.get("/related/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    const articles = await Article.find({ keywords: keyword })
      .select("title source keywords")
      .lean();

    const relatedCounts = new Map();

    articles.forEach((article) => {
      const uniqueKeywords = [...new Set(article.keywords)];

      uniqueKeywords.forEach((relatedKeyword) => {
        if (relatedKeyword === keyword) {
          return;
        }

        relatedCounts.set(
          relatedKeyword,
          (relatedCounts.get(relatedKeyword) || 0) + 1
        );
      });
    });

    const related = [...relatedCounts.entries()]
      .map(([relatedKeyword, count]) => ({
        keyword: relatedKeyword,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    res.json({
      keyword,
      articleCount: articles.length,
      related,
    });
  } catch (error) {
    res.status(500).json({
      message: "관련 키워드 조회 실패",
      error: error.message,
    });
  }
});

router.get("/network", async (req, res) => {
  try {
    const { days = "1" } = req.query;
    const latestDate = await getLatestDate();
    const startDate = getStartDate(latestDate, days);
    const articleMatch = startDate ? { publishedAt: { $gte: startDate } } : {};
    const trendMatch = startDate ? { date: { $gte: startDate } } : {};

    const [articles, trendRows] = await Promise.all([
      Article.find(articleMatch).select("keywords").lean(),
      Trend.aggregate([
        { $match: trendMatch },
        {
          $group: {
            _id: "$keyword",
            keyword: { $first: "$keyword" },
            count: { $sum: "$count" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 80 },
      ]),
    ]);

    const counts = new Map(
      trendRows.map((trend) => [trend.keyword, trend.count])
    );
    const linkCounts = new Map();

    articles.forEach((article) => {
      const keywords = [...new Set(article.keywords || [])]
        .filter((keyword) => counts.has(keyword))
        .slice(0, 12);

      for (let i = 0; i < keywords.length; i += 1) {
        for (let j = i + 1; j < keywords.length; j += 1) {
          const pair = [keywords[i], keywords[j]].sort();
          const key = pair.join("|||");

          linkCounts.set(key, (linkCounts.get(key) || 0) + 1);
        }
      }
    });

    const nodes = trendRows.map((trend) => ({
      keyword: trend.keyword,
      count: trend.count,
    }));

    const links = [...linkCounts.entries()]
      .map(([key, count]) => {
        const [source, target] = key.split("|||");

        return { source, target, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 220);

    res.json({
      latestDate,
      startDate,
      nodes,
      links,
    });
  } catch (error) {
    res.status(500).json({
      message: "전체 키워드 네트워크 조회 실패",
      error: error.message,
    });
  }
});

router.get("/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;

    const data = await Trend.find({ keyword }).sort({ date: 1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "키워드 트렌드 조회 실패",
      error: error.message,
    });
  }
});

module.exports = router;

const express = require("express");
const Article = require("../models/Article");
const Trend = require("../models/Trend");

const router = express.Router();

const GALAXIES = [
  {
    id: "society",
    name: "Society",
    color: "#38bdf8",
    accent: "#2dd4bf",
    hue: 195,
    description: "A dense urban galaxy where incidents and public systems converge.",
    signalLabel: "Civic signals",
    core: { x: 50, y: 46 },
    x: 50,
    y: 46,
    scale: 1.12,
  },
  {
    id: "politics",
    name: "Politics",
    color: "#f43f5e",
    accent: "#f97316",
    hue: 348,
    description: "A charged red cluster where power, elections, and policy collide.",
    signalLabel: "Policy signals",
    core: { x: 35, y: 38 },
    x: 24,
    y: 32,
    scale: 0.92,
  },
  {
    id: "economy",
    name: "Economy",
    color: "#f59e0b",
    accent: "#84cc16",
    hue: 38,
    description: "A bright trade galaxy shaped by markets, capital, and prices.",
    signalLabel: "Market signals",
    core: { x: 66, y: 36 },
    x: 72,
    y: 28,
    scale: 1,
  },
  {
    id: "technology",
    name: "IT",
    color: "#22c55e",
    accent: "#06b6d4",
    hue: 145,
    description: "A green circuit galaxy linking AI, chips, platforms, and data.",
    signalLabel: "Tech signals",
    core: { x: 36, y: 64 },
    x: 30,
    y: 70,
    scale: 0.96,
  },
  {
    id: "world",
    name: "World",
    color: "#818cf8",
    accent: "#38bdf8",
    hue: 238,
    description: "A distant galaxy where diplomacy, conflict, and global shifts ripple outward.",
    signalLabel: "Global signals",
    core: { x: 68, y: 64 },
    x: 76,
    y: 68,
    scale: 0.9,
  },
  {
    id: "culture",
    name: "Culture",
    color: "#ec4899",
    accent: "#facc15",
    hue: 326,
    description: "A vivid nebula of content, performance, fandom, and public taste.",
    signalLabel: "Culture signals",
    core: { x: 26, y: 56 },
    x: 14,
    y: 54,
    scale: 0.78,
  },
  {
    id: "sports",
    name: "Sports",
    color: "#14b8a6",
    accent: "#a3e635",
    hue: 174,
    description: "A fast-moving galaxy of games, records, rivalries, and fan energy.",
    signalLabel: "Game signals",
    core: { x: 80, y: 48 },
    x: 88,
    y: 46,
    scale: 0.82,
  },
  {
    id: "science",
    name: "Science",
    color: "#a855f7",
    accent: "#22d3ee",
    hue: 272,
    description: "A deep exploration galaxy for research, space, climate, and discovery.",
    signalLabel: "Research signals",
    core: { x: 52, y: 72 },
    x: 52,
    y: 82,
    scale: 0.78,
  },
  {
    id: "health",
    name: "Health",
    color: "#06b6d4",
    accent: "#fb7185",
    hue: 188,
    description: "A life-signal galaxy tracking medicine, disease, safety, and care.",
    signalLabel: "Health signals",
    core: { x: 50, y: 24 },
    x: 50,
    y: 16,
    scale: 0.72,
  },
];

const CLUSTERS = [
  {
    name: "Politics",
    keywords: ["대통령", "선거", "국회", "정부", "여당", "야당", "김정은", "시진핑"],
  },
  {
    name: "Economy",
    keywords: ["금리", "환율", "증시", "부동산", "투자", "경제", "시장", "물가"],
  },
  {
    name: "IT",
    keywords: ["AI", "반도체", "엔비디아", "젠슨", "기술", "데이터", "플랫폼"],
  },
  {
    name: "Society",
    keywords: ["경찰", "검찰", "의혹", "사건", "수사", "재판", "사고"],
  },
];

function getCategory(req) {
  const category = String(req.query.category || "").trim();

  return category && category !== "all" ? category : null;
}

function withCategory(category, match = {}) {
  return category ? { ...match, category } : match;
}

async function getLatestDate(category = null) {
  const latestTrend = await Trend.findOne(withCategory(category))
    .sort({ date: -1 })
    .lean();

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

router.get("/galaxies", async (req, res) => {
  try {
    const { days = "7" } = req.query;
    const latestDate = await getLatestDate();
    const startDate = getStartDate(latestDate, days);
    const trendMatch = startDate ? { date: { $gte: startDate } } : {};
    const articleMatch = startDate ? { publishedAt: { $gte: startDate } } : {};

    const [trendSummaries, articleSummaries, topKeywords] = await Promise.all([
      Trend.aggregate([
        { $match: trendMatch },
        {
          $group: {
            _id: "$category",
            category: { $first: "$category" },
            categoryLabel: { $first: "$categoryLabel" },
            latestDate: { $max: "$date" },
            totalMentions: { $sum: "$count" },
            keywordCount: { $sum: 1 },
          },
        },
      ]),
      Article.aggregate([
        { $match: articleMatch },
        {
          $group: {
            _id: "$category",
            articleCount: { $sum: 1 },
          },
        },
      ]),
      Trend.aggregate([
        { $match: trendMatch },
        {
          $group: {
            _id: {
              category: "$category",
              keyword: "$keyword",
            },
            category: { $first: "$category" },
            keyword: { $first: "$keyword" },
            count: { $sum: "$count" },
          },
        },
        { $sort: { category: 1, count: -1, keyword: 1 } },
        {
          $group: {
            _id: "$_id.category",
            keyword: { $first: "$keyword" },
            count: { $first: "$count" },
          },
        },
      ]),
    ]);

    const trendsByCategory = new Map(
      trendSummaries.map((summary) => [summary.category, summary])
    );
    const articlesByCategory = new Map(
      articleSummaries.map((summary) => [summary._id, summary.articleCount])
    );
    const topKeywordByCategory = new Map(
      topKeywords.map((summary) => [summary._id, summary])
    );

    const galaxies = GALAXIES.map((galaxy) => {
      const trendSummary = trendsByCategory.get(galaxy.id);
      const topKeyword = topKeywordByCategory.get(galaxy.id);

      return {
        ...galaxy,
        latestDate: trendSummary?.latestDate || null,
        totalMentions: trendSummary?.totalMentions || 0,
        keywordCount: trendSummary?.keywordCount || 0,
        articleCount: articlesByCategory.get(galaxy.id) || 0,
        topKeyword: topKeyword?.keyword || null,
        topKeywordCount: topKeyword?.count || 0,
      };
    });

    res.json({
      latestDate,
      startDate,
      galaxies,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load galaxy list",
      error: error.message,
    });
  }
});

router.get("/top", async (req, res) => {
  try {
    const { days = "all" } = req.query;
    const category = getCategory(req);
    const latestDate = await getLatestDate(category);
    const startDate = getStartDate(latestDate, days);
    const match = withCategory(
      category,
      startDate ? { date: { $gte: startDate } } : {}
    );

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
      category,
      latestDate,
      startDate,
      trends,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load top keywords",
      error: error.message,
    });
  }
});

router.get("/articles/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    const category = getCategory(req);
    const articles = await Article.find(
      withCategory(category, { keywords: keyword })
    )
      .sort({ publishedAt: -1, updatedAt: -1 })
      .limit(8)
      .select("title url source category categoryLabel publishedAt keywords")
      .lean();

    res.json(articles);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load related articles",
      error: error.message,
    });
  }
});

router.get("/rising", async (req, res) => {
  try {
    const category = getCategory(req);
    const latestDate = await getLatestDate(category);

    if (!latestDate) {
      return res.json({
        category,
        latestDate: null,
        previousDate: null,
        rising: [],
      });
    }

    const previousTrend = await Trend.findOne(
      withCategory(category, { date: { $lt: latestDate } })
    )
      .sort({ date: -1 })
      .lean();
    const previousDate = previousTrend?.date;

    const [latestRows, previousRows] = await Promise.all([
      Trend.find(withCategory(category, { date: latestDate })).lean(),
      previousDate
        ? Trend.find(withCategory(category, { date: previousDate })).lean()
        : [],
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

    res.json({ category, latestDate, previousDate, rising });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load rising keywords",
      error: error.message,
    });
  }
});

router.get("/clusters", async (req, res) => {
  try {
    const category = getCategory(req);
    const latestDate = await getLatestDate(category);
    const trends = latestDate
      ? await Trend.find(withCategory(category, { date: latestDate })).lean()
      : [];

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

    res.json({ category, latestDate, clusters });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load keyword clusters",
      error: error.message,
    });
  }
});

router.get("/related/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    const category = getCategory(req);
    const articles = await Article.find(
      withCategory(category, { keywords: keyword })
    )
      .select("title source category categoryLabel keywords")
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
      category,
      keyword,
      articleCount: articles.length,
      related,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load related keywords",
      error: error.message,
    });
  }
});

router.get("/network", async (req, res) => {
  try {
    const { days = "1" } = req.query;
    const category = getCategory(req);
    const latestDate = await getLatestDate(category);
    const startDate = getStartDate(latestDate, days);
    const articleMatch = withCategory(
      category,
      startDate ? { publishedAt: { $gte: startDate } } : {}
    );
    const trendMatch = withCategory(
      category,
      startDate ? { date: { $gte: startDate } } : {}
    );

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
      category,
      latestDate,
      startDate,
      nodes,
      links,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to load keyword network",
      error: error.message,
    });
  }
});

router.get("/:keyword", async (req, res) => {
  try {
    const { keyword } = req.params;
    const category = getCategory(req);

    const data = await Trend.find(withCategory(category, { keyword })).sort({
      date: 1,
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({
      message: "Failed to load keyword trend",
      error: error.message,
    });
  }
});

module.exports = router;

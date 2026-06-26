const express = require("express");
const Article = require("../models/Article");
const Trend = require("../models/Trend");
const PipelineRun = require("../models/PipelineRun");

const router = express.Router();

function serializeRun(run) {
  return {
    status: run.status,
    startedAt: run.startedAt?.toISOString?.() || null,
    completedAt: run.completedAt?.toISOString?.() || null,
    lastCollectedAt:
      run.lastCollectedAt?.toISOString?.() ||
      run.completedAt?.toISOString?.() ||
      run.startedAt?.toISOString?.() ||
      null,
    articleCount: run.articleCount || 0,
    keywordCount: run.keywordCount || 0,
    categoryCount: run.categoryCount || 0,
    sourceCount: run.sourceCount || 0,
    failedSourceCount: run.failedSourceCount || 0,
    errorMessage: run.errorMessage || null,
  };
}

async function buildDerivedStatus() {
  const latestTrend = await Trend.findOne().sort({ date: -1 }).lean();

  if (!latestTrend?.date) {
    return {
      status: "empty",
      startedAt: null,
      completedAt: null,
      lastCollectedAt: null,
      articleCount: 0,
      keywordCount: 0,
      categoryCount: 0,
      sourceCount: 0,
      failedSourceCount: 0,
      errorMessage: null,
    };
  }

  const [articleCount, keywordCount, categories, sources] = await Promise.all([
    Article.countDocuments({ publishedAt: latestTrend.date }),
    Trend.countDocuments({ date: latestTrend.date }),
    Trend.distinct("category", { date: latestTrend.date }),
    Article.distinct("source", { publishedAt: latestTrend.date }),
  ]);

  return {
    status: articleCount > 0 && keywordCount > 0 ? "completed" : "empty",
    startedAt: null,
    completedAt: null,
    lastCollectedAt: `${latestTrend.date}T00:00:00.000Z`,
    articleCount,
    keywordCount,
    categoryCount: categories.filter(Boolean).length,
    sourceCount: sources.filter(Boolean).length,
    failedSourceCount: 0,
    errorMessage: null,
  };
}

router.get("/status", async (req, res) => {
  try {
    const latestRun = await PipelineRun.findOne().sort({ startedAt: -1 }).lean();

    if (latestRun) {
      if (latestRun.status === "failed" && !latestRun.lastCollectedAt) {
        const previousSuccessfulRun = await PipelineRun.findOne({
          status: { $in: ["completed", "empty"] },
          lastCollectedAt: { $ne: null },
        })
          .sort({ lastCollectedAt: -1 })
          .lean();

        latestRun.lastCollectedAt = previousSuccessfulRun?.lastCollectedAt || null;
      }

      return res.json(serializeRun(latestRun));
    }

    return res.json(await buildDerivedStatus());
  } catch (error) {
    res.status(500).json({
      message: "Failed to load pipeline status",
      error: error.message,
    });
  }
});

module.exports = router;

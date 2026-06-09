const express = require("express");
const Trend = require("../models/Trend");

const router = express.Router();

router.get("/top", async (req, res) => {
  try {
    const trends = await Trend.find().sort({ count: -1 }).limit(10);

    res.json(trends);
  } catch (error) {
    res.status(500).json({
      message: "인기 키워드 조회 실패",
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

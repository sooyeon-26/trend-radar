const mongoose = require("mongoose");
const Trend = require("../models/Trend");
require("dotenv").config();

const sampleTrends = [
  { keyword: "AI", date: "2026-06-07", count: 12 },
  { keyword: "AI", date: "2026-06-08", count: 18 },
  { keyword: "AI", date: "2026-06-09", count: 35 },
  { keyword: "반도체", date: "2026-06-09", count: 28 },
  { keyword: "환율", date: "2026-06-09", count: 21 },
  { keyword: "취업", date: "2026-06-09", count: 19 },
  { keyword: "부동산", date: "2026-06-09", count: 15 },
  { keyword: "금리", date: "2026-06-09", count: 14 },
  { keyword: "증시", date: "2026-06-09", count: 13 },
  { keyword: "전기차", date: "2026-06-09", count: 11 },
  { keyword: "배터리", date: "2026-06-09", count: 9 },
  { keyword: "스타트업", date: "2026-06-09", count: 7 },
];

async function seedTrends() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Trend.deleteMany({});
    await Trend.insertMany(sampleTrends);

    console.log("테스트 트렌드 데이터 저장 완료");
  } catch (error) {
    console.error("테스트 데이터 저장 실패:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedTrends();

const mongoose = require("mongoose");
const Trend = require("../models/Trend");
require("dotenv").config();

async function clearTrends() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    await Trend.deleteMany({});

    console.log("trends 컬렉션 초기화 완료");
  } catch (error) {
    console.error("trends 컬렉션 초기화 실패:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

clearTrends();

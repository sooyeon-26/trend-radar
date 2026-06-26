const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const trendRoutes = require("./routes/trendRoutes");
const pipelineRoutes = require("./routes/pipelineRoutes");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use("/api/trends", trendRoutes);
app.use("/api/pipeline", pipelineRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB 연결 성공");
  })
  .catch((error) => {
    console.error("MongoDB 연결 실패:", error.message);
  });

app.get("/", (req, res) => {
  res.send("Trend Radar API 서버 실행 중");
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});

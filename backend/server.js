const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const trendRoutes = require("./routes/trendRoutes");
const pipelineRoutes = require("./routes/pipelineRoutes");

require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors(
    allowedOrigins.length > 0
      ? {
          origin(origin, callback) {
            callback(null, !origin || allowedOrigins.includes(origin));
          },
        }
      : undefined
  )
);
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

app.get("/health", (_req, res) => {
  const databaseConnected = mongoose.connection.readyState === 1;
  res.status(databaseConnected ? 200 : 503).json({
    ok: databaseConnected,
    database: databaseConnected ? "connected" : "disconnected",
  });
});

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});

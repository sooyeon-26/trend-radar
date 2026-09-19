const express = require("express");
const cors = require("cors");
const trendRoutes = require("./routes/trendRoutes");
const pipelineRoutes = require("./routes/pipelineRoutes");
const { connectToDatabase, getDatabaseStatus } = require("./database");

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

async function requireDatabase(_req, res, next) {
  try {
    await connectToDatabase();
    next();
  } catch (_error) {
    res.set("Retry-After", "5");
    res.status(503).json({
      message: "데이터베이스에 일시적으로 연결할 수 없습니다.",
      code: "DATABASE_UNAVAILABLE",
      retryable: true,
    });
  }
}

async function healthHandler(_req, res) {
  try {
    await connectToDatabase();
  } catch (_error) {
    const status = getDatabaseStatus();

    res.set("Retry-After", "5");
    return res.status(503).json({
      ok: false,
      database: "disconnected",
      retryable: true,
      lastConnectionFailureAt: status.lastFailureAt,
    });
  }

  return res.json({
    ok: true,
    database: "connected",
    lastConnectionFailureAt: null,
  });
}

app.get("/api/health", healthHandler);
app.use("/api/trends", requireDatabase, trendRoutes);
app.use("/api/pipeline", requireDatabase, pipelineRoutes);

connectToDatabase().catch(() => {
  // 다음 API 요청에서 다시 연결을 시도합니다.
});

app.get("/", (req, res) => {
  res.send("Trend Radar API 서버 실행 중");
});

app.get("/health", healthHandler);

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});

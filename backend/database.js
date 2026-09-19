const mongoose = require("mongoose");

const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 20000,
  maxPoolSize: 5,
};

function createDatabaseConnector({
  mongooseClient = mongoose,
  getUri = () => process.env.MONGO_URI,
  logger = console,
} = {}) {
  let connectionPromise = null;
  let lastFailureAt = null;

  async function connect() {
    if (mongooseClient.connection.readyState === 1) {
      return mongooseClient.connection;
    }

    if (connectionPromise) {
      return connectionPromise;
    }

    const uri = getUri();

    if (!uri) {
      const error = new Error("MONGO_URI is not configured");
      lastFailureAt = new Date();
      logger.error("MongoDB 연결 실패: MONGO_URI가 설정되지 않았습니다.");
      throw error;
    }

    connectionPromise = mongooseClient
      .connect(uri, CONNECTION_OPTIONS)
      .then(() => {
        lastFailureAt = null;
        logger.info("MongoDB 연결 성공");
        return mongooseClient.connection;
      })
      .catch((error) => {
        lastFailureAt = new Date();
        logger.error("MongoDB 연결 실패:", error.message);
        throw error;
      })
      .finally(() => {
        connectionPromise = null;
      });

    return connectionPromise;
  }

  function getStatus() {
    return {
      connected: mongooseClient.connection.readyState === 1,
      connecting: mongooseClient.connection.readyState === 2 || Boolean(connectionPromise),
      lastFailureAt: lastFailureAt?.toISOString() || null,
    };
  }

  return { connect, getStatus };
}

const databaseConnector = createDatabaseConnector();

module.exports = {
  connectToDatabase: databaseConnector.connect,
  createDatabaseConnector,
  getDatabaseStatus: databaseConnector.getStatus,
};

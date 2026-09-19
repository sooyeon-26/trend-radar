const assert = require("node:assert/strict");
const test = require("node:test");
const { createDatabaseConnector } = require("../database");

const silentLogger = {
  info() {},
  error() {},
};

test("동시에 들어온 요청은 하나의 MongoDB 연결 시도를 공유한다", async () => {
  let resolveConnection;
  let connectCount = 0;
  const connection = { readyState: 0 };
  const mongooseClient = {
    connection,
    connect() {
      connectCount += 1;
      connection.readyState = 2;

      return new Promise((resolve) => {
        resolveConnection = () => {
          connection.readyState = 1;
          resolve();
        };
      });
    },
  };
  const connector = createDatabaseConnector({
    mongooseClient,
    getUri: () => "mongodb://example.test/trend-radar",
    logger: silentLogger,
  });

  const first = connector.connect();
  const second = connector.connect();

  assert.equal(connectCount, 1);
  resolveConnection();
  await Promise.all([first, second]);
  assert.deepEqual(connector.getStatus(), {
    connected: true,
    connecting: false,
    lastFailureAt: null,
  });
});

test("실패한 연결 Promise를 비우고 다음 요청에서 다시 시도한다", async () => {
  let connectCount = 0;
  const connection = { readyState: 0 };
  const mongooseClient = {
    connection,
    async connect() {
      connectCount += 1;

      if (connectCount === 1) {
        throw new Error("temporary network failure");
      }

      connection.readyState = 1;
    },
  };
  const connector = createDatabaseConnector({
    mongooseClient,
    getUri: () => "mongodb://example.test/trend-radar",
    logger: silentLogger,
  });

  await assert.rejects(connector.connect(), /temporary network failure/);
  assert.equal(connector.getStatus().connected, false);
  assert.match(connector.getStatus().lastFailureAt, /^\d{4}-\d{2}-\d{2}T/);

  await connector.connect();

  assert.equal(connectCount, 2);
  assert.equal(connector.getStatus().connected, true);
  assert.equal(connector.getStatus().lastFailureAt, null);
});

test("MONGO_URI가 없으면 연결을 시작하지 않고 즉시 실패한다", async () => {
  let connectCount = 0;
  const connector = createDatabaseConnector({
    mongooseClient: {
      connection: { readyState: 0 },
      async connect() {
        connectCount += 1;
      },
    },
    getUri: () => "",
    logger: silentLogger,
  });

  await assert.rejects(connector.connect(), /MONGO_URI is not configured/);
  assert.equal(connectCount, 0);
  assert.match(connector.getStatus().lastFailureAt, /^\d{4}-\d{2}-\d{2}T/);
});

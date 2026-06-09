import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./App.css";

const API_BASE_URL = "http://localhost:4000/api/trends";
const FILTERS = [
  { label: "오늘", value: "1" },
  { label: "3일", value: "3" },
  { label: "7일", value: "7" },
  { label: "전체", value: "all" },
];

const VIEW_TABS = ["관계망", "추이", "기사 근거"];

const NODE_LAYOUTS = [
  { x: 64, y: 26 },
  { x: 72, y: 42 },
  { x: 63, y: 61 },
  { x: 47, y: 68 },
  { x: 31, y: 60 },
  { x: 25, y: 42 },
  { x: 34, y: 25 },
  { x: 50, y: 18 },
  { x: 80, y: 27 },
  { x: 82, y: 60 },
  { x: 58, y: 82 },
  { x: 22, y: 76 },
  { x: 14, y: 52 },
  { x: 19, y: 20 },
  { x: 44, y: 8 },
  { x: 74, y: 12 },
  { x: 88, y: 43 },
  { x: 71, y: 76 },
  { x: 39, y: 86 },
  { x: 10, y: 34 },
];

const AMBIENT_DOTS = Array.from({ length: 150 }, (_, index) => {
  const column = index % 15;
  const row = Math.floor(index / 15);
  const wave = Math.sin(index * 1.7);
  const drift = Math.cos(index * 0.9);

  return {
    id: index,
    x: 7 + column * 6.2 + drift * 1.8,
    y: 12 + row * 7.8 + wave * 2.4,
    size: 1.2 + ((index * 7) % 4) * 0.55,
    alpha: 0.08 + ((index * 11) % 6) * 0.025,
  };
});

function App() {
  const [trends, setTrends] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [trendHistory, setTrendHistory] = useState([]);
  const [relatedKeywords, setRelatedKeywords] = useState([]);
  const [relatedArticleCount, setRelatedArticleCount] = useState(0);
  const [articles, setArticles] = useState([]);
  const [risingKeywords, setRisingKeywords] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [range, setRange] = useState("1");
  const [latestDate, setLatestDate] = useState("-");
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    fetchDashboard(range);
  }, [range]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      setMousePosition({
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const fetchDashboard = (selectedRange) => {
    Promise.all([
      axios.get(`${API_BASE_URL}/top?days=${selectedRange}`),
      axios.get(`${API_BASE_URL}/rising`),
      axios.get(`${API_BASE_URL}/clusters`),
    ])
      .then(([topResponse, risingResponse, clusterResponse]) => {
        const topTrends = topResponse.data.trends || [];

        setTrends(topTrends);
        setLatestDate(topResponse.data.latestDate || "-");
        setRisingKeywords(risingResponse.data.rising || []);
        setClusters(clusterResponse.data.clusters || []);

        if (topTrends.length > 0) {
          const nextKeyword =
            topTrends.find((trend) => trend.keyword === selectedKeyword)
              ?.keyword || topTrends[0].keyword;

          setKeyword(nextKeyword);
          selectKeyword(nextKeyword);
        }
      })
      .catch((error) => {
        console.error("대시보드 데이터 조회 실패:", error);
      });
  };

  const selectKeyword = (searchKeyword) => {
    const trimmedKeyword = searchKeyword.trim();

    if (!trimmedKeyword) {
      return;
    }

    const encodedKeyword = encodeURIComponent(trimmedKeyword);

    setSelectedKeyword(trimmedKeyword);

    Promise.all([
      axios.get(`${API_BASE_URL}/${encodedKeyword}`),
      axios.get(`${API_BASE_URL}/related/${encodedKeyword}`),
      axios.get(`${API_BASE_URL}/articles/${encodedKeyword}`),
    ])
      .then(([trendResponse, relatedResponse, articleResponse]) => {
        setTrendHistory(trendResponse.data);
        setRelatedKeywords(relatedResponse.data.related || []);
        setRelatedArticleCount(relatedResponse.data.articleCount || 0);
        setArticles(articleResponse.data || []);
      })
      .catch((error) => {
        console.error("키워드 데이터 조회 실패:", error);
      });
  };

  const totalMentions = trends.reduce((sum, trend) => sum + trend.count, 0);
  const selectedMentions = trendHistory.reduce(
    (sum, trend) => sum + trend.count,
    0
  );
  const topKeyword = trends[0];
  const strongestRelation = relatedKeywords[0];
  const maxRelatedCount = Math.max(
    ...relatedKeywords.map((item) => item.count),
    1
  );

  const strongestCluster = useMemo(
    () => clusters.find((cluster) => cluster.count > 0),
    [clusters]
  );
  const avgRelationStrength =
    relatedKeywords.length > 0
      ? Math.round(
          relatedKeywords.reduce((sum, item) => sum + item.count, 0) /
            relatedKeywords.length
        )
      : 0;
  const relationBuckets = relatedKeywords.slice(0, 4);
  const relationNodes = useMemo(
    () =>
      relatedKeywords.slice(0, NODE_LAYOUTS.length).map((item, index) => {
        const layout = NODE_LAYOUTS[index % NODE_LAYOUTS.length];
        const strength = item.count / maxRelatedCount;

        return {
          ...item,
          x: layout.x,
          y: layout.y,
          size: 10 + strength * 18,
          alpha: 0.38 + strength * 0.5,
          strength,
        };
      }),
    [relatedKeywords, maxRelatedCount]
  );

  const handleSearch = (event) => {
    event.preventDefault();
    selectKeyword(keyword);
  };

  return (
    <main
      className="app"
      style={{
        "--mouse-x": `${mousePosition.x}%`,
        "--mouse-y": `${mousePosition.y}%`,
      }}
    >
      <nav className="topbar" aria-label="서비스 네비게이션">
        <div className="brand-mark">TR</div>
        <div className="workspace-copy">
          <strong>Trend Radar</strong>
          <span>News keyword intelligence</span>
        </div>
        <div className="topbar-status">
          <span className="status-dot" />
          Live crawl
        </div>
      </nav>

      <header className="app-header">
        <div>
          <p className="eyebrow">RSS Intelligence Workspace</p>
          <h1>키워드 흐름과 관계를 한 번에 읽기</h1>
          <p className="subtitle">
            인기 키워드, 공동 등장 관계, 기사 근거를 연결해 지금 주목할 신호를
            빠르게 판별합니다.
          </p>
        </div>

        <div className="header-actions">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="키워드 검색"
            />
            <button type="submit">분석</button>
          </form>
          <span className="refresh-note">기준 날짜 {latestDate}</span>
        </div>
      </header>

      <section className="control-strip">
        <div className="segmented-control" aria-label="기간 필터">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              className={range === filter.value ? "is-active" : ""}
              type="button"
              onClick={() => setRange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="view-tabs" aria-label="보기 전환">
          {VIEW_TABS.map((tab, index) => (
            <button
              key={tab}
              className={index === 0 ? "is-active" : ""}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      <section className="summary-grid">
        <article className="metric-card">
          <span>수집 키워드</span>
          <strong>{trends.length}</strong>
          <small>현재 범위 내 랭킹 후보</small>
        </article>
        <article className="metric-card">
          <span>총 언급량</span>
          <strong>{totalMentions}</strong>
          <small>기사 키워드 집계 합산</small>
        </article>
        <article className="metric-card">
          <span>TOP 키워드</span>
          <strong>{topKeyword?.keyword || "-"}</strong>
          <small>{topKeyword ? `${topKeyword.count}건 감지` : "데이터 없음"}</small>
        </article>
        <article className="metric-card">
          <span>주요 클러스터</span>
          <strong>{strongestCluster?.name || "-"}</strong>
          <small>
            {strongestCluster ? `${strongestCluster.count}건 묶음` : "분류 대기"}
          </small>
        </article>
        <article className="metric-card">
          <span>연관 기사</span>
          <strong>{relatedArticleCount}</strong>
          <small>{selectedKeyword || "키워드 선택 필요"}</small>
        </article>
      </section>

      <section className="insight-grid">
        <aside className="panel trend-panel">
          <div className="panel-heading">
            <span>Source Nodes</span>
            <h2>인기 키워드</h2>
          </div>

          <div className="trend-list">
            {trends.map((trend, index) => (
              <button
                key={trend.keyword}
                className={`trend-node ${
                  selectedKeyword === trend.keyword ? "is-active" : ""
                }`}
                type="button"
                onClick={() => {
                  setKeyword(trend.keyword);
                  selectKeyword(trend.keyword);
                }}
              >
                <span className="rank">{index + 1}</span>
                <span className="node-copy">
                  <strong>{trend.keyword}</strong>
                  <small>{trend.date}</small>
                </span>
                <span className="count-badge">{trend.count}건</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="map-panel">
          <div className="map-toolbar">
            <div>
              <span>Relationship Map</span>
              <strong>{selectedKeyword || "키워드 선택"}</strong>
            </div>
            <div className="map-legend" aria-label="관계망 범례">
              <span><i className="legend-line" /> 공동 등장</span>
              <span><i className="legend-node" /> 연관 키워드</span>
            </div>
          </div>

          <svg
            className="relation-lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {relationNodes.map((node) => (
              <line
                key={`${node.keyword}-line`}
                x1="50"
                y1="46"
                x2={node.x}
                y2={node.y}
                strokeWidth={0.2 + node.strength * 0.85}
                opacity={0.2 + node.strength * 0.58}
              />
            ))}
            {relationNodes.slice(0, 12).map((node, index) => {
              const nextNode = relationNodes[(index + 3) % relationNodes.length];

              if (!nextNode || index % 2 !== 0) {
                return null;
              }

              return (
                <line
                  key={`${node.keyword}-${nextNode.keyword}-mesh`}
                  x1={node.x}
                  y1={node.y}
                  x2={nextNode.x}
                  y2={nextNode.y}
                  className="mesh-line"
                  strokeWidth={0.12 + Math.min(node.strength, nextNode.strength) * 0.32}
                />
              );
            })}
          </svg>

          <div className="ambient-dots" aria-hidden="true">
            {AMBIENT_DOTS.map((dot) => (
              <i
                key={dot.id}
                style={{
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  width: `${dot.size}px`,
                  height: `${dot.size}px`,
                  opacity: dot.alpha,
                }}
              />
            ))}
          </div>

          <button
            className="focus-dot"
            type="button"
            title={`${selectedKeyword || "키워드 선택"} · ${selectedMentions}건 언급`}
          >
            <span>{selectedKeyword || "키워드 선택"}</span>
            <strong>{selectedMentions}</strong>
          </button>

          {relationNodes.length > 0 ? (
            relationNodes.map((relatedKeyword) => (
              <button
                key={relatedKeyword.keyword}
                className="related-node"
                type="button"
                title={`${relatedKeyword.keyword} · ${relatedKeyword.count}회 공동 등장`}
                style={{
                  left: `${relatedKeyword.x}%`,
                  top: `${relatedKeyword.y}%`,
                  width: `${relatedKeyword.size}px`,
                  height: `${relatedKeyword.size}px`,
                  "--relation-alpha": relatedKeyword.alpha,
                }}
                onClick={() => {
                  setKeyword(relatedKeyword.keyword);
                  selectKeyword(relatedKeyword.keyword);
                }}
              >
                <span>{relatedKeyword.keyword}</span>
                <strong>{relatedKeyword.count}</strong>
              </button>
            ))
          ) : (
            <p className="network-empty">
              같은 기사에서 함께 등장한 키워드가 아직 없습니다.
            </p>
          )}

          <article className="relation-summary">
            <span>Strongest Link</span>
            <strong>{strongestRelation?.keyword || "-"}</strong>
            <small>
              {strongestRelation
                ? `${strongestRelation.count}회 공동 등장`
                : "관계 없음"}
            </small>
          </article>

          <aside className="relation-inspector">
            <div>
              <span>Avg. strength</span>
              <strong>{avgRelationStrength}</strong>
            </div>
            <div className="relation-bars">
              {relationBuckets.length > 0 ? (
                relationBuckets.map((item) => (
                  <button
                    key={item.keyword}
                    type="button"
                    onClick={() => {
                      setKeyword(item.keyword);
                      selectKeyword(item.keyword);
                    }}
                  >
                    <span>{item.keyword}</span>
                    <i
                      style={{
                        width: `${Math.max(
                          12,
                          (item.count / maxRelatedCount) * 100
                        )}%`,
                      }}
                    />
                    <strong>{item.count}</strong>
                  </button>
                ))
              ) : (
                <small>연관 강도 데이터 없음</small>
              )}
            </div>
          </aside>
        </section>

        <section className="panel chart-panel">
          <div className="panel-heading">
            <span>Detail View</span>
            <h2>{selectedKeyword || "키워드"} 언급량 추이</h2>
          </div>

          <div className="chart-box">
            {trendHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d9dee8" />
                  <XAxis dataKey="date" tick={{ fill: "#64748b" }} />
                  <YAxis allowDecimals={false} tick={{ fill: "#64748b" }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#ffffff", strokeWidth: 3 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-message">
                선택한 키워드의 세부 데이터가 없습니다.
              </p>
            )}
          </div>

          <div className="article-list">
            <div className="panel-heading compact">
              <span>Evidence</span>
              <h2>관련 기사</h2>
            </div>
            {articles.length > 0 ? (
              articles.map((article) => (
                <a
                  key={article.url}
                  className="article-link"
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{article.title}</strong>
                  <span>
                    {article.source} · {article.publishedAt}
                  </span>
                </a>
              ))
            ) : (
              <p className="empty-message">관련 기사 근거가 없습니다.</p>
            )}
          </div>
        </section>
      </section>

      <section className="bottom-grid">
        <section className="panel">
          <div className="panel-heading">
            <span>Momentum</span>
            <h2>급상승 키워드</h2>
          </div>
          <div className="rising-list">
            {risingKeywords.length > 0 ? (
              risingKeywords.map((trend) => (
                <button
                  key={trend.keyword}
                  className="rising-item"
                  type="button"
                  onClick={() => {
                    setKeyword(trend.keyword);
                    selectKeyword(trend.keyword);
                  }}
                >
                  <strong>{trend.keyword}</strong>
                  <span>
                    {trend.previousCount} → {trend.count}
                  </span>
                  <em>
                    {trend.growthRate === null
                      ? `+${trend.delta}`
                      : `+${trend.growthRate}%`}
                  </em>
                </button>
              ))
            ) : (
              <p className="empty-message">
                비교할 이전 날짜 데이터가 아직 없습니다.
              </p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <span>Clusters</span>
            <h2>키워드 클러스터</h2>
          </div>
          <div className="cluster-list">
            {clusters.map((cluster) => (
              <article key={cluster.name} className="cluster-card">
                <div>
                  <span>{cluster.name}</span>
                  <strong>{cluster.count}건</strong>
                </div>
                <div className="cluster-keywords">
                  {cluster.keywords.length > 0 ? (
                    cluster.keywords.map((trend) => (
                      <button
                        key={trend.keyword}
                        type="button"
                        onClick={() => {
                          setKeyword(trend.keyword);
                          selectKeyword(trend.keyword);
                        }}
                      >
                        {trend.keyword} {trend.count}
                      </button>
                    ))
                  ) : (
                    <small>매칭 키워드 없음</small>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;

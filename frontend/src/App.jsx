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
];

const VIEW_TABS = ["관계망", "추이", "기사"];

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

const CLUSTER_CENTERS = [
  { x: 30, y: 34, hue: 195 },
  { x: 66, y: 33, hue: 210 },
  { x: 43, y: 65, hue: 185 },
  { x: 72, y: 68, hue: 205 },
  { x: 22, y: 68, hue: 190 },
  { x: 52, y: 47, hue: 200 },
];

const TOP_NODE_LAYOUTS = [
  { x: 50, y: 50 },
  { x: 42, y: 39 },
  { x: 60, y: 40 },
  { x: 37, y: 55 },
  { x: 63, y: 56 },
  { x: 49, y: 66 },
  { x: 30, y: 43 },
  { x: 70, y: 44 },
  { x: 31, y: 66 },
  { x: 71, y: 67 },
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

const DENSITY_DOTS = Array.from({ length: 820 }, (_, index) => {
  const angle = index * 2.399963 + Math.sin(index * 0.37) * 0.6;
  const radius =
    Math.sqrt(((index * 37) % 821) / 821) *
    (39 + Math.sin(index * 0.19) * 13);
  const satellite = index % 23 === 0 ? 1.18 : 1;

  return {
    id: index,
    x: 50 + Math.cos(angle) * radius * 1.24 * satellite,
    y: 51 + Math.sin(angle) * radius * 0.9 * satellite,
    size: 1 + ((index * 13) % 5) * 0.36,
    alpha: 0.08 + ((index * 17) % 9) * 0.028,
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
  const [clusters, setClusters] = useState([]);
  const [network, setNetwork] = useState({ nodes: [], links: [] });
  const [range, setRange] = useState("1");
  const [latestDate, setLatestDate] = useState("-");
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [graphZoom, setGraphZoom] = useState(1);

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
      axios.get(`${API_BASE_URL}/clusters`),
      axios.get(`${API_BASE_URL}/network?days=${selectedRange}`),
    ])
      .then(([topResponse, clusterResponse, networkResponse]) => {
        const topTrends = topResponse.data.trends || [];

        setTrends(topTrends);
        setLatestDate(topResponse.data.latestDate || "-");
        setClusters(clusterResponse.data.clusters || []);
        setNetwork({
          nodes: networkResponse.data.nodes || [],
          links: networkResponse.data.links || [],
        });

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

  const selectedMentions = trendHistory.reduce(
    (sum, trend) => sum + trend.count,
    0
  );
  const topKeyword = trends[0];
  const maxTrendCount = Math.max(...trends.map((item) => item.count), 1);
  const strongestRelation = relatedKeywords[0];
  const maxRelatedCount = Math.max(
    ...relatedKeywords.map((item) => item.count),
    1
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
  const densityNodes = useMemo(() => {
    const nodesByKeyword = new Map();

    const addNode = (item, nextNode) => {
      const key = item.keyword;
      const currentNode = nodesByKeyword.get(key);
      const currentPriority = currentNode?.priority || 0;
      const nextPriority = nextNode.priority || 0;

      if (
        !currentNode ||
        nextPriority > currentPriority ||
        (nextPriority === currentPriority && nextNode.count > currentNode.count)
      ) {
        nodesByKeyword.set(key, {
          ...item,
          ...nextNode,
          keyword: item.keyword,
          count: nextNode.count,
          sources: currentNode
            ? Array.from(new Set([...currentNode.sources, nextNode.source]))
            : [nextNode.source],
        });
        return;
      }

      currentNode.sources = Array.from(
        new Set([...currentNode.sources, nextNode.source])
      );
    };

    network.nodes.slice(0, 80).forEach((item, index) => {
      const topLayout = TOP_NODE_LAYOUTS[index];
      const angle = index * 2.399963 + Math.sin(index * 0.7) * 0.32;
      const radius = 11 + Math.sqrt(index + 1) * 5.6;
      const strength = item.count / maxTrendCount;

      addNode(item, {
        x: topLayout?.x || 50 + Math.cos(angle) * radius * 1.08,
        y: topLayout?.y || 51 + Math.sin(angle) * radius * 0.78,
        size: index < 10 ? 8 + strength * 26 : 3.5 + strength * 14,
        alpha: index < 10 ? 0.56 + strength * 0.4 : 0.24 + strength * 0.46,
        strength,
        cluster: index < 10 ? "Top 10" : "전체 네트워크",
        clusterIndex: 5,
        hue: index < 10 ? 205 : 198,
        source: index < 10 ? "top" : "network",
        priority: index < 10 ? 4 : 2,
        count: item.count,
      });
    });

    clusters.forEach((cluster, clusterIndex) => {
      const center = CLUSTER_CENTERS[clusterIndex % CLUSTER_CENTERS.length];

      cluster.keywords.slice(0, 18).forEach((item, keywordIndex) => {
        const angle = keywordIndex * 2.399963 + clusterIndex * 0.72;
        const radius = 4 + Math.sqrt(keywordIndex + 1) * 4.4;
        const strength = item.count / maxTrendCount;

        addNode(item, {
          x: center.x + Math.cos(angle) * radius * 1.05,
          y: center.y + Math.sin(angle) * radius * 0.84,
          size: 4 + strength * 16,
          alpha: 0.34 + strength * 0.54,
          strength,
          cluster: cluster.name,
          clusterIndex,
          hue: center.hue,
          source: "cluster",
          priority: 1,
          count: item.count,
        });
      });
    });

    trends.slice(0, 10).forEach((item, index) => {
      const layout = TOP_NODE_LAYOUTS[index];
      const strength = item.count / maxTrendCount;

      addNode(item, {
        x: layout.x,
        y: layout.y,
        size: 8 + strength * 26,
        alpha: 0.52 + strength * 0.42,
        strength,
        cluster: "Top 10",
        clusterIndex: 5,
        hue: 205,
        source: "top",
        priority: 4,
        count: item.count,
      });
    });

    trends.slice(10, 52).forEach((item, index) => {
      const angle = index * 2.399963 + Math.sin(index * 1.13) * 0.34;
      const radius = 24 + Math.sqrt(index + 1) * 5.8;
      const strength = item.count / maxTrendCount;

      addNode(item, {
        x: 50 + Math.cos(angle) * radius * 1.08,
        y: 51 + Math.sin(angle) * radius * 0.74,
        size: 3.5 + strength * 13,
        alpha: 0.22 + strength * 0.42,
        strength,
        cluster: "인기 키워드",
        clusterIndex: 5,
        hue: 200,
        source: "trend",
        priority: 2,
        count: item.count,
      });
    });

    relatedKeywords.slice(0, 28).forEach((item, index) => {
      const angle = index * 2.399963 + 0.5;
      const radius = 9 + Math.sqrt(index + 1) * 4.9;
      const strength = item.count / maxRelatedCount;

      addNode(item, {
        x: 50 + Math.cos(angle) * radius * 0.92,
        y: 50 + Math.sin(angle) * radius * 0.72,
        size: 5 + strength * 18,
        alpha: 0.45 + strength * 0.5,
        strength,
        cluster: selectedKeyword || "선택 키워드",
        clusterIndex: 6,
        hue: 170,
        source: "related",
        priority: 3,
        count: item.count,
      });
    });

    if (selectedKeyword) {
      const currentSelectedNode = nodesByKeyword.get(selectedKeyword);

      addNode(
        { keyword: selectedKeyword },
        {
          x: currentSelectedNode?.x || 50,
          y: currentSelectedNode?.y || 50,
          size: 22,
          alpha: 0.96,
          strength: 1,
          cluster: "선택 키워드",
          clusterIndex: 6,
          hue: 170,
          source: "selected",
          priority: 5,
          count: selectedMentions || topKeyword?.count || 1,
        }
      );
    }

    return Array.from(nodesByKeyword.values())
      .filter((node) => node.x >= 3 && node.x <= 97 && node.y >= 5 && node.y <= 95)
      .slice(0, 120);
  }, [
    clusters,
    trends,
    network,
    relatedKeywords,
    maxTrendCount,
    maxRelatedCount,
    selectedKeyword,
    selectedMentions,
    topKeyword,
  ]);

  const densityLinks = useMemo(() => {
    const links = [];
    const nodeMap = new Map(densityNodes.map((node) => [node.keyword, node]));
    const maxNetworkLinkCount = Math.max(
      ...network.links.map((link) => link.count),
      1
    );

    network.links.forEach((link) => {
      const from = nodeMap.get(link.source);
      const to = nodeMap.get(link.target);

      if (!from || !to) {
        return;
      }

      const isSelectedLink =
        link.source === selectedKeyword || link.target === selectedKeyword;
      const isTopLink = from.source === "top" && to.source === "top";

      links.push({
        from,
        to,
        strength: link.count / maxNetworkLinkCount,
        type: isSelectedLink ? "related" : isTopLink ? "top" : "network",
      });
    });

    const topNodes = trends
      .slice(0, 10)
      .map((item) => nodeMap.get(item.keyword))
      .filter(Boolean);

    topNodes.forEach((node, index) => {
      const nextNode = topNodes[index + 1];
      const radialNode = topNodes[(index + 3) % topNodes.length];

      if (nextNode) {
        links.push({
          from: node,
          to: nextNode,
          strength: Math.min(node.strength, nextNode.strength) * 0.5,
          type: "top",
        });
      }

      if (radialNode && index % 2 === 0) {
        links.push({
          from: node,
          to: radialNode,
          strength: Math.min(node.strength, radialNode.strength) * 0.36,
          type: "top",
        });
      }
    });

    clusters.forEach((cluster) => {
      const clusterNodes = cluster.keywords
        .map((item) => nodeMap.get(item.keyword))
        .filter(Boolean)
        .slice(0, 12);

      clusterNodes.forEach((node, index) => {
        const nextNode = clusterNodes[index + 1];
        const crossNode = clusterNodes[index + 4];

        if (nextNode) {
          links.push({
            from: node,
            to: nextNode,
            strength: Math.min(node.strength, nextNode.strength),
            type: "cluster",
          });
        }

        if (crossNode && index % 2 === 0) {
          links.push({
            from: node,
            to: crossNode,
            strength: Math.min(node.strength, crossNode.strength) * 0.72,
            type: "cluster",
          });
        }
      });
    });

    const selectedNode = nodeMap.get(selectedKeyword);

    if (selectedNode) {
      relatedKeywords.slice(0, 24).forEach((item) => {
        const relatedNode = nodeMap.get(item.keyword);

        if (relatedNode) {
          links.push({
            from: selectedNode,
            to: relatedNode,
            strength: item.count / maxRelatedCount,
            type: "related",
          });
        }
      });
    }

    densityNodes.slice(0, 38).forEach((node, index) => {
      const nextNode = densityNodes[(index + 7) % densityNodes.length];

      if (nextNode && node.clusterIndex === nextNode.clusterIndex) {
        links.push({
          from: node,
          to: nextNode,
          strength: Math.min(node.strength, nextNode.strength) * 0.5,
          type: "mesh",
        });
      }
    });

    return links.slice(0, 220);
  }, [
    clusters,
    densityNodes,
    network,
    relatedKeywords,
    selectedKeyword,
    maxRelatedCount,
    trends,
  ]);

  const handleSearch = (event) => {
    event.preventDefault();
    selectKeyword(keyword);
  };

  const handleGraphWheel = (event) => {
    if (event.target.closest(".article-list, .trend-list")) {
      return;
    }

    event.preventDefault();

    setGraphZoom((currentZoom) => {
      const nextZoom =
        currentZoom + (event.deltaY > 0 ? -0.08 : 0.08);

      return Math.min(2.2, Math.max(0.58, Number(nextZoom.toFixed(2))));
    });
  };

  return (
    <main
      className="app"
      style={{
        "--mouse-x": `${mousePosition.x}%`,
        "--mouse-y": `${mousePosition.y}%`,
        "--graph-zoom": graphZoom,
      }}
    >
      <section
        className="density-hero"
        aria-label="키워드 밀도 지도"
        onWheel={handleGraphWheel}
      >
        <div className="graph-stage">
          <svg
            className="density-links"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {densityLinks.map((link, index) => (
              <line
                key={`${link.from.keyword}-${link.to.keyword}-${index}`}
                x1={link.from.x}
                y1={link.from.y}
                x2={link.to.x}
                y2={link.to.y}
                className={`density-link-${link.type}`}
                strokeWidth={
                  link.type === "related"
                    ? 0.12 + link.strength * 0.38
                    : 0.03 + link.strength * 0.12
                }
                opacity={
                  link.type === "related"
                    ? 0.22 + link.strength * 0.46
                    : 0.04 + link.strength * 0.16
                }
              />
            ))}
          </svg>

          <div className="density-cloud" aria-hidden="true">
            {DENSITY_DOTS.map((dot) => (
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

          <div className="density-core" aria-hidden="true" />

          {densityNodes.map((node) => (
            <button
              key={node.keyword}
              className={`density-node density-node-${node.source}`}
              type="button"
              title={`${node.keyword} · ${node.count}건 · ${node.cluster}`}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                width: `${node.size}px`,
                height: `${node.size}px`,
                opacity: node.alpha,
                "--node-hue": node.hue,
              }}
              onClick={() => {
                setKeyword(node.keyword);
                selectKeyword(node.keyword);
              }}
            >
              <span>{node.keyword}</span>
            </button>
          ))}
        </div>

        <header className="app-header">
          <div className="header-actions">
            <form className="search-form" onSubmit={handleSearch}>
              <label htmlFor="keyword-search">검색</label>
              <input
                id="keyword-search"
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="키워드 검색"
              />
              <button type="submit" aria-label="키워드 분석">⌕</button>
            </form>
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

      <section className="insight-grid">
        <aside className="panel trend-panel">
          <div className="panel-heading">
            <span>Source Nodes</span>
            <h2>인기 키워드</h2>
          </div>

          <div className="trend-list">
            {trends.slice(0, 5).map((trend, index) => (
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
                <LineChart
                  data={trendHistory}
                  margin={{ top: 12, right: 10, bottom: 4, left: -24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={18}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={26}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#7dd3fc"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f8fafc", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
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
      </section>

    </main>
  );
}

export default App;

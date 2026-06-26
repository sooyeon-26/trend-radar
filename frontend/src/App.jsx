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
import IntroScreen from "./IntroScreen";
import PipelineStatus from "./PipelineStatus";
import SignalSummaryCard from "./SignalSummaryCard";
import { buildSignalAnalysis } from "./utils/signalAnalysis";
import "./App.css";

const API_BASE_URL = "http://localhost:4000/api/trends";
const FILTERS = [
  { label: "오늘", value: "1" },
  { label: "3일", value: "3" },
  { label: "7일", value: "7" },
];
const DEFAULT_CATEGORY = "society";
const getInitialGraphZoom = () => 1;
const GALAXY_FALLBACKS = {
  society: {
    name: "Society",
    color: "#38bdf8",
    accent: "#2dd4bf",
    hue: 195,
    description: "A dense urban galaxy where incidents and public systems converge.",
    signalLabel: "Civic signals",
    core: { x: 50, y: 46 },
    x: 50,
    y: 47,
    scale: 1.08,
  },
  politics: {
    name: "Politics",
    color: "#f43f5e",
    accent: "#f97316",
    hue: 348,
    description: "A charged red cluster where power, elections, and policy collide.",
    signalLabel: "Policy signals",
    core: { x: 35, y: 38 },
    x: 33,
    y: 30,
    scale: 0.88,
  },
  economy: {
    name: "Economy",
    color: "#f59e0b",
    accent: "#84cc16",
    hue: 38,
    description: "A bright trade galaxy shaped by markets, capital, and prices.",
    signalLabel: "Market signals",
    core: { x: 66, y: 36 },
    x: 66,
    y: 31,
    scale: 0.98,
  },
  technology: {
    name: "IT",
    color: "#22c55e",
    accent: "#06b6d4",
    hue: 145,
    description: "A green circuit galaxy linking AI, chips, platforms, and data.",
    signalLabel: "Tech signals",
    core: { x: 36, y: 64 },
    x: 33,
    y: 65,
    scale: 0.92,
  },
  world: {
    name: "World",
    color: "#818cf8",
    accent: "#38bdf8",
    hue: 238,
    description: "A distant galaxy where diplomacy, conflict, and global shifts ripple outward.",
    signalLabel: "Global signals",
    core: { x: 68, y: 64 },
    x: 70,
    y: 62,
    scale: 1,
  },
  culture: {
    name: "Culture",
    color: "#ec4899",
    accent: "#facc15",
    hue: 326,
    description: "A vivid nebula of content, performance, fandom, and public taste.",
    signalLabel: "Culture signals",
    core: { x: 26, y: 56 },
    x: 19,
    y: 47,
    scale: 0.84,
  },
  sports: {
    name: "Sports",
    color: "#14b8a6",
    accent: "#a3e635",
    hue: 174,
    description: "A fast-moving galaxy of games, records, rivalries, and fan energy.",
    signalLabel: "Game signals",
    core: { x: 80, y: 48 },
    x: 82,
    y: 47,
    scale: 0.86,
  },
  science: {
    name: "Science",
    color: "#a855f7",
    accent: "#22d3ee",
    hue: 272,
    description: "A deep exploration galaxy for research, space, climate, and discovery.",
    signalLabel: "Research signals",
    core: { x: 52, y: 72 },
    x: 54,
    y: 78,
    scale: 0.94,
  },
  health: {
    name: "Health",
    color: "#06b6d4",
    accent: "#fb7185",
    hue: 188,
    description: "A life-signal galaxy tracking medicine, disease, safety, and care.",
    signalLabel: "Health signals",
    core: { x: 50, y: 24 },
    x: 49,
    y: 19,
    scale: 0.86,
  },
};

const FALLBACK_GALAXIES = Object.entries(GALAXY_FALLBACKS).map(
  ([id, galaxy]) => ({
    id,
    articleCount: 0,
    keywordCount: 0,
    totalMentions: 0,
    topKeyword: "-",
    ...galaxy,
  })
);

const CATEGORY_NAMES = {
  society: "사회",
  politics: "정치",
  economy: "경제",
  technology: "IT",
  world: "세계",
  culture: "문화",
  sports: "스포츠",
  science: "과학",
  health: "건강",
};

const CATEGORY_DESCRIPTIONS = {
  society: "사건, 제도, 시민 생활의 흐름이 모이는 분야입니다.",
  politics: "정치, 선거, 정책, 권력 구조의 변화를 추적합니다.",
  economy: "시장, 투자, 물가, 산업 흐름을 관측합니다.",
  technology: "AI, 반도체, 플랫폼, 기술 산업의 신호를 모읍니다.",
  world: "국제 정세, 외교, 분쟁, 글로벌 변화를 연결합니다.",
  culture: "콘텐츠, 공연, 대중문화, 라이프스타일 이슈를 모읍니다.",
  sports: "경기, 선수, 기록, 팬덤 흐름을 추적합니다.",
  science: "연구, 우주, 기후, 발견의 흐름을 관측합니다.",
  health: "의료, 질병, 건강, 돌봄 관련 신호를 모읍니다.",
};

const CATEGORY_ALIASES = {
  tech: "technology",
  it: "technology",
};

const CATEGORY_CLUSTER_CENTERS = {
  politics: { x: 30, y: 30 },
  economy: { x: 70, y: 31 },
  society: { x: 31, y: 67 },
  technology: { x: 67, y: 66 },
  science: { x: 74, y: 72 },
  world: { x: 50, y: 22 },
  culture: { x: 43, y: 80 },
  sports: { x: 57, y: 80 },
  health: { x: 38, y: 72 },
};

function hexToRgba(hex, alpha) {
  const normalizedHex = hex.replace("#", "");
  const value = Number.parseInt(normalizedHex, 16);

  if (Number.isNaN(value)) {
    return `rgba(56, 189, 248, ${alpha})`;
  }

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatDisplayText(value) {
  return String(value || "");
}

function getGalaxyDisplayName(galaxy) {
  return CATEGORY_NAMES[galaxy?.id] || galaxy?.name || "사회";
}

function getGalaxyDescription(galaxy) {
  return CATEGORY_DESCRIPTIONS[galaxy?.id] || "이 분야의 신호를 기다리는 중입니다.";
}

function normalizeCategoryId(category) {
  const normalized = String(category || DEFAULT_CATEGORY).toLowerCase();

  return CATEGORY_ALIASES[normalized] || normalized || DEFAULT_CATEGORY;
}

function getClusterCenter(category) {
  return (
    CATEGORY_CLUSTER_CENTERS[normalizeCategoryId(category)] ||
    CATEGORY_CLUSTER_CENTERS[DEFAULT_CATEGORY]
  );
}

function getWeightedClusterCenter(categories) {
  const validCategories = categories?.length
    ? categories
    : [{ id: DEFAULT_CATEGORY, count: 1 }];
  const totalCategoryCount =
    validCategories.reduce(
      (sum, category) => sum + Math.max(category.count || 0, 1),
      0
    ) || 1;

  return validCategories.reduce(
    (position, category) => {
      const center = getClusterCenter(category.id);
      const weight = Math.max(category.count || 0, 1) / totalCategoryCount;

      return {
        x: position.x + center.x * weight,
        y: position.y + center.y * weight,
      };
    },
    { x: 0, y: 0 }
  );
}

function getKeywordClusterPosition({
  categories,
  categoryIndex,
  globalIndex,
  scale = 0.9,
}) {
  const center = getWeightedClusterCenter(categories);
  const angle =
    categoryIndex * 2.399963 +
    globalIndex * 0.17 +
    Math.sin(categoryIndex * 0.73) * 0.18;
  const radius = 3.8 + Math.sqrt(categoryIndex + 1) * (2.5 + scale * 0.9);
  const sharedCategoryPull = categories.length > 1 ? 0.74 : 1;
  const occasionalOuterArm = categoryIndex % 8 === 0 ? 1.22 : 1;

  return {
    x: center.x + Math.cos(angle) * radius * 1.14 * occasionalOuterArm,
    y: center.y + Math.sin(angle) * radius * 0.82 * sharedCategoryPull,
  };
}

const DENSITY_DOTS = Object.entries(CATEGORY_CLUSTER_CENTERS).flatMap(
  ([category, center], categoryIndex) =>
    Array.from({ length: 54 }, (_, dotIndex) => {
      const index = categoryIndex * 54 + dotIndex;
      const angle = dotIndex * 2.399963 + categoryIndex * 0.61;
      const radius =
        Math.sqrt(((dotIndex * 37) % 55) / 55) *
        (7.5 + (categoryIndex % 3) * 1.8);

      return {
        id: `${category}-${dotIndex}`,
        x: center.x + Math.cos(angle) * radius * 1.22,
        y: center.y + Math.sin(angle) * radius * 0.86,
        size: 0.9 + ((index * 13) % 5) * 0.26,
        alpha: 0.035 + ((index * 17) % 8) * 0.014,
      };
    })
);

function App() {
  const [galaxies, setGalaxies] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
  const [trends, setTrends] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
  const [trendHistory, setTrendHistory] = useState([]);
  const [relatedKeywords, setRelatedKeywords] = useState([]);
  const [relatedArticleCount, setRelatedArticleCount] = useState(0);
  const [articles, setArticles] = useState([]);
  const [universeGraph, setUniverseGraph] = useState({ nodes: [], links: [] });
  const [range, setRange] = useState("1");
  const [latestDate, setLatestDate] = useState("-");
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  const [graphZoom, setGraphZoom] = useState(getInitialGraphZoom);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [articlesExpanded, setArticlesExpanded] = useState(false);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    fetchDashboard(range, selectedCategory);
  }, [range, selectedCategory]);

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

  const getCategoryQuery = (category) =>
    `category=${encodeURIComponent(category || DEFAULT_CATEGORY)}`;

  const fetchDashboard = (selectedRange, category) => {
    const categoryQuery = getCategoryQuery(category);

    Promise.all([
      axios.get(`${API_BASE_URL}/galaxies?days=${selectedRange}`),
      axios.get(`${API_BASE_URL}/top?days=${selectedRange}&${categoryQuery}`),
      axios.get(`${API_BASE_URL}/universe?days=${selectedRange}`),
    ])
      .then(([galaxyResponse, topResponse, universeResponse]) => {
        const topTrends = topResponse.data.trends || [];

        setGalaxies(galaxyResponse.data.galaxies || []);
        setTrends(topTrends);
        setLatestDate(topResponse.data.latestDate || "-");
        setUniverseGraph({
          nodes: universeResponse.data.nodes || [],
          links: universeResponse.data.links || [],
        });

        if (topTrends.length > 0) {
          const nextKeyword =
            topTrends.find((trend) => trend.keyword === selectedKeyword)
              ?.keyword || topTrends[0].keyword;

          setKeyword(nextKeyword);
          selectKeyword(nextKeyword, category, { focus: false });
          return;
        }

        setKeyword("");
        setSelectedKeyword("");
        setTrendHistory([]);
        setRelatedKeywords([]);
        setRelatedArticleCount(0);
        setArticles([]);
      })
      .catch((error) => {
        console.error("Failed to load dashboard data:", error);
      });
  };

  const selectKeyword = (
    searchKeyword,
    category = selectedCategory,
    options = { focus: true }
  ) => {
    const trimmedKeyword = searchKeyword.trim();

    if (!trimmedKeyword) {
      return;
    }

    const encodedKeyword = encodeURIComponent(trimmedKeyword);
    const categoryQuery = getCategoryQuery(category);

    setSelectedKeyword(trimmedKeyword);
    if (options.focus) {
      setFocusedNodeId(`keyword:${trimmedKeyword}`);
    }
    setArticlesExpanded(false);

    Promise.all([
      axios.get(`${API_BASE_URL}/${encodedKeyword}?${categoryQuery}`),
      axios.get(`${API_BASE_URL}/related/${encodedKeyword}?${categoryQuery}`),
      axios.get(`${API_BASE_URL}/articles/${encodedKeyword}?${categoryQuery}`),
    ])
      .then(([trendResponse, relatedResponse, articleResponse]) => {
        setTrendHistory(trendResponse.data);
        setRelatedKeywords(relatedResponse.data.related || []);
        setRelatedArticleCount(relatedResponse.data.articleCount || 0);
        setArticles(articleResponse.data || []);
      })
      .catch((error) => {
        console.error("Failed to load keyword data:", error);
      });
  };

  const themedGalaxies = useMemo(
    () => {
      const sourceGalaxies = galaxies.length > 0 ? galaxies : FALLBACK_GALAXIES;

      return sourceGalaxies.map((galaxy) => ({
        ...(GALAXY_FALLBACKS[galaxy.id] || {}),
        ...galaxy,
        core:
          galaxy.core ||
          GALAXY_FALLBACKS[galaxy.id]?.core || { x: 50, y: 46 },
        x: galaxy.x ?? GALAXY_FALLBACKS[galaxy.id]?.x ?? 50,
        y: galaxy.y ?? GALAXY_FALLBACKS[galaxy.id]?.y ?? 50,
        scale: galaxy.scale ?? GALAXY_FALLBACKS[galaxy.id]?.scale ?? 0.9,
      }));
    },
    [galaxies]
  );
  const selectedGalaxy = useMemo(
    () =>
      themedGalaxies.find((galaxy) => galaxy.id === selectedCategory) || {
        id: selectedCategory,
        ...GALAXY_FALLBACKS[selectedCategory],
      },
    [themedGalaxies, selectedCategory]
  );
  const relatedKeywordSet = useMemo(
    () => new Set(relatedKeywords.map((item) => item.keyword)),
    [relatedKeywords]
  );
  const labeledKeywordSet = useMemo(
    () =>
      new Set([
        selectedKeyword,
        ...relatedKeywords.slice(0, 3).map((item) => item.keyword),
      ]),
    [selectedKeyword, relatedKeywords]
  );
  const trendDeltaSummary = useMemo(() => {
    if (trendHistory.length < 2) {
      return "추이 비교를 위한 이전 데이터가 부족합니다";
    }

    const recentHistory = trendHistory.slice(-3);
    const firstCount = recentHistory[0]?.count || 0;
    const lastCount = recentHistory[recentHistory.length - 1]?.count || 0;
    const delta = lastCount - firstCount;
    const direction = delta > 0 ? "증가" : delta < 0 ? "감소" : "변동 없음";
    const signedDelta = delta > 0 ? `+${delta}` : `${delta}`;

    return `최근 ${recentHistory.length}일간 ${signedDelta}회 ${direction}`;
  }, [trendHistory]);
  const signalAnalysis = useMemo(
    () =>
      buildSignalAnalysis({
        categoryName: getGalaxyDisplayName(selectedGalaxy),
        trendHistory,
        relatedArticleCount,
        relatedKeywords,
      }),
    [selectedGalaxy, trendHistory, relatedArticleCount, relatedKeywords]
  );
  const selectedNeighborhood = useMemo(() => {
    const categoryIds = new Set([selectedCategory]);
    const nodeIds = new Set([`category:${selectedCategory}`]);

    universeGraph.links.forEach((link) => {
      const sourceIsCategory = link.source.startsWith("category:");
      const targetIsCategory = link.target.startsWith("category:");
      const sourceCategory = sourceIsCategory
        ? link.source.replace("category:", "")
        : null;
      const targetCategory = targetIsCategory
        ? link.target.replace("category:", "")
        : null;

      if (link.type === "category-category") {
        if (sourceCategory === selectedCategory && targetCategory) {
          categoryIds.add(targetCategory);
          nodeIds.add(link.target);
        }

        if (targetCategory === selectedCategory && sourceCategory) {
          categoryIds.add(sourceCategory);
          nodeIds.add(link.source);
        }
      }

      if (link.type === "category-keyword") {
        if (sourceCategory === selectedCategory) {
          nodeIds.add(link.target);
        }

        if (targetCategory === selectedCategory) {
          nodeIds.add(link.source);
        }
      }
    });

    return { categoryIds, nodeIds };
  }, [universeGraph.links, selectedCategory]);

  const densityNodes = useMemo(() => {
    const categoryNodeMap = new Map(
      universeGraph.nodes
        .filter((node) => node.type === "category")
        .map((node) => [node.category, node])
    );
    const categoryLayoutMap = new Map(
      themedGalaxies.map((galaxy) => {
        const clusterCenter = getClusterCenter(galaxy.id);

        return [
          galaxy.id,
          {
            ...galaxy,
            ...(categoryNodeMap.get(galaxy.id) || {}),
            x: clusterCenter.x,
            y: clusterCenter.y,
          },
        ];
      })
    );
    const maxUniverseCount = Math.max(
      ...universeGraph.nodes
        .filter((node) => node.type === "keyword")
        .map((node) => node.count || 0),
      1
    );
    const categoryKeywordIndex = new Map();
    const categoryNodes = themedGalaxies.map((galaxy) => {
      const categoryNode = categoryLayoutMap.get(galaxy.id);
      const mentionStrength =
        Math.sqrt(categoryNode?.totalMentions || 1) /
        Math.sqrt(Math.max(selectedGalaxy?.totalMentions || 1, 1));

      return {
        ...categoryNode,
        id: `category:${galaxy.id}`,
        keyword: getGalaxyDisplayName(galaxy),
        label: getGalaxyDisplayName(galaxy),
        count: categoryNode?.totalMentions || 0,
        size: 10 + galaxy.scale * 4 + Math.min(mentionStrength, 1.2) * 4,
        alpha: selectedCategory === galaxy.id ? 0.98 : 0.72,
        strength: Math.min(mentionStrength, 1),
        hue: galaxy.hue || 195,
        source: "category",
        type: "category",
        category: galaxy.id,
        priority: selectedCategory === galaxy.id ? 6 : 5,
      };
    });

    const keywordNodes = universeGraph.nodes
      .filter((node) => node.type === "keyword")
      .map((node, index) => {
        const categories = node.categories?.length
          ? node.categories.map((category) => ({
              ...category,
              id: normalizeCategoryId(category.id),
            }))
          : [
              {
                id: normalizeCategoryId(node.category || node.mainCategory),
                count: node.count || 1,
              },
            ];
        const primaryCategory =
          normalizeCategoryId(
            categories[0]?.id || node.category || node.mainCategory
          );
        const primaryGalaxy =
          categoryLayoutMap.get(primaryCategory) ||
          categoryLayoutMap.get(DEFAULT_CATEGORY);
        const isShared = categories.length > 1;
        const usedIndex = categoryKeywordIndex.get(primaryCategory) || 0;
        categoryKeywordIndex.set(primaryCategory, usedIndex + 1);
        const position = getKeywordClusterPosition({
          categories,
          categoryIndex: usedIndex,
          globalIndex: index,
          scale: primaryGalaxy?.scale || 0.9,
        });

        const strength = (node.count || 0) / maxUniverseCount;

        return {
          ...node,
          id: node.id || `keyword:${node.keyword}`,
          keyword: node.keyword,
          label: node.label || node.keyword,
          x: Math.min(84, Math.max(16, position.x)),
          y: Math.min(88, Math.max(12, position.y)),
          size: isShared ? 4.4 + strength * 8.2 : 2.7 + strength * 7.4,
          alpha:
            selectedKeyword === node.keyword
              ? 1
              : isShared
                ? 0.56 + strength * 0.24
                : 0.28 + strength * 0.38,
          strength,
          cluster: getGalaxyDisplayName({ id: primaryCategory }),
          hue: primaryGalaxy?.hue || 195,
          source: isShared ? "shared" : "network",
          type: "keyword",
          category: primaryCategory,
          priority: isShared ? 3 : 2,
          count: node.count || 0,
        };
      });

    return [...categoryNodes, ...keywordNodes].slice(0, 210);
  }, [
    universeGraph,
    themedGalaxies,
    selectedCategory,
    selectedKeyword,
    selectedGalaxy,
  ]);

  const densityLinks = useMemo(() => {
    const nodeMap = new Map(densityNodes.map((node) => [node.id, node]));
    const maxUniverseLinkCount = Math.max(
      ...universeGraph.links.map((link) => link.count || 0),
      1
    );

    return universeGraph.links
      .map((link) => {
        const from = nodeMap.get(link.source);
        const to = nodeMap.get(link.target);

        if (!from || !to) {
          return null;
        }

        const touchesSelectedKeyword =
          link.type === "keyword-keyword" &&
          (from.keyword === selectedKeyword || to.keyword === selectedKeyword);
        const touchesSelectedCategory =
          from.category === selectedCategory || to.category === selectedCategory;
        const visualType =
          link.type === "category-category"
            ? "category"
            : link.type === "category-keyword"
              ? touchesSelectedCategory
                ? "belongs-active"
                : "belongs"
              : touchesSelectedKeyword
                ? "related"
                : "network";

        return {
          from,
          to,
          strength: (link.count || 0) / maxUniverseLinkCount,
          length: Math.hypot(from.x - to.x, from.y - to.y),
          relationType: link.type,
          touchesSelectedCategory,
          touchesNeighborhood:
            selectedNeighborhood.nodeIds.has(from.id) ||
            selectedNeighborhood.nodeIds.has(to.id),
          type: visualType,
        };
      })
      .filter(Boolean)
      .slice(0, 520);
  }, [
    densityNodes,
    universeGraph,
    selectedKeyword,
    selectedCategory,
    selectedNeighborhood,
  ]);

  const graphDetailLevel = useMemo(() => {
    if (graphZoom < 1.06) {
      return "overview";
    }

    if (graphZoom < 1.28) {
      return "category";
    }

    return "detail";
  }, [graphZoom]);

  const focusedGraphNode = useMemo(() => {
    if (focusedNodeId) {
      const focusedNode = densityNodes.find((node) => node.id === focusedNodeId);

      if (focusedNode) {
        return focusedNode;
      }
    }

    return (
      densityNodes.find((node) => node.id === `category:${selectedCategory}`) ||
      null
    );
  }, [densityNodes, focusedNodeId, selectedCategory]);
  const projectGraphPoint = (node) => {
    if (!focusedGraphNode || graphZoom <= 1.02) {
      return { x: node.x, y: node.y };
    }

    const panStrength = Math.min(1, Math.max(0.52, graphZoom - 0.34));

    return {
      x: node.x + (50 - focusedGraphNode.x) * panStrength,
      y: node.y + (50 - focusedGraphNode.y) * panStrength,
    };
  };
  const visibleArticles = articlesExpanded ? articles : articles.slice(0, 5);
  const hiddenArticleCount = Math.max(0, articles.length - 5);

  const handleSearch = (event) => {
    event.preventDefault();
    selectKeyword(keyword);
  };

  const selectGalaxy = (galaxyId) => {
    setFocusedNodeId(`category:${galaxyId}`);
    setGraphZoom((currentZoom) => Math.max(currentZoom, 1.18));

    if (galaxyId === selectedCategory) {
      return;
    }

    setSelectedCategory(galaxyId);
    setArticlesExpanded(false);
  };

  const handleGraphWheel = (event) => {
    if (event.target.closest(".article-list, .trend-list")) {
      return;
    }

    event.preventDefault();

    setGraphZoom((currentZoom) => {
      const nextZoom =
        currentZoom + (event.deltaY > 0 ? -0.08 : 0.07);

      return Math.min(1.75, Math.max(0.72, Number(nextZoom.toFixed(2))));
    });
  };

  return (
    <main
      className="app app-inside"
      style={{
        "--mouse-x": `${mousePosition.x}%`,
        "--mouse-y": `${mousePosition.y}%`,
        "--graph-zoom": graphZoom,
        "--focus-x": `${focusedGraphNode?.x || 50}%`,
        "--focus-y": `${focusedGraphNode?.y || 50}%`,
        "--galaxy-color": selectedGalaxy?.color || "#38bdf8",
        "--galaxy-accent": selectedGalaxy?.accent || "#2dd4bf",
        "--galaxy-glow": hexToRgba(selectedGalaxy?.color || "#38bdf8", 0.22),
        "--galaxy-accent-glow": hexToRgba(
          selectedGalaxy?.accent || "#2dd4bf",
          0.16
        ),
        "--galaxy-core-x": `${selectedGalaxy?.core?.x || 50}%`,
        "--galaxy-core-y": `${selectedGalaxy?.core?.y || 46}%`,
      }}
    >
      {showIntro && <IntroScreen onEnter={() => setShowIntro(false)} />}
      <section
        className="density-hero density-hero-inside"
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
              (() => {
                const fromPoint = projectGraphPoint(link.from);
                const toPoint = projectGraphPoint(link.to);

                return (
                  <line
                    key={`${link.from.keyword}-${link.to.keyword}-${index}`}
                    x1={fromPoint.x}
                    y1={fromPoint.y}
                    x2={toPoint.x}
                    y2={toPoint.y}
                    className={`density-link-${link.type} ${
                      link.touchesSelectedCategory ? "is-neighborhood" : ""
                    }`}
                    strokeWidth={
                      link.type === "category"
                        ? 0.06 + link.strength * 0.08
                        : link.type === "belongs-active"
                          ? 0.22 + link.strength * 0.32
                          : link.type === "belongs"
                            ? 0.06 + link.strength * 0.1
                            : link.type === "related"
                              ? 0.06 + link.strength * 0.2
                              : 0.018 + link.strength * 0.06
                    }
                    opacity={(() => {
                      const baseOpacity =
                        link.type === "category"
                          ? Math.max(0.025, 0.09 - (link.length || 0) / 480)
                          : link.type === "belongs-active"
                            ? Math.max(0.52, 0.9 - (link.length || 0) / 190)
                            : link.type === "belongs"
                              ? Math.max(0.05, 0.14 - (link.length || 0) / 360)
                              : link.type === "related"
                          ? Math.max(0.24, 0.62 - (link.length || 0) / 170)
                                : Math.max(0.055, 0.18 - (link.length || 0) / 320);
                      const isCategoryLink = link.type === "category";
                      const isBelongsLink =
                        link.type === "belongs" || link.type === "belongs-active";
                      const touchesSelectedCategory =
                        link.from.category === selectedCategory ||
                        link.to.category === selectedCategory;
                      const touchesFocusedNode =
                        focusedGraphNode &&
                        (link.from.id === focusedGraphNode.id ||
                          link.to.id === focusedGraphNode.id);

                      if (graphDetailLevel === "overview") {
                        if (link.type === "belongs-active") {
                          return Math.min(baseOpacity, 0.86);
                        }

                        return isCategoryLink ? Math.min(baseOpacity, 0.08) : 0;
                      }

                      if (touchesFocusedNode) {
                        return Math.min(baseOpacity * 1.8, 0.78);
                      }

                      if (graphDetailLevel === "category") {
                        if (isBelongsLink) {
                          return touchesSelectedCategory ? baseOpacity : baseOpacity * 0.18;
                        }

                        return isCategoryLink ? baseOpacity * 0.45 : baseOpacity * 0.2;
                      }

                      return link.touchesNeighborhood ? baseOpacity : baseOpacity * 0.34;
                    })()}
                  />
                );
              })()
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

          {densityNodes.map((node) => {
            const isCategoryNode = node.type === "category";
            const isSelected =
              isCategoryNode
                ? node.category === selectedCategory
                : node.keyword === selectedKeyword;
            const isRelated = !isCategoryNode && relatedKeywordSet.has(node.keyword);
            const showsNodeLabel =
              !isCategoryNode && labeledKeywordSet.has(node.keyword);
            const isSelectedCategoryKeyword =
              !isCategoryNode && node.category === selectedCategory;
            const isNeighborhoodNode = selectedNeighborhood.nodeIds.has(node.id);
            const isNeighborCategory =
              isCategoryNode &&
              node.category !== selectedCategory &&
              selectedNeighborhood.categoryIds.has(node.category);
            const zoomAlpha =
              graphDetailLevel === "overview"
                ? isCategoryNode
                  ? isSelected || isNeighborCategory
                    ? Math.max(node.alpha, 0.9)
                    : Math.min(node.alpha, 0.36)
                  : isSelectedCategoryKeyword || isRelated || isSelected
                    ? Math.max(node.alpha, 0.78)
                    : 0
                : graphDetailLevel === "category"
                  ? isCategoryNode
                    ? isSelected || isNeighborCategory
                      ? Math.max(node.alpha, 0.9)
                      : Math.min(node.alpha, 0.32)
                    : isSelectedCategoryKeyword || isRelated || isSelected
                      ? Math.max(node.alpha, 0.78)
                      : Math.min(node.alpha, 0.08)
                  : isNeighborhoodNode || isSelected || isRelated
                    ? Math.max(node.alpha, 0.62)
                    : Math.min(node.alpha, 0.28);
            const visibleAlpha =
              graphDetailLevel === "overview" &&
              !isCategoryNode &&
              !(isSelectedCategoryKeyword || isRelated || isSelected)
                ? 0
                : selectedKeyword
                  ? isSelected
                    ? 1
                    : isRelated
                      ? Math.max(zoomAlpha, 0.68)
                      : isCategoryNode
                        ? Math.max(zoomAlpha, 0.54)
                        : zoomAlpha
                  : zoomAlpha;
            const isInteractable =
              isCategoryNode ||
              (graphDetailLevel === "overview" &&
                (isSelectedCategoryKeyword || isRelated || isSelected)) ||
              graphDetailLevel === "detail" ||
              (graphDetailLevel === "category" &&
                (isSelectedCategoryKeyword || isRelated || isSelected));
            const projectedNode = projectGraphPoint(node);
            const visualSize =
              !isCategoryNode && isSelected
                ? node.size + 7
                : !isCategoryNode && isRelated
                  ? node.size + 2
                  : node.size;

            return (
              <button
                key={node.id || node.keyword}
                className={`density-node density-node-${node.source} ${
                  isSelected ? "is-selected" : isRelated ? "is-related" : "is-muted"
                } ${isNeighborCategory ? "is-neighbor-category" : ""} ${
                  isNeighborhoodNode ? "is-in-neighborhood" : "is-out-neighborhood"
                } ${!isInteractable ? "is-hidden-by-zoom" : ""}`}
                type="button"
                title={
                  isCategoryNode
                    ? `${formatDisplayText(node.label)} · ${node.articleCount || 0}개 기사`
                    : `${formatDisplayText(node.keyword)} · ${node.count}회 언급`
                }
                style={{
                  left: `${projectedNode.x}%`,
                  top: `${projectedNode.y}%`,
                  width: `${visualSize}px`,
                  height: `${visualSize}px`,
                  opacity: visibleAlpha,
                  pointerEvents: isInteractable ? "auto" : "none",
                  "--node-visual-size": `${visualSize}px`,
                  "--node-hue": node.hue,
                }}
                onClick={() => {
                  if (isCategoryNode) {
                    selectGalaxy(node.category);
                    return;
                  }

                  setFocusedNodeId(node.id);
                  setGraphZoom((currentZoom) => Math.max(currentZoom, 1.36));
                  setKeyword(node.keyword);
                  selectKeyword(node.keyword, node.category || selectedCategory);
                }}
              >
                <span className="node-tooltip">
                  <strong>{formatDisplayText(node.label || node.keyword)}</strong>
                  <small>
                    {isCategoryNode
                      ? `기사 ${node.articleCount || 0}개 · 키워드 ${node.keywordCount || 0}개`
                      : `${getGalaxyDisplayName({ id: node.category })} · ${node.count || 0}회 언급`}
                  </small>
                </span>
                {showsNodeLabel && (
                  <span className="node-inline-label">
                    {formatDisplayText(node.label || node.keyword)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <header className="app-header">
          <div>
            <p className="eyebrow">현재 분야</p>
            <h1>{getGalaxyDisplayName(selectedGalaxy)}</h1>
            <p className="subtitle">
              {getGalaxyDescription(selectedGalaxy)}
            </p>
            <div className="galaxy-brief" aria-label="선택한 분야 요약">
              <span>
                <strong>{formatDisplayText(selectedGalaxy?.topKeyword || "-")}</strong>
                분야 대표 키워드
              </span>
              <span>
                <strong>{selectedGalaxy?.totalMentions || 0}</strong>
                분야 전체 언급량
              </span>
              <span>
                <strong>{selectedGalaxy?.keywordCount || 0}</strong>
                관찰 키워드
              </span>
            </div>
          </div>
          <div className="header-actions">
            <form className="search-form" onSubmit={handleSearch}>
              <label htmlFor="keyword-search">검색</label>
              <input
                id="keyword-search"
                type="text"
                value={formatDisplayText(keyword)}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="키워드 검색"
              />
              <button type="submit" aria-label="키워드 분석">⌕</button>
            </form>
          </div>
        </header>

        <section className="control-strip" aria-label="뉴스 분야 선택">
          <div className="galaxy-switcher">
            {themedGalaxies.map((galaxy) => (
              <button
                key={galaxy.id}
                className={selectedCategory === galaxy.id ? "is-active" : ""}
                type="button"
                style={{ "--galaxy-option-color": galaxy.color }}
                onClick={() => selectGalaxy(galaxy.id)}
              >
                <i />
                <span>{getGalaxyDisplayName(galaxy)}</span>
                <strong>{galaxy.articleCount}</strong>
              </button>
            ))}
          </div>
          <p className="refresh-note">
            {latestDate === "-" ? "데이터 대기 중" : `${latestDate} 업데이트`}
          </p>
        </section>

      <section className="insight-grid">
        <aside className="panel trend-panel">
          <div className="panel-heading">
            <span>소스 노드</span>
            <h2>{getGalaxyDisplayName(selectedGalaxy)} 키워드</h2>
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
                  <strong>{formatDisplayText(trend.keyword)}</strong>
                  <small>{trend.date}</small>
                </span>
                <span className="count-badge">{trend.count}</span>
              </button>
            ))}
          </div>

          <PipelineStatus />
        </aside>

        <section className="panel chart-panel">
          <div className="panel-heading detail-heading">
            <div>
              <span>상세 보기</span>
              <h2>{formatDisplayText(selectedKeyword) || "키워드"} 언급 추이</h2>
            </div>
            <div className="time-filter" aria-label="기간 필터">
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
          </div>
          <SignalSummaryCard analysis={signalAnalysis} />
          <p className="trend-summary">{trendDeltaSummary}</p>

          <div className="chart-box">
            {trendHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
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
                    stroke={selectedGalaxy?.accent || "#7dd3fc"}
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#f8fafc", strokeWidth: 2 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="empty-message">
                선택한 키워드의 상세 데이터가 없습니다.
              </p>
            )}
          </div>

          <section className="co-keyword-panel" aria-label="함께 등장한 키워드">
            <div className="panel-heading compact">
              <span>맥락 신호</span>
              <h2>함께 감지된 신호</h2>
            </div>
            {relatedKeywords.length > 0 ? (
              <div className="co-keyword-list">
                {relatedKeywords.slice(0, 8).map((item) => (
                  <button
                    key={item.keyword}
                    className="co-keyword-chip"
                    type="button"
                    title={`${formatDisplayText(item.keyword)} · ${item.count}회 함께 등장`}
                    onClick={() => {
                      setFocusedNodeId(`keyword:${item.keyword}`);
                      setGraphZoom((currentZoom) => Math.max(currentZoom, 1.36));
                      setKeyword(item.keyword);
                      selectKeyword(item.keyword);
                    }}
                  >
                    <span>{formatDisplayText(item.keyword)}</span>
                    <strong>{item.count}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-message">
                함께 감지된 키워드가 아직 충분하지 않아요.
              </p>
            )}
          </section>

          <div
            className={`article-list ${
              articlesExpanded ? "is-expanded" : "is-collapsed"
            }`}
          >
            <div className="panel-heading compact">
              <span>근거</span>
              <h2>주요 근거 기사</h2>
            </div>
            {articles.length > 0 ? (
              <>
                <p className="evidence-note">
                  근거 기사 {relatedArticleCount}건 중 주요 기사{" "}
                  {visibleArticles.length}건
                </p>
                <div className="article-list-wrapper">
                  {visibleArticles.map((article) => (
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
                ))}
                  {!articlesExpanded && hiddenArticleCount > 0 && (
                    <div className="article-fade" aria-hidden="true" />
                  )}
                </div>
                {hiddenArticleCount > 0 && (
                  <button
                    className="article-expand-button"
                    type="button"
                    aria-label={
                      articlesExpanded ? "연관 기사 접기" : "연관 기사 펼치기"
                    }
                    onClick={() => setArticlesExpanded((expanded) => !expanded)}
                  >
                    {articlesExpanded ? "⌃" : "⌄"}
                  </button>
                )}
              </>
            ) : (
              <p className="empty-message">연관 기사 근거가 없습니다.</p>
            )}
          </div>
        </section>
      </section>
      </section>

    </main>
  );
}

export default App;

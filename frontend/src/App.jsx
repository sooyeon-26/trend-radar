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
  { label: "Today", value: "1" },
  { label: "3D", value: "3" },
  { label: "7D", value: "7" },
];
const DEFAULT_CATEGORY = "society";
const GALAXY_FALLBACKS = {
  society: {
    name: "Society",
    color: "#38bdf8",
    accent: "#2dd4bf",
    hue: 195,
    description: "A dense urban galaxy where incidents and public systems converge.",
    signalLabel: "Civic signals",
    core: { x: 50, y: 46 },
  },
  politics: {
    name: "Politics",
    color: "#f43f5e",
    accent: "#f97316",
    hue: 348,
    description: "A charged red cluster where power, elections, and policy collide.",
    signalLabel: "Policy signals",
    core: { x: 35, y: 38 },
  },
  economy: {
    name: "Economy",
    color: "#f59e0b",
    accent: "#84cc16",
    hue: 38,
    description: "A bright trade galaxy shaped by markets, capital, and prices.",
    signalLabel: "Market signals",
    core: { x: 66, y: 36 },
  },
  technology: {
    name: "IT",
    color: "#22c55e",
    accent: "#06b6d4",
    hue: 145,
    description: "A green circuit galaxy linking AI, chips, platforms, and data.",
    signalLabel: "Tech signals",
    core: { x: 36, y: 64 },
  },
  world: {
    name: "World",
    color: "#818cf8",
    accent: "#38bdf8",
    hue: 238,
    description: "A distant galaxy where diplomacy, conflict, and global shifts ripple outward.",
    signalLabel: "Global signals",
    core: { x: 68, y: 64 },
  },
  culture: {
    name: "Culture",
    color: "#ec4899",
    accent: "#facc15",
    hue: 326,
    description: "A vivid nebula of content, performance, fandom, and public taste.",
    signalLabel: "Culture signals",
    core: { x: 26, y: 56 },
  },
  sports: {
    name: "Sports",
    color: "#14b8a6",
    accent: "#a3e635",
    hue: 174,
    description: "A fast-moving galaxy of games, records, rivalries, and fan energy.",
    signalLabel: "Game signals",
    core: { x: 80, y: 48 },
  },
  science: {
    name: "Science",
    color: "#a855f7",
    accent: "#22d3ee",
    hue: 272,
    description: "A deep exploration galaxy for research, space, climate, and discovery.",
    signalLabel: "Research signals",
    core: { x: 52, y: 72 },
  },
  health: {
    name: "Health",
    color: "#06b6d4",
    accent: "#fb7185",
    hue: 188,
    description: "A life-signal galaxy tracking medicine, disease, safety, and care.",
    signalLabel: "Health signals",
    core: { x: 50, y: 24 },
  },
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

const CHO_ROMAN = [
  "g",
  "kk",
  "n",
  "d",
  "tt",
  "r",
  "m",
  "b",
  "pp",
  "s",
  "ss",
  "",
  "j",
  "jj",
  "ch",
  "k",
  "t",
  "p",
  "h",
];
const JUNG_ROMAN = [
  "a",
  "ae",
  "ya",
  "yae",
  "eo",
  "e",
  "yeo",
  "ye",
  "o",
  "wa",
  "wae",
  "oe",
  "yo",
  "u",
  "wo",
  "we",
  "wi",
  "yu",
  "eu",
  "ui",
  "i",
];
const JONG_ROMAN = [
  "",
  "k",
  "k",
  "ks",
  "n",
  "nj",
  "nh",
  "t",
  "l",
  "lk",
  "lm",
  "lb",
  "ls",
  "lt",
  "lp",
  "lh",
  "m",
  "p",
  "ps",
  "t",
  "t",
  "ng",
  "t",
  "t",
  "k",
  "t",
  "p",
  "t",
];

function romanizeHangul(text) {
  return String(text)
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);

      if (code < 0xac00 || code > 0xd7a3) {
        return character;
      }

      const offset = code - 0xac00;
      const cho = Math.floor(offset / 588);
      const jung = Math.floor((offset % 588) / 28);
      const jong = offset % 28;

      return `${CHO_ROMAN[cho]}${JUNG_ROMAN[jung]}${JONG_ROMAN[jong]}`;
    })
    .join("");
}

function formatDisplayText(value) {
  return romanizeHangul(value || "");
}

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
  { x: 48, y: 52 },
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
  const [galaxies, setGalaxies] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
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
  const [viewMode, setViewMode] = useState("inside");
  const [articlesExpanded, setArticlesExpanded] = useState(false);

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
      axios.get(`${API_BASE_URL}/clusters?${categoryQuery}`),
      axios.get(`${API_BASE_URL}/network?days=${selectedRange}&${categoryQuery}`),
    ])
      .then(([galaxyResponse, topResponse, clusterResponse, networkResponse]) => {
        const topTrends = topResponse.data.trends || [];

        setGalaxies(galaxyResponse.data.galaxies || []);
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
          selectKeyword(nextKeyword, category);
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

  const selectKeyword = (searchKeyword, category = selectedCategory) => {
    const trimmedKeyword = searchKeyword.trim();

    if (!trimmedKeyword) {
      return;
    }

    const encodedKeyword = encodeURIComponent(trimmedKeyword);
    const categoryQuery = getCategoryQuery(category);

    setSelectedKeyword(trimmedKeyword);
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

  const selectedMentions = trendHistory.reduce(
    (sum, trend) => sum + trend.count,
    0
  );
  const themedGalaxies = useMemo(
    () =>
      galaxies.map((galaxy) => ({
        ...(GALAXY_FALLBACKS[galaxy.id] || {}),
        ...galaxy,
        core:
          galaxy.core ||
          GALAXY_FALLBACKS[galaxy.id]?.core || { x: 50, y: 46 },
      })),
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
  const relatedKeywordSet = useMemo(
    () => new Set(relatedKeywords.map((item) => item.keyword)),
    [relatedKeywords]
  );
  const trendDeltaSummary = useMemo(() => {
    if (trendHistory.length < 2) {
      return "Waiting for trend movement";
    }

    const recentHistory = trendHistory.slice(-3);
    const firstCount = recentHistory[0]?.count || 0;
    const lastCount = recentHistory[recentHistory.length - 1]?.count || 0;
    const delta = lastCount - firstCount;
    const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const signedDelta = delta > 0 ? `+${delta}` : `${delta}`;

    return `${signedDelta} mentions ${direction} over ${recentHistory.length} days`;
  }, [trendHistory]);
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
    const baseHue = selectedGalaxy?.hue || 195;

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
        cluster: index < 10 ? "Top 10" : "Full network",
        clusterIndex: 5,
        hue: index < 10 ? baseHue : baseHue + 8,
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
          hue: baseHue + (clusterIndex - 2) * 9,
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
        hue: baseHue,
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
        cluster: "Trending keywords",
        clusterIndex: 5,
        hue: baseHue + 10,
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
        cluster: selectedKeyword || "Selected keyword",
        clusterIndex: 6,
        hue: baseHue - 24,
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
          x: currentSelectedNode?.x || 48,
          y: currentSelectedNode?.y || 52,
          size: 22,
          alpha: 0.96,
          strength: 1,
          cluster: "Selected keyword",
          clusterIndex: 6,
          hue: baseHue - 24,
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
    selectedGalaxy,
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
        length: Math.hypot(from.x - to.x, from.y - to.y),
        type: isSelectedLink ? "related" : isTopLink ? "top" : "network",
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
            length: Math.hypot(selectedNode.x - relatedNode.x, selectedNode.y - relatedNode.y),
            type: "related",
          });
        }
      });
    }

    return links.slice(0, 220);
  }, [
    densityNodes,
    network,
    relatedKeywords,
    selectedKeyword,
    maxRelatedCount,
  ]);

  const selectedGraphNode = useMemo(
    () => densityNodes.find((node) => node.keyword === selectedKeyword),
    [densityNodes, selectedKeyword]
  );
  const visibleArticles = articlesExpanded ? articles : articles.slice(0, 5);
  const hiddenArticleCount = Math.max(0, articles.length - 5);

  const handleSearch = (event) => {
    event.preventDefault();
    selectKeyword(keyword);
  };

  const selectGalaxy = (galaxyId) => {
    if (galaxyId === selectedCategory) {
      setViewMode("inside");
      setGraphZoom(1);
      return;
    }

    setSelectedCategory(galaxyId);
    setGraphZoom(1);
    setViewMode("inside");
    setArticlesExpanded(false);
  };

  const showUniverse = () => {
    setViewMode("universe");
    setGraphZoom(0.52);
  };

  const handleGraphWheel = (event) => {
    if (event.target.closest(".article-list, .trend-list")) {
      return;
    }

    event.preventDefault();

    if (viewMode === "universe") {
      if (event.deltaY < 0) {
        setViewMode("inside");
        setGraphZoom(0.78);
      }

      return;
    }

    setGraphZoom((currentZoom) => {
      const nextZoom =
        currentZoom + (event.deltaY > 0 ? -0.1 : 0.08);
      const clampedZoom = Math.min(2.2, Math.max(0.5, Number(nextZoom.toFixed(2))));

      if (clampedZoom <= 0.62 && event.deltaY > 0) {
        setViewMode("universe");
      }

      return clampedZoom;
    });
  };

  return (
    <main
      className={`app app-${viewMode}`}
      style={{
        "--mouse-x": `${mousePosition.x}%`,
        "--mouse-y": `${mousePosition.y}%`,
        "--graph-zoom": graphZoom,
        "--focus-x": `${selectedGraphNode?.x || 48}%`,
        "--focus-y": `${selectedGraphNode?.y || 52}%`,
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
      <section
        className={`density-hero density-hero-${viewMode}`}
        aria-label="Keyword density map"
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
                  ? 0.16 + link.strength * 0.42
                  : 0.025 + link.strength * 0.1
              }
              opacity={
                link.type === "related"
                  ? Math.max(0.34, 0.78 - (link.length || 0) / 130)
                  : Math.max(0.06, 0.18 - (link.length || 0) / 280)
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

          {densityNodes.map((node) => {
            const isSelected = node.keyword === selectedKeyword;
            const isRelated = relatedKeywordSet.has(node.keyword);
            const visibleAlpha = selectedKeyword
              ? isSelected
                ? 1
                : isRelated
                  ? Math.max(node.alpha, 0.68)
                  : Math.min(node.alpha, 0.58)
              : node.alpha;

            return (
              <button
                key={node.keyword}
                className={`density-node density-node-${node.source} ${
                  isSelected ? "is-selected" : isRelated ? "is-related" : "is-muted"
                }`}
                type="button"
                title={`${formatDisplayText(node.keyword)} · ${node.count} mentions · ${node.cluster}`}
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  width: `${node.size}px`,
                  height: `${node.size}px`,
                  opacity: visibleAlpha,
                  "--node-hue": node.hue,
                }}
                onClick={() => {
                  setKeyword(node.keyword);
                  selectKeyword(node.keyword);
                }}
              >
                <span>{formatDisplayText(node.keyword)}</span>
              </button>
            );
          })}
        </div>

        <div className="universe-stage" aria-hidden={viewMode !== "universe"}>
          <div className="universe-orbits" />
          {themedGalaxies.map((galaxy) => {
            const isSelectedGalaxy = selectedCategory === galaxy.id;
            const mentionScale = Math.min(
              1.4,
              0.74 + Math.sqrt(galaxy.totalMentions || 1) / 28
            );

            return (
              <button
                key={galaxy.id}
                className={`galaxy-node ${
                  isSelectedGalaxy ? "is-selected" : ""
                }`}
                type="button"
                title={`${galaxy.name} · ${galaxy.articleCount} articles · Top keyword ${formatDisplayText(galaxy.topKeyword || "Pending")}`}
                style={{
                  left: `${galaxy.x}%`,
                  top: `${galaxy.y}%`,
                  width: `${86 * galaxy.scale * mentionScale}px`,
                  height: `${86 * galaxy.scale * mentionScale}px`,
                  "--galaxy-node-color": galaxy.color,
                }}
                onClick={() => selectGalaxy(galaxy.id)}
              >
                <span>{galaxy.name}</span>
                <strong>{formatDisplayText(galaxy.topKeyword || "-")}</strong>
                <small>{galaxy.articleCount} articles</small>
              </button>
            );
          })}
        </div>

        <button
          className="universe-toggle"
          type="button"
          onClick={viewMode === "universe" ? () => {
            setViewMode("inside");
            setGraphZoom(1);
          } : showUniverse}
        >
          {viewMode === "universe" ? "Enter Galaxy" : "All Galaxies"}
        </button>

        <header className="app-header">
          <div>
            <p className="eyebrow">Current Galaxy</p>
            <h1>{selectedGalaxy?.name || "Society"} Galaxy</h1>
            <p className="subtitle">
              {selectedGalaxy?.description || "Waiting for signals in this field."}
            </p>
            <div className="galaxy-brief" aria-label="Selected galaxy summary">
              <span>
                <strong>{formatDisplayText(selectedGalaxy?.topKeyword || "-")}</strong>
                Top keyword
              </span>
              <span>
                <strong>{selectedGalaxy?.totalMentions || 0}</strong>
                {selectedGalaxy?.signalLabel || "Signals"}
              </span>
              <span>
                <strong>{selectedGalaxy?.keywordCount || 0}</strong>
                Observed keywords
              </span>
            </div>
          </div>
          <div className="header-actions">
            <form className="search-form" onSubmit={handleSearch}>
              <label htmlFor="keyword-search">Search</label>
              <input
                id="keyword-search"
                type="text"
                value={formatDisplayText(keyword)}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="Search keyword"
              />
              <button type="submit" aria-label="Analyze keyword">⌕</button>
            </form>
          </div>
        </header>

        <section className="control-strip" aria-label="Choose news galaxy">
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
                <span>{galaxy.name}</span>
                <strong>{galaxy.articleCount}</strong>
              </button>
            ))}
          </div>
          <p className="refresh-note">
            {latestDate === "-" ? "Waiting for data" : `Updated ${latestDate}`}
          </p>
        </section>

      <section className="insight-grid">
        <aside className="panel trend-panel">
          <div className="panel-heading">
            <span>Source Nodes</span>
            <h2>{selectedGalaxy?.name || "Society"} Keywords</h2>
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
        </aside>

        <section className="map-panel">
          <div className="map-toolbar">
            <div>
              <span>Relationship Map</span>
              <strong>{formatDisplayText(selectedKeyword) || "Select keyword"}</strong>
            </div>
            <div className="map-legend" aria-label="Network legend">
              <span><i className="legend-line" /> Co-occurrence</span>
              <span><i className="legend-node" /> Related keyword</span>
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
            title={`${formatDisplayText(selectedKeyword) || "Select keyword"} · ${selectedMentions} mentions`}
          >
            <span>{formatDisplayText(selectedKeyword) || "Select keyword"}</span>
            <strong>{selectedMentions}</strong>
          </button>

          {relationNodes.length > 0 ? (
            relationNodes.map((relatedKeyword) => (
              <button
                key={relatedKeyword.keyword}
                className="related-node"
                type="button"
                title={`${formatDisplayText(relatedKeyword.keyword)} · ${relatedKeyword.count} co-occurrences`}
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
                <span>{formatDisplayText(relatedKeyword.keyword)}</span>
                <strong>{relatedKeyword.count}</strong>
              </button>
            ))
          ) : (
            <p className="network-empty">
              No keywords have appeared together in the same article yet.
            </p>
          )}

          <article className="relation-summary">
            <span>Strongest Link</span>
            <strong>{formatDisplayText(strongestRelation?.keyword || "-")}</strong>
            <small>
              {strongestRelation
                ? `${strongestRelation.count} co-occurrences`
                : "No relationship"}
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
                    <span>{formatDisplayText(item.keyword)}</span>
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
                <small>No relationship strength data</small>
              )}
            </div>
          </aside>
        </section>

        <section className="panel chart-panel">
          <div className="panel-heading detail-heading">
            <div>
              <span>Detail View</span>
              <h2>{formatDisplayText(selectedKeyword) || "Keyword"} Mention Trend</h2>
            </div>
            <div className="time-filter" aria-label="Time range filter">
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
                No detail data for the selected keyword.
              </p>
            )}
          </div>

          <div
            className={`article-list ${
              articlesExpanded ? "is-expanded" : "is-collapsed"
            }`}
          >
            <div className="panel-heading compact">
              <span>Evidence</span>
              <h2>Related Articles</h2>
            </div>
            {articles.length > 0 ? (
              <>
                <div className="article-list-wrapper">
                  {visibleArticles.map((article) => (
                  <a
                    key={article.url}
                    className="article-link"
                    href={article.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>{formatDisplayText(article.title)}</strong>
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
                      articlesExpanded ? "Collapse related articles" : "Expand related articles"
                    }
                    onClick={() => setArticlesExpanded((expanded) => !expanded)}
                  >
                    {articlesExpanded ? "⌃" : "⌄"}
                  </button>
                )}
              </>
            ) : (
              <p className="empty-message">No related article evidence.</p>
            )}
          </div>
        </section>
      </section>
      </section>

    </main>
  );
}

export default App;

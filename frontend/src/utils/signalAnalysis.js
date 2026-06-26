const SIGNAL_TYPE = {
  SURGE: "급상승 신호",
  REPEAT: "반복 감지",
  SPREAD: "관계 확산",
  WAVE: "이슈 파동",
  GENERAL: "일반 신호",
};

function getDirectionalParticle(text) {
  const lastChar = text.charCodeAt(text.length - 1);

  if (lastChar < 0xac00 || lastChar > 0xd7a3) {
    return "로";
  }

  const jong = (lastChar - 0xac00) % 28;

  return jong === 0 || jong === 8 ? "로" : "으로";
}

export function calculateGrowthRate(trendHistory = []) {
  if (trendHistory.length < 2) {
    return null;
  }

  const latest = trendHistory[trendHistory.length - 1]?.count || 0;
  const previous = trendHistory[trendHistory.length - 2]?.count || 0;

  if (previous <= 0) {
    return latest > 0 ? null : 0;
  }

  return Math.round(((latest - previous) / previous) * 100);
}

export function calculateGrowthScore(growthRate) {
  if (growthRate === null || growthRate === undefined) {
    return 0;
  }

  if (growthRate >= 50) {
    return 20;
  }

  if (growthRate >= 30) {
    return 15;
  }

  if (growthRate >= 10) {
    return 8;
  }

  return 0;
}

export function calculateSignalScore({
  mentionCount = 0,
  relatedArticleCount = 0,
  relatedKeywordCount = 0,
  growthRate = null,
}) {
  const rawScore =
    mentionCount +
    relatedArticleCount * 5 +
    relatedKeywordCount * 4 +
    calculateGrowthScore(growthRate);

  return Math.min(100, Math.max(0, Math.round(rawScore)));
}

export function classifySignalType({
  mentionCount = 0,
  relatedArticleCount = 0,
  relatedKeywordCount = 0,
  growthRate = null,
}) {
  if (
    mentionCount >= 30 &&
    relatedArticleCount >= 5 &&
    relatedKeywordCount >= 6
  ) {
    return SIGNAL_TYPE.WAVE;
  }

  if (growthRate !== null && growthRate >= 30) {
    return SIGNAL_TYPE.SURGE;
  }

  if (relatedKeywordCount >= 7) {
    return SIGNAL_TYPE.SPREAD;
  }

  if (relatedArticleCount >= 5) {
    return SIGNAL_TYPE.REPEAT;
  }

  return SIGNAL_TYPE.GENERAL;
}

export function createSignalSummary({
  categoryName,
  mentionCount,
  relatedKeywords = [],
  growthRate = null,
  signalType,
}) {
  const topRelatedKeywords = relatedKeywords
    .slice(0, 3)
    .map((item) => item.keyword)
    .filter(Boolean);
  const relatedPhrase =
    topRelatedKeywords.length > 0
      ? `${topRelatedKeywords.join(", ")} 키워드와 함께 등장했고,`
      : "함께 감지된 키워드가 아직 충분하지 않아,";
  const strengthPhrase =
    mentionCount > 0
      ? `오늘 ${categoryName} 분야에서 ${mentionCount}회 감지된 신호입니다.`
      : "아직 약한 신호입니다.";
  const classificationPhrase =
    growthRate === null
      ? `오늘 수집 데이터 기준으로 ${signalType}${getDirectionalParticle(
          signalType
        )} 분류되었습니다.`
      : `전일 대비 ${growthRate >= 0 ? "+" : ""}${growthRate}% ${
          growthRate >= 0 ? "증가" : "감소"
        }해 ${signalType}${getDirectionalParticle(
          signalType
        )} 분류되었습니다.`;

  return [
    strengthPhrase,
    `${relatedPhrase} ${classificationPhrase}`,
  ];
}

export function buildSignalAnalysis({
  categoryName,
  trendHistory = [],
  relatedArticleCount = 0,
  relatedKeywords = [],
}) {
  const latestTrend = trendHistory[trendHistory.length - 1];
  const mentionCount = latestTrend?.count || 0;
  const relatedKeywordCount = relatedKeywords.length;
  const growthRate = calculateGrowthRate(trendHistory);
  const signalType = classifySignalType({
    mentionCount,
    relatedArticleCount,
    relatedKeywordCount,
    growthRate,
  });
  const signalScore = calculateSignalScore({
    mentionCount,
    relatedArticleCount,
    relatedKeywordCount,
    growthRate,
  });
  const summary = createSignalSummary({
    categoryName,
    mentionCount,
    relatedArticleCount,
    relatedKeywords,
    growthRate,
    signalType,
  });

  return {
    mentionCount,
    relatedArticleCount,
    relatedKeywordCount,
    relatedKeywords: relatedKeywords.slice(0, 3).map((item) => item.keyword),
    growthRate,
    signalScore,
    signalType,
    summary,
  };
}

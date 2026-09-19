import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSignalAnalysis,
  calculateGrowthRate,
  calculateSignalScore,
  classifySignalType,
} from "./signalAnalysis.js";

test("전일 대비 증가율을 계산한다", () => {
  assert.equal(calculateGrowthRate([{ count: 20 }, { count: 30 }]), 50);
  assert.equal(calculateGrowthRate([{ count: 0 }, { count: 10 }]), null);
  assert.equal(calculateGrowthRate([{ count: 10 }]), null);
});

test("신호 점수는 0과 100 사이로 제한한다", () => {
  assert.equal(
    calculateSignalScore({
      mentionCount: 80,
      relatedArticleCount: 10,
      relatedKeywordCount: 10,
      growthRate: 70,
    }),
    100,
  );
});

test("증가율이 높은 키워드를 급상승 신호로 분류한다", () => {
  assert.equal(
    classifySignalType({
      mentionCount: 15,
      relatedArticleCount: 2,
      relatedKeywordCount: 3,
      growthRate: 40,
    }),
    "급상승 신호",
  );
});

test("원본 키워드 배열을 바꾸지 않고 요약 결과를 만든다", () => {
  const relatedKeywords = [
    { keyword: "반도체" },
    { keyword: "수출" },
    { keyword: "환율" },
    { keyword: "증시" },
  ];

  const result = buildSignalAnalysis({
    categoryName: "경제",
    trendHistory: [{ count: 10 }, { count: 16 }],
    relatedArticleCount: 3,
    relatedKeywords,
  });

  assert.equal(result.growthRate, 60);
  assert.equal(result.signalType, "급상승 신호");
  assert.deepEqual(result.relatedKeywords, ["반도체", "수출", "환율"]);
  assert.equal(relatedKeywords.length, 4);
});

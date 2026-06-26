import React from "react";

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value || 0);
}

function formatGrowth(growthRate) {
  if (growthRate === null || growthRate === undefined) {
    return "비교 데이터 부족";
  }

  return `전일 대비 ${growthRate >= 0 ? "+" : ""}${growthRate}%`;
}

function getSignalStrengthLabel(score) {
  if (score >= 80) {
    return "매우 강함";
  }

  if (score >= 60) {
    return "강함";
  }

  if (score >= 35) {
    return "보통";
  }

  return "약함";
}

export default function SignalSummaryCard({ analysis }) {
  const signalStrength = getSignalStrengthLabel(analysis.signalScore);

  return (
    <section className="signal-summary-card" aria-label="신호 요약">
      <div className="signal-summary-heading">
        <span>신호 요약</span>
        <div className="signal-badges">
          <strong>{analysis.signalType}</strong>
          <em
            title={`언급량, 연결 키워드, 근거 기사, 증가율을 조합한 지표입니다. 계산값 ${analysis.signalScore}/100`}
          >
            신호 강도 {signalStrength}
            <small aria-hidden="true">i</small>
          </em>
        </div>
      </div>

      <div className="signal-summary-copy">
        {analysis.summary.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div className="signal-metrics" aria-label="신호 판정 기준">
        <span>언급량 {formatNumber(analysis.mentionCount)}</span>
        <span>연결 {formatNumber(analysis.relatedKeywordCount)}</span>
        <span>근거 기사 {formatNumber(analysis.relatedArticleCount)}</span>
        <span
          className={
            analysis.growthRate === null ? "is-muted-signal" : "is-growth-signal"
          }
        >
          {formatGrowth(analysis.growthRate)}
        </span>
      </div>
    </section>
  );
}

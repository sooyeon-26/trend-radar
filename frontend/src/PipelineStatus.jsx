import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { PIPELINE_STATUS_URL } from "./apiConfig";

const STATUS_COPY = {
  collecting: {
    title: "데이터 수집 중",
    detail: "RSS 피드에서 뉴스 신호를 수집하고 있어요.",
  },
  completed: {
    title: "수집 완료",
    detail: "마지막 수집",
  },
  failed: {
    title: "RSS 수집 실패",
    detail: "마지막 성공 수집",
  },
  empty: {
    title: "감지된 키워드 없음",
    detail: "수집된 기사에서 반복 키워드가 충분하지 않아요.",
  },
};

function formatLastCollected(value) {
  if (!value) {
    return "기록 없음";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "기록 없음";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes >= 0 && diffMinutes < 1) {
    return "방금 전";
  }

  if (diffMinutes > 0 && diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const today = now.toDateString() === date.toDateString();
  const time = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (today) {
    return `오늘 ${time}`;
  }

  const day = date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `${day} ${time}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(value || 0);
}

function formatRssSummary(sourceCount = 0, failedSourceCount = 0) {
  const normalSourceCount = Math.max(sourceCount - failedSourceCount, 0);

  if (!sourceCount && !failedSourceCount) {
    return "";
  }

  if (failedSourceCount > 0) {
    return `RSS ${formatNumber(sourceCount)}개 중 ${formatNumber(
      normalSourceCount
    )}개 정상 수집`;
  }

  return `RSS ${formatNumber(sourceCount)}개 정상 수집`;
}

export default function PipelineStatus() {
  const [pipeline, setPipeline] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const hasSuccessfulResponse = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = () => {
      axios
        .get(PIPELINE_STATUS_URL)
        .then((response) => {
          if (!isMounted) {
            return;
          }

          hasSuccessfulResponse.current = true;
          setPipeline(response.data);
          setLoadState("success");
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setLoadState(hasSuccessfulResponse.current ? "stale" : "error");
        });
    };

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [refreshKey]);

  const normalizedStatus = pipeline?.status || "empty";
  const statusCopy = STATUS_COPY[normalizedStatus] || STATUS_COPY.empty;
  const lastCollectedLabel = useMemo(
    () => formatLastCollected(pipeline?.lastCollectedAt),
    [pipeline?.lastCollectedAt]
  );
  const statusLine =
    normalizedStatus === "completed" || normalizedStatus === "failed"
      ? `${statusCopy.title} · ${lastCollectedLabel}`
      : statusCopy.title;
  const rssSummary = formatRssSummary(
    pipeline?.sourceCount || 0,
    pipeline?.failedSourceCount || 0
  );

  if (loadState === "loading") {
    return (
      <section className="pipeline-card pipeline-card-loading" aria-live="polite">
        <div className="pipeline-heading">
          <span>수집·분석 상태</span>
          <strong>
            <i className="pipeline-dot pipeline-dot-collecting" />
            상태 확인 중
          </strong>
        </div>
        <p>최신 수집 상태를 불러오고 있어요.</p>
      </section>
    );
  }

  if (loadState === "error") {
    return (
      <section className="pipeline-card pipeline-card-failed" aria-live="polite">
        <div className="pipeline-heading">
          <span>수집·분석 상태</span>
          <strong>
            <i className="pipeline-dot pipeline-dot-failed" />
            조회 실패
          </strong>
        </div>
        <p>데이터 상태를 불러오지 못했습니다. 잠시 후 자동으로 다시 확인합니다.</p>
        <button
          className="pipeline-retry"
          type="button"
          onClick={() => {
            setLoadState("loading");
            setRefreshKey((value) => value + 1);
          }}
        >
          지금 다시 시도
        </button>
      </section>
    );
  }

  return (
    <section
      className={`pipeline-card pipeline-card-${
        loadState === "stale" ? "stale" : normalizedStatus
      }`}
      aria-live="polite"
    >
      <div className="pipeline-heading">
        <span>수집·분석 상태</span>
        <strong>
          <i
            className={`pipeline-dot pipeline-dot-${
              loadState === "stale" ? "stale" : normalizedStatus
            }`}
          />
          {loadState === "stale"
            ? `상태 갱신 지연 · 마지막 수집 ${lastCollectedLabel}`
            : statusLine}
        </strong>
      </div>
      {normalizedStatus !== "completed" && normalizedStatus !== "failed" && (
        <p>{statusCopy.detail}</p>
      )}
      <div className="pipeline-metrics">
        <span>기사 {formatNumber(pipeline?.articleCount)}</span>
        <span>키워드 {formatNumber(pipeline?.keywordCount)}</span>
        <span>카테고리 {formatNumber(pipeline?.categoryCount)}</span>
      </div>
      {rssSummary && <small>{rssSummary}</small>}
      {loadState === "stale" && (
        <small className="pipeline-stale-notice">
          마지막으로 확인한 수집 결과를 표시하고 있습니다. API 연결을 다시 확인 중입니다.
        </small>
      )}
      <small className="pipeline-method">
        중복 제거 · 불용어 필터 · 동시 등장 연결
      </small>
      {normalizedStatus === "failed" && pipeline?.errorMessage && (
        <em>{pipeline.errorMessage}</em>
      )}
    </section>
  );
}

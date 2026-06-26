import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const PIPELINE_STATUS_URL = "http://localhost:4000/api/pipeline/status";

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

export default function PipelineStatus() {
  const [pipeline, setPipeline] = useState(null);
  const [loadState, setLoadState] = useState("loading");

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = () => {
      axios
        .get(PIPELINE_STATUS_URL)
        .then((response) => {
          if (!isMounted) {
            return;
          }

          setPipeline(response.data);
          setLoadState("success");
        })
        .catch(() => {
          if (!isMounted) {
            return;
          }

          setLoadState("error");
        });
    };

    fetchStatus();
    const intervalId = window.setInterval(fetchStatus, 60000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const normalizedStatus = pipeline?.status || "empty";
  const statusCopy = STATUS_COPY[normalizedStatus] || STATUS_COPY.empty;
  const lastCollectedLabel = useMemo(
    () => formatLastCollected(pipeline?.lastCollectedAt),
    [pipeline?.lastCollectedAt]
  );

  if (loadState === "loading") {
    return (
      <section className="pipeline-card pipeline-card-loading">
        <div className="pipeline-heading">
          <span>데이터 파이프라인</span>
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
      <section className="pipeline-card pipeline-card-failed">
        <div className="pipeline-heading">
          <span>데이터 파이프라인</span>
          <strong>
            <i className="pipeline-dot pipeline-dot-failed" />
            조회 실패
          </strong>
        </div>
        <p>데이터 상태를 불러오지 못했습니다</p>
      </section>
    );
  }

  return (
    <section className={`pipeline-card pipeline-card-${normalizedStatus}`}>
      <div className="pipeline-heading">
        <span>데이터 파이프라인</span>
        <strong>
          <i className={`pipeline-dot pipeline-dot-${normalizedStatus}`} />
          {statusCopy.title}
        </strong>
      </div>
      <p>
        {normalizedStatus === "completed" || normalizedStatus === "failed"
          ? `${statusCopy.detail} ${lastCollectedLabel}`
          : statusCopy.detail}
      </p>
      <div className="pipeline-metrics">
        <span>기사 {pipeline?.articleCount || 0}</span>
        <span>키워드 {pipeline?.keywordCount || 0}</span>
        <span>카테고리 {pipeline?.categoryCount || 0}</span>
      </div>
      {Boolean(pipeline?.sourceCount || pipeline?.failedSourceCount) && (
        <small>
          RSS {pipeline?.sourceCount || 0}개
          {pipeline?.failedSourceCount > 0
            ? ` · 일부 RSS 지연 ${pipeline.failedSourceCount}개`
            : ""}
        </small>
      )}
      {normalizedStatus === "failed" && pipeline?.errorMessage && (
        <em>{pipeline.errorMessage}</em>
      )}
    </section>
  );
}

const apiOrigin = (import.meta.env.VITE_API_ORIGIN || "http://localhost:4000").replace(/\/$/, "");

export const TREND_API_BASE_URL = `${apiOrigin}/api/trends`;
export const PIPELINE_STATUS_URL = `${apiOrigin}/api/pipeline/status`;

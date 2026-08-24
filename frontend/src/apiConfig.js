const defaultApiOrigin = import.meta.env.PROD ? window.location.origin : "http://localhost:4000";
const apiOrigin = (import.meta.env.VITE_API_ORIGIN || defaultApiOrigin).replace(/\/$/, "");

export const TREND_API_BASE_URL = `${apiOrigin}/api/trends`;
export const PIPELINE_STATUS_URL = `${apiOrigin}/api/pipeline/status`;

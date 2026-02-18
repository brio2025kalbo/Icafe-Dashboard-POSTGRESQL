export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

// Feedback configuration constants
export const MAX_FEEDBACK_LIMIT = 500; // Maximum feedbacks per cafe to prevent memory issues
export const DEFAULT_FEEDBACK_LIMIT = 100; // Default limit, sufficient for most cafes

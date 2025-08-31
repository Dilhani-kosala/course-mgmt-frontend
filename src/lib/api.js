import axios from "axios";
import { BASE_URL } from "./config";

const api = axios.create({ baseURL: BASE_URL });

let isRefreshing = false;
let refreshQueue = [];

function setAuthHeader(token) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

// read/write token helpers
export function getTokens() {
  const raw = localStorage.getItem("auth_tokens");
  return raw ? JSON.parse(raw) : { accessToken: null, refreshToken: null };
}
export function setTokens({ accessToken, refreshToken }) {
  localStorage.setItem(
    "auth_tokens",
    JSON.stringify({ accessToken, refreshToken })
  );
  setAuthHeader(accessToken);
}
export function clearTokens() {
  localStorage.removeItem("auth_tokens");
  setAuthHeader(null);
}

setAuthHeader(getTokens().accessToken);

// request: attach bearer if present (also kept in defaults above)
api.interceptors.request.use((cfg) => cfg);

// response: refresh on 401 once, then replay queued requests
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    if (!response) throw error;

    if (response.status === 401 && !config._retry) {
      config._retry = true;

      const { refreshToken } = getTokens();
      if (!refreshToken) {
        clearTokens();
        throw error;
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          config.headers.Authorization = `Bearer ${token}`;
          return api(config);
        });
      }

      try {
        isRefreshing = true;
        const res = await axios.post(
          `${BASE_URL}/api/auth/refresh`,
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );
        const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
        setTokens({
          accessToken: newAccess,
          refreshToken: newRefresh || refreshToken,
        });

        refreshQueue.forEach((p) => p.resolve(newAccess));
        refreshQueue = [];
        isRefreshing = false;

        config.headers.Authorization = `Bearer ${newAccess}`;
        return api(config);
      } catch (e) {
        refreshQueue.forEach((p) => p.reject(e));
        refreshQueue = [];
        isRefreshing = false;
        clearTokens();
        throw e;
      }
    }

    throw error;
  }
);

export default api;

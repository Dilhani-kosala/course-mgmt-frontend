import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "@/lib/api";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const TOKEN_KEYS = { access: "accessToken", refresh: "refreshToken" };

const getStoredTokens = () => ({
  accessToken: localStorage.getItem(TOKEN_KEYS.access) || null,
  refreshToken: localStorage.getItem(TOKEN_KEYS.refresh) || null,
});

const setAuthHeader = (accessToken) => {
  if (accessToken)
    api.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  else delete api.defaults.headers.common["Authorization"];
};

const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken != null) localStorage.setItem(TOKEN_KEYS.access, accessToken);
  if (refreshToken != null)
    localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
  setAuthHeader(accessToken);
};

const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
  setAuthHeader(null);
};

const normalizeRole = (r) =>
  r
    ? r
        .toString()
        .replace(/^ROLE_/, "")
        .toUpperCase()
    : null;

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, role: null, loading: true });

  // Bootstrap from saved token
  useEffect(() => {
    const { accessToken } = getStoredTokens();
    if (!accessToken) {
      clearTokens();
      setState({ user: null, role: null, loading: false });
      return;
    }
    setAuthHeader(accessToken);

    (async () => {
      try {
        // Prefer server truth for user/role
        const { data } = await api.get("/api/auth/me");
        const role =
          normalizeRole(data.role) ||
          normalizeRole(data.roleCode) ||
          normalizeRole(data.authorities?.[0]) ||
          normalizeRole(data.roles?.[0]) ||
          // fallback: decode JWT claim if present
          normalizeRole(tryDecodeRole(accessToken));
        setState({ user: data, role, loading: false });
      } catch {
        clearTokens();
        setState({ user: null, role: null, loading: false });
      }
    })();
  }, []);

  const login = async ({ email, password }) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    // Adjust keys if your backend uses different names
    const accessToken = data.accessToken || data.token || data.access_token;
    const refreshToken = data.refreshToken || data.refresh_token || null;

    setTokens({ accessToken, refreshToken });

    // fetch user profile
    const me = await api.get("/api/auth/me");
    const role =
      normalizeRole(me.data.role) ||
      normalizeRole(me.data.roleCode) ||
      normalizeRole(me.data.authorities?.[0]) ||
      normalizeRole(me.data.roles?.[0]) ||
      normalizeRole(tryDecodeRole(accessToken));

    setState({ user: me.data, role, loading: false });
    return me.data;
  };

  const logout = async () => {
    try {
      // Optional: await api.post('/api/auth/logout');
    } catch {}
    clearTokens();
    setState({ user: null, role: null, loading: false });
  };

  /**
   * Register a new user.
   * @param {Object} form e.g. { fullName, email, password, roleCode: 'STUDENT' }
   * @param {boolean} autoLogin when true, calls login(email,password) after registration
   */
  const register = async (form, autoLogin = false) => {
    await api.post("/api/auth/register", form);
    if (autoLogin) {
      await login({ email: form.email, password: form.password });
    }
  };

  const hasRole = (...roles) => {
    const want = roles.map(normalizeRole);
    return state.role ? want.includes(normalizeRole(state.role)) : false;
  };

  const value = useMemo(
    () => ({
      user: state.user,
      role: state.role,
      loading: state.loading,
      login,
      logout,
      register,
      hasRole,
    }),
    [state, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Helper: try decode a role from JWT if server didn't return one
function tryDecodeRole(accessToken) {
  try {
    const decoded = jwtDecode(accessToken);
    // look for common claim keys
    return (
      decoded.role || decoded.roles?.[0] || decoded.authorities?.[0] || null
    );
  } catch {
    return null;
  }
}

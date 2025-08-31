import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children, roles }) {
  const { loading, user, hasRole } = useAuth();
  const loc = useLocation();

  if (loading) return null; // or a global loader
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (roles && roles.length && !hasRole(...roles))
    return <Navigate to="/" replace />;
  return children;
}

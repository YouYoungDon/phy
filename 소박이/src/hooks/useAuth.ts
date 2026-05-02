import { useEffect, useState } from "react";
import { requestAnonymousAuth } from "../services/authService";
import { saveToken, getSavedToken, clearToken } from "../lib/auth";
import type { AuthResponse } from "../types/api";

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => getSavedToken());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      return;
    }

    setLoading(true);
    requestAnonymousAuth()
      .then((response: AuthResponse) => {
        saveToken(response.token);
        setToken(response.token);
      })
      .catch((err) => {
        setError(err?.message ?? "인증에 실패했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  function signOut() {
    clearToken();
    setToken(null);
  }

  return {
    token,
    loading,
    error,
    signOut,
  };
}

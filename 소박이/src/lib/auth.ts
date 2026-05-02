const STORAGE_KEY = "sobaki_jwt_token";

export function getSavedToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(STORAGE_KEY);
}

export function saveToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export function getAuthHeader() {
  const token = getSavedToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

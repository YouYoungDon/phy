import { apiPost } from "../lib/apiClient";
import type { AuthResponse } from "../types/api";

export function requestAnonymousAuth(): Promise<AuthResponse> {
  return apiPost<AuthResponse, { anonymousKey?: string }>(
    "/api/v1/auth/anonymous",
    {}
  );
}

import { getAuthHeader } from "./auth";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiError {
  status: number;
  message: string;
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(init.headers ?? {}),
    },
    ...init,
  });

  const payload = await parseJson(response);
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "message" in payload
      ? (payload as any).message
      : response.statusText;
    throw { status: response.status, message } as ApiError;
  }

  return payload as T;
}

export function apiPost<T, B = unknown>(path: string, body: B): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

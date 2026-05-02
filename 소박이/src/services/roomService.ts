import { apiFetch } from "../lib/apiClient";
import type { RoomState } from "../types/domain";

export function fetchRoomState(): Promise<RoomState> {
  return apiFetch<RoomState>("/api/v1/room");
}

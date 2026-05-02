import { useQuery } from "@tanstack/react-query";
import { fetchRoomState } from "../services/roomService";
import type { RoomState } from "../types/domain";

export function useRoom() {
  return useQuery<RoomState>(["room"], fetchRoomState, {
    staleTime: 30_000,
    retry: 1,
  });
}

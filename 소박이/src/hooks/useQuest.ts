import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCurrentQuests, progressQuest } from "../services/questService";
import type { QuestSummary } from "../types/domain";

export function useQuest() {
  const queryClient = useQueryClient();

  const questQuery = useQuery<QuestSummary[]>(["quests", "current"], fetchCurrentQuests, {
    staleTime: 30_000,
    retry: 1,
  });

  const progressMutation = useMutation((id: string) => progressQuest(id), {
    onSuccess: () => {
      queryClient.invalidateQueries(["quests", "current"]);
    },
  });

  return {
    ...questQuery,
    progressQuest: progressMutation.mutateAsync,
  };
}

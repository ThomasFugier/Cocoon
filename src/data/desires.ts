import { VoteLevel } from "../types";

export { DESIRE_CATEGORIES, DESIRE_PACKS, desireCards } from "./desires.generated";

export const VOTE_LABELS: Record<VoteLevel, string> = {
  0: "Non",
  1: "Pourquoi pas",
  2: "Flamme",
  3: "Très envie",
};

export const VOTE_HINTS: Record<VoteLevel, string> = {
  0: "Pas pour moi",
  1: "À discuter",
  2: "Oui, j'ai envie",
  3: "Très envie",
};

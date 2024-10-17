export type RankableItem = {
  id: string;
  initialRating: number;
  currentRating: number;
  comparisons: number;
  wins: number;
  losses: number;
  ties: number;
  stable: boolean;
};

export type ComparisonResult = {
  itemId1: string;
  itemId2: string;
  result: "win" | "loss" | "tie";
  timestamp: number;
  metadata?: any;
};

export type EloRankerConfig = {
  kFactor?: number;
  ratingChangeThreshold?: number;
  stableComparisonsThreshold?: number;
  minimumComparisons?: number;
  defaultInitialRating?: number;
  minRating?: number;
};

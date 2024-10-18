import {
  RankableItem,
  ComparisonResult,
  RankerConfig,
  ProgressParams,
} from "./types";

export class Ranker {
  private items: Map<string, RankableItem>;
  private config: RankerConfig;

  constructor(initialItems: RankableItem[], config: Partial<RankerConfig>) {
    this.items = new Map();
    this.config = {
      kFactor: config.kFactor ?? 32,
      minimumComparisons: config.minimumComparisons ?? 20,
      defaultInitialRating: config.defaultInitialRating ?? 1500,
      minRating: config.minRating ?? 0,
    };

    initialItems.forEach((item) => this.addItem(item.id, item.initialRating));
  }

  addItem(id: string, initialRating?: number): void {
    if (this.items.has(id)) {
      throw new Error(`Item with id ${id} already exists`);
    }

    const rating = initialRating ?? this.config.defaultInitialRating ?? 1500;
    this.items.set(id, {
      id,
      initialRating: rating,
      currentRating: rating,
      comparisons: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      lastComparisonTime: null,
      ratingHistory: [],
    });
  }

  removeItem(id: string): void {
    if (!this.items.has(id)) {
      throw new Error(`Item with id ${id} not found`);
    }
    this.items.delete(id);
  }

  addComparisonResult(result: ComparisonResult): number {
    const item1 = this.items.get(result.itemId1);
    const item2 = this.items.get(result.itemId2);

    if (!item1 || !item2) {
      throw new Error("One or both items not found");
    }

    if (item1.id === item2.id) {
      throw new Error("Cannot compare an item with itself");
    }

    const expectedScore1 = this.getExpectedScore(
      item1.currentRating,
      item2.currentRating
    );
    const expectedScore2 = 1 - expectedScore1;

    let actualScore1: number, actualScore2: number;

    switch (result.result) {
      case "win":
        actualScore1 = 1;
        actualScore2 = 0;
        item1.wins++;
        item2.losses++;
        break;
      case "loss":
        actualScore1 = 0;
        actualScore2 = 1;
        item1.losses++;
        item2.wins++;
        break;
      case "tie":
        actualScore1 = 0.5;
        actualScore2 = 0.5;
        item1.ties++;
        item2.ties++;
        break;
    }

    const newRating1 = this.calculateNewRating(
      item1.currentRating,
      actualScore1,
      expectedScore1
    );
    const newRating2 = this.calculateNewRating(
      item2.currentRating,
      actualScore2,
      expectedScore2
    );

    const ratingDelta =
      Math.abs(newRating1 - item1.currentRating) +
      Math.abs(newRating2 - item2.currentRating);

    item1.currentRating = Math.max(newRating1, this.config.minRating);
    item2.currentRating = Math.max(newRating2, this.config.minRating);

    item1.comparisons++;
    item2.comparisons++;

    item1.lastComparisonTime = result.timestamp;
    item2.lastComparisonTime = result.timestamp;

    item1.ratingHistory.push({
      rating: item1.currentRating,
      timestamp: result.timestamp,
    });
    item2.ratingHistory.push({
      rating: item2.currentRating,
      timestamp: result.timestamp,
    });

    return ratingDelta;
  }

  getNextComparison(): [string, string] | null {
    const items = Array.from(this.items.values());
    if (items.length < 2) return null;

    items.sort((a, b) => a.comparisons - b.comparisons);

    const leastComparedItem = items[0];

    if (leastComparedItem.comparisons >= this.config.minimumComparisons) {
      return null;
    }

    const bestOpponent = this.findBestOpponent(leastComparedItem, items);

    return [leastComparedItem.id, bestOpponent.id];
  }

  private findBestOpponent(
    item: RankableItem,
    allItems: RankableItem[]
  ): RankableItem {
    const potentialOpponents = allItems.filter(
      (opponent) => opponent.id !== item.id
    );

    if (potentialOpponents.length === 0) {
      throw new Error("No potential opponents found");
    }

    const scoredOpponents = potentialOpponents.map((opponent) => ({
      opponent,
      score: this.calculateOpponentScore(item, opponent),
    }));

    scoredOpponents.sort((a, b) => b.score - a.score);

    return scoredOpponents[0].opponent;
  }

  getItemHistory(id: string): Array<{ rating: number; timestamp: number }> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }
    return [...item.ratingHistory];
  }

  private calculateOpponentScore(
    item: RankableItem,
    opponent: RankableItem
  ): number {
    const ratingDifference = Math.abs(
      item.currentRating - opponent.currentRating
    );
    const comparisonDifference = Math.abs(
      item.comparisons - opponent.comparisons
    );

    const ratingScore = 1 / (1 + ratingDifference / 400);
    const comparisonScore = 1 / (1 + comparisonDifference);
    const timeScore = this.getTimeScore(opponent);

    return 0.4 * ratingScore + 0.4 * comparisonScore + 0.2 * timeScore;
  }

  private getTimeScore(item: RankableItem): number {
    const now = Date.now();
    if (!item.lastComparisonTime) return 1;

    const timeSinceLastComparison = now - item.lastComparisonTime;
    const maxTime = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    return Math.min(timeSinceLastComparison / maxTime, 1);
  }

  private getExpectedScore(rating1: number, rating2: number): number {
    return 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
  }

  private calculateNewRating(
    oldRating: number,
    actualScore: number,
    expectedScore: number
  ): number {
    return oldRating + this.config.kFactor * (actualScore - expectedScore);
  }

  getItemStats(id: string): RankableItem {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }
    return { ...item };
  }

  getRankings(): RankableItem[] {
    return Array.from(this.items.values()).sort(
      (a, b) => b.currentRating - a.currentRating
    );
  }

  getItemCount(): number {
    return this.items.size;
  }

  getAllItems(): RankableItem[] {
    return Array.from(this.items.values());
  }

  getProgress(params: ProgressParams): number {
    if (this.items.size === 0) return 1;

    const { ratingChangeThreshold, stableComparisonsThreshold } = params;

    const stableItems = Array.from(this.items.values()).filter((item) => {
      if (item.comparisons < stableComparisonsThreshold) return false;

      const recentComparisons = item.ratingHistory.slice(
        -stableComparisonsThreshold
      );
      const isStable = recentComparisons.every((comparison, index, array) => {
        if (index === 0) return true;
        const ratingChange = Math.abs(
          comparison.rating - array[index - 1].rating
        );
        return ratingChange < ratingChangeThreshold;
      });

      return isStable;
    });

    return stableItems.length / this.items.size;
  }
}

import { RankableItem, EloRankerConfig, ComparisonResult } from "./types";

export class Ranker {
  private items: Map<string, RankableItem>;
  private kFactor: number;
  private ratingChangeThreshold: number;
  private stableComparisonsThreshold: number;
  private minimumComparisons: number;
  private defaultInitialRating: number;
  private minRating: number;
  private recentRatingChanges: Map<string, number[]>;
  private sortedItems: RankableItem[];

  constructor(items: RankableItem[], config: EloRankerConfig = {}) {
    this.items = new Map(
      items.map((item) => [item.id, { ...item, stable: false }])
    );
    this.kFactor = this.validateConfig(config.kFactor, 8, 64, 32);
    this.ratingChangeThreshold = this.validateConfig(
      config.ratingChangeThreshold,
      1,
      20,
      5
    );
    this.stableComparisonsThreshold = this.validateConfig(
      config.stableComparisonsThreshold,
      5,
      50,
      10
    );
    this.minimumComparisons = this.validateConfig(
      config.minimumComparisons,
      10,
      100,
      20
    );
    this.defaultInitialRating = this.validateConfig(
      config.defaultInitialRating,
      1000,
      2000,
      1500
    );
    this.minRating = this.validateConfig(config.minRating, 0, 1000, 0);
    this.recentRatingChanges = new Map();
    this.sortedItems = this.getSortedItems();
  }

  private validateConfig(
    value: number | undefined,
    min: number,
    max: number,
    defaultValue: number
  ): number {
    if (value === undefined) return defaultValue;
    if (value < min || value > max) {
      throw new Error(
        `Configuration value ${value} is out of range [${min}, ${max}]`
      );
    }
    return value;
  }

  public addItem(id: string, initialRating?: number): void {
    if (this.items.has(id)) {
      throw new Error(`Item with id ${id} already exists`);
    }
    const rating = initialRating ?? this.defaultInitialRating;
    const newItem: RankableItem = {
      id,
      initialRating: rating,
      currentRating: rating,
      comparisons: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      stable: false,
    };
    this.items.set(id, newItem);
    this.updateSortedItems();
  }

  public removeItem(id: string): void {
    if (!this.items.delete(id)) {
      throw new Error(`Item with id ${id} not found`);
    }
    this.updateSortedItems();
  }

  private getExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  private updateRating(
    itemId: string,
    opponentRating: number,
    score: number
  ): void {
    const item = this.items.get(itemId)!;
    const expectedScore = this.getExpectedScore(
      item.currentRating,
      opponentRating
    );
    const oldRating = item.currentRating;

    // Adjust the rating change calculation
    let ratingChange = this.kFactor * (score - expectedScore);

    // Apply a damping factor for large rating differences
    const ratingDifference = Math.abs(item.currentRating - opponentRating);
    const dampingFactor = 400 / (ratingDifference + 400);
    ratingChange *= dampingFactor;

    // Ensure the change is in the correct direction
    if (score > expectedScore && ratingChange < 0) ratingChange = 0;
    if (score < expectedScore && ratingChange > 0) ratingChange = 0;

    // // Ensure a minimum change, but only if the change should occur
    // const minChange = 1;
    // if (ratingChange !== 0 && Math.abs(ratingChange) < minChange) {
    //   ratingChange = Math.sign(ratingChange) * minChange;
    // }

    item.currentRating = Math.max(
      this.minRating,
      // Math.round(item.currentRating + ratingChange)
      item.currentRating + ratingChange
    );

    const actualRatingChange = Math.abs(item.currentRating - oldRating);
    const recentChanges = this.recentRatingChanges.get(itemId) || [];
    recentChanges.push(actualRatingChange);
    if (recentChanges.length > this.stableComparisonsThreshold) {
      recentChanges.shift();
    }
    this.recentRatingChanges.set(itemId, recentChanges);

    this.checkAndUpdateStability(item, recentChanges);
  }

  public addComparisonResult(result: ComparisonResult): void {
    const item1 = this.items.get(result.itemId1);
    const item2 = this.items.get(result.itemId2);

    if (!item1 || !item2) {
      throw new Error("One or both items not found");
    }

    if (item1.id === item2.id) {
      throw new Error("Cannot compare an item with itself");
    }

    const rating1 = item1.currentRating;
    const rating2 = item2.currentRating;

    let score1, score2;
    if (result.result === "tie") {
      score1 = score2 = 0.5;
      item1.ties++;
      item2.ties++;
    } else if (result.result === "win") {
      score1 = 1;
      score2 = 0;
      item1.wins++;
      item2.losses++;
    } else {
      score1 = 0;
      score2 = 1;
      item1.losses++;
      item2.wins++;
    }

    this.updateRating(item1.id, rating2, score1);
    this.updateRating(item2.id, rating1, score2);

    item1.comparisons++;
    item2.comparisons++;

    this.updateSortedItems();
  }

  private checkAndUpdateStability(
    item: RankableItem,
    recentChanges: number[]
  ): void {
    if (
      !item.stable &&
      item.comparisons >= this.minimumComparisons &&
      recentChanges.length >= this.stableComparisonsThreshold &&
      recentChanges.every((change) => change <= this.ratingChangeThreshold)
    ) {
      item.stable = true;
      this.recentRatingChanges.delete(item.id);
    }
  }

  public getNextComparison(): [string, string] | null {
    const activeItems = Array.from(this.items.values()).filter(
      (item) => !item.stable
    );

    if (activeItems.length < 2) {
      return null;
    }

    const [item1, item2] = this.getRandomPair(activeItems);
    return [item1.id, item2.id];
  }

  private getRandomPair(items: RankableItem[]): [RankableItem, RankableItem] {
    if (items.length < 2) {
      throw new Error("Not enough items to form a pair");
    }
    const indices = [...Array(items.length).keys()];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return [items[indices[0]], items[indices[1]]];
  }

  public getProgress(): number {
    const totalItems = this.items.size;
    if (totalItems === 0) return 1;

    const stableItems = Array.from(this.items.values()).filter(
      (item) => item.stable
    ).length;
    return stableItems / totalItems;
  }

  private getSortedItems(): RankableItem[] {
    return Array.from(this.items.values()).sort(
      (a, b) => b.currentRating - a.currentRating
    );
  }

  private updateSortedItems(): void {
    this.sortedItems = this.getSortedItems();
  }

  public getRankings(): RankableItem[] {
    return this.sortedItems;
  }

  public getItemStats(itemId: string): RankableItem {
    const item = this.items.get(itemId);
    if (!item) {
      throw new Error(`Item with id ${itemId} not found`);
    }
    return { ...item };
  }

  public getItemCount(): number {
    return this.items.size;
  }

  public getAllItems(): RankableItem[] {
    return Array.from(this.items.values()).map((item) => ({ ...item }));
  }
}

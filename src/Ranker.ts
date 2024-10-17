import { RankableItem, ComparisonResult, RankerConfig } from "./types";

/**
 * A class for ranking items based on pairwise comparisons using an Elo-like rating system.
 */
export class Ranker {
  private items: Map<string, RankableItem>;
  private config: RankerConfig;

  /**
   * Creates a new Ranker instance.
   * @param initialItems - An array of initial items to be ranked.
   * @param config - Configuration options for the ranker.
   */
  constructor(initialItems: RankableItem[], config: Partial<RankerConfig>) {
    this.items = new Map();
    this.config = {
      kFactor: config.kFactor ?? 32,
      ratingChangeThreshold: config.ratingChangeThreshold ?? 5,
      stableComparisonsThreshold: config.stableComparisonsThreshold ?? 10,
      minimumComparisons: config.minimumComparisons ?? 20,
      defaultInitialRating: config.defaultInitialRating ?? 1500,
      minRating: config.minRating ?? 0,
    };

    initialItems.forEach((item) => this.addItem(item.id, item.initialRating));
  }

  /**
   * Adds a new item to the ranking system.
   * @param id - The unique identifier for the item.
   * @param initialRating - The initial rating for the item (optional).
   * @throws Error if an item with the given id already exists.
   */
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
      stable: false,
      lastComparisonTime: null,
    });
  }

  /**
   * Removes an item from the ranking system.
   * @param id - The unique identifier of the item to remove.
   * @throws Error if the item with the given id is not found.
   */
  removeItem(id: string): void {
    if (!this.items.has(id)) {
      throw new Error(`Item with id ${id} not found`);
    }
    this.items.delete(id);
  }

  /**
   * Adds a comparison result to the ranking system and updates the ratings of the compared items.
   * @param result - The comparison result containing the ids of the compared items and the outcome.
   * @throws Error if one or both items are not found or if an item is compared with itself.
   */
  addComparisonResult(result: ComparisonResult): void {
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

    item1.currentRating = Math.max(newRating1, this.config.minRating || 0);
    item2.currentRating = Math.max(newRating2, this.config.minRating || 0);

    item1.comparisons++;
    item2.comparisons++;

    item1.lastComparisonTime = result.timestamp;
    item2.lastComparisonTime = result.timestamp;

    this.updateStability(item1);
    this.updateStability(item2);
  }

  /**
   * Determines the next best comparison to make based on the current state of the ranking system.
   * @returns A tuple of item ids representing the next comparison, or null if no more comparisons are needed.
   */
  getNextComparison(): [string, string] | null {
    const items = Array.from(this.items.values());
    if (items.length < 2) return null;

    // Sort items by the number of comparisons, least compared first
    items.sort((a, b) => a.comparisons - b.comparisons);

    // Find the item with the least comparisons
    const leastComparedItem = items[0];

    // If all items have been compared enough times, return null
    if (
      leastComparedItem.comparisons >= (this.config.minimumComparisons || 0)
    ) {
      return null;
    }

    // Find the best opponent for the least compared item
    const bestOpponent = this.findBestOpponent(leastComparedItem, items);

    return [leastComparedItem.id, bestOpponent.id];
  }

  /**
   * Finds the best opponent for a given item based on various factors.
   * @param item - The item to find an opponent for.
   * @param allItems - All items in the ranking system.
   * @returns The best opponent for the given item.
   * @private
   */
  private findBestOpponent(
    item: RankableItem,
    allItems: RankableItem[]
  ): RankableItem {
    const potentialOpponents = allItems.filter(
      (opponent) => opponent.id !== item.id
    );

    // Calculate a score for each potential opponent
    const scoredOpponents = potentialOpponents.map((opponent) => ({
      opponent,
      score: this.calculateOpponentScore(item, opponent),
    }));

    // Sort opponents by score in descending order
    scoredOpponents.sort((a, b) => b.score - a.score);

    // Return the opponent with the highest score
    return scoredOpponents[0].opponent;
  }

  /**
   * Calculates a score for a potential opponent based on various factors.
   * @param item - The item to find an opponent for.
   * @param opponent - The potential opponent.
   * @returns A score representing how good of a match the opponent is.
   * @private
   */
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

    const ratingScore = 1 / (1 + ratingDifference / 400); // Normalize rating difference
    const comparisonScore = 1 / (1 + comparisonDifference);
    const timeScore = this.getTimeScore(opponent);
    const stabilityScore = opponent.stable ? 0 : 1;

    // Weighted sum of factors
    return (
      0.4 * ratingScore +
      0.3 * comparisonScore +
      0.2 * timeScore +
      0.1 * stabilityScore
    );
  }

  /**
   * Calculates a time-based score for an item.
   * @param item - The item to calculate the score for.
   * @returns A score between 0 and 1, where 1 indicates the item hasn't been compared recently.
   * @private
   */
  private getTimeScore(item: RankableItem): number {
    const now = Date.now();
    if (!item.lastComparisonTime) return 1; // If never compared, give highest score

    const timeSinceLastComparison = now - item.lastComparisonTime;
    const maxTime = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    return Math.min(timeSinceLastComparison / maxTime, 1);
  }

  /**
   * Calculates the expected score for an item given two ratings.
   * @param rating1 - The rating of the first item.
   * @param rating2 - The rating of the second item.
   * @returns The expected score for the first item.
   * @private
   */
  private getExpectedScore(rating1: number, rating2: number): number {
    return 1 / (1 + Math.pow(10, (rating2 - rating1) / 400));
  }

  /**
   * Calculates a new rating based on the old rating, actual score, and expected score.
   * @param oldRating - The previous rating of the item.
   * @param actualScore - The actual score of the comparison (1 for win, 0 for loss, 0.5 for tie).
   * @param expectedScore - The expected score based on the ratings before the comparison.
   * @returns The new rating for the item.
   * @private
   */
  private calculateNewRating(
    oldRating: number,
    actualScore: number,
    expectedScore: number
  ): number {
    return (
      oldRating + (this.config.kFactor || 32) * (actualScore - expectedScore)
    );
  }

  /**
   * Updates the stability status of an item.
   * @param item - The item to update.
   * @private
   */
  private updateStability(item: RankableItem): void {
    if (
      !item.stable &&
      item.comparisons >= (this.config.stableComparisonsThreshold || 10)
    ) {
      item.stable = true;
    }
  }

  /**
   * Retrieves the statistics for a specific item.
   * @param id - The unique identifier of the item.
   * @returns The item's statistics.
   * @throws Error if the item with the given id is not found.
   */
  getItemStats(id: string): RankableItem {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }
    return { ...item };
  }

  /**
   * Retrieves all items sorted by their current rating in descending order.
   * @returns An array of all items, sorted by rating.
   */
  getRankings(): RankableItem[] {
    return Array.from(this.items.values()).sort(
      (a, b) => b.currentRating - a.currentRating
    );
  }

  /**
   * Gets the total number of items in the ranking system.
   * @returns The number of items.
   */
  getItemCount(): number {
    return this.items.size;
  }

  /**
   * Retrieves all items in the ranking system.
   * @returns An array of all items.
   */
  getAllItems(): RankableItem[] {
    return Array.from(this.items.values());
  }

  /**
   * Calculates the progress of the ranking system.
   * @returns A number between 0 and 1 representing the proportion of stable items.
   */
  getProgress(): number {
    if (this.items.size === 0) return 1;

    const stableItems = Array.from(this.items.values()).filter(
      (item) => item.stable
    );
    return stableItems.length / this.items.size;
  }
}

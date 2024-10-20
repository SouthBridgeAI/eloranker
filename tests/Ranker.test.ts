// eloRanker.test.ts

import { Ranker } from "../src/ranker";
import { RankableItem, ComparisonResult, ProgressParams } from "../src/types";

const progressParams: ProgressParams = {
  ratingChangeThreshold: 5,
  stableComparisonsThreshold: 10,
};

describe("EloRanker Class Tests", () => {
  let ranker: Ranker;

  beforeEach(() => {
    // Initialize the ranker with some items
    const items: RankableItem[] = [
      {
        id: "item1",
        initialRating: 1500,
        currentRating: 1500,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        lastComparisonTime: null,
        ratingHistory: [],
      },
      {
        id: "item2",
        initialRating: 1500,
        currentRating: 1500,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        lastComparisonTime: null,
        ratingHistory: [],
      },
      {
        id: "item3",
        initialRating: 1500,
        currentRating: 1500,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        ratingHistory: [],
        lastComparisonTime: null,
      },
      {
        id: "item4",
        initialRating: 1500,
        currentRating: 1500,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        ratingHistory: [],
        lastComparisonTime: null,
      },
    ];

    const config = {
      kFactor: 32,
      minimumComparisons: 20,
      defaultInitialRating: 1500,
      minRating: 0,
    };

    ranker = new Ranker(items, config);
  });

  test("should initialize with correct item count", () => {
    expect(ranker.getItemCount()).toBe(4);
  });

  test("should add a new item correctly", () => {
    ranker.addItem("item5");
    expect(ranker.getItemCount()).toBe(5);
    expect(ranker.getItemStats("item5").currentRating).toBe(1500);
  });

  test("should not add an item with duplicate id", () => {
    expect(() => ranker.addItem("item1")).toThrowError(
      "Item with id item1 already exists"
    );
  });

  test("should remove an existing item", () => {
    ranker.removeItem("item1");
    expect(ranker.getItemCount()).toBe(3);
    expect(() => ranker.getItemStats("item1")).toThrowError(
      "Item with id item1 not found"
    );
  });

  test("should not remove a non-existent item", () => {
    expect(() => ranker.removeItem("nonexistent")).toThrowError(
      "Item with id nonexistent not found"
    );
  });

  test("should update ratings correctly after a win", () => {
    const result: ComparisonResult = {
      itemId1: "item1",
      itemId2: "item2",
      result: "win",
      timestamp: Date.now(),
    };

    ranker.addComparisonResult(result);

    const item1 = ranker.getItemStats("item1");
    const item2 = ranker.getItemStats("item2");

    expect(item1.currentRating).toBeGreaterThan(1500);
    expect(item2.currentRating).toBeLessThan(1500);
    expect(item1.wins).toBe(1);
    expect(item2.losses).toBe(1);
    expect(item1.comparisons).toBe(1);
    expect(item2.comparisons).toBe(1);
  });

  test("should update ratings correctly after a loss", () => {
    const result: ComparisonResult = {
      itemId1: "item1",
      itemId2: "item2",
      result: "loss",
      timestamp: Date.now(),
    };

    ranker.addComparisonResult(result);

    const item1 = ranker.getItemStats("item1");
    const item2 = ranker.getItemStats("item2");

    expect(item1.currentRating).toBeLessThan(1500);
    expect(item2.currentRating).toBeGreaterThan(1500);
    expect(item1.losses).toBe(1);
    expect(item2.wins).toBe(1);
    expect(item1.comparisons).toBe(1);
    expect(item2.comparisons).toBe(1);
  });

  test("should handle multiple comparisons and update rankings", () => {
    const results: ComparisonResult[] = [
      {
        itemId1: "item1",
        itemId2: "item2",
        result: "win",
        timestamp: Date.now(),
      },
      {
        itemId1: "item1",
        itemId2: "item3",
        result: "loss",
        timestamp: Date.now(),
      },
      {
        itemId1: "item2",
        itemId2: "item3",
        result: "win",
        timestamp: Date.now(),
      },
      {
        itemId1: "item2",
        itemId2: "item4",
        result: "tie",
        timestamp: Date.now(),
      },
      {
        itemId1: "item3",
        itemId2: "item4",
        result: "win",
        timestamp: Date.now(),
      },
      {
        itemId1: "item1",
        itemId2: "item4",
        result: "win",
        timestamp: Date.now(),
      },
    ];

    results.forEach((result) => ranker.addComparisonResult(result));

    const rankings = ranker.getRankings();

    // Check if the rankings are in the correct order
    expect(rankings[0].currentRating).toBeGreaterThanOrEqual(
      rankings[1].currentRating
    );
    expect(rankings[1].currentRating).toBeGreaterThanOrEqual(
      rankings[2].currentRating
    );
    expect(rankings[2].currentRating).toBeGreaterThanOrEqual(
      rankings[3].currentRating
    );

    // Check that item1 and item3 are in the top two positions
    expect(["item1", "item3"]).toContain(rankings[0].id);
    expect(["item1", "item3"]).toContain(rankings[1].id);
    expect(rankings[2].id).toBe("item2");
    expect(rankings[3].id).toBe("item4");

    // Check that the difference between the top two ratings is small
    expect(rankings[0].currentRating - rankings[1].currentRating).toBeLessThan(
      5
    );
  });

  test("should handle very large rating differences correctly", () => {
    ranker.addItem("highRatedItem", 2400);
    ranker.addItem("lowRatedItem", 1000);

    const result: ComparisonResult = {
      itemId1: "highRatedItem",
      itemId2: "lowRatedItem",
      result: "win",
      timestamp: Date.now(),
    };

    const highRatedItemBefore = ranker.getItemStats("highRatedItem");
    const lowRatedItemBefore = ranker.getItemStats("lowRatedItem");

    ranker.addComparisonResult(result);

    const highRatedItemAfter = ranker.getItemStats("highRatedItem");
    const lowRatedItemAfter = ranker.getItemStats("lowRatedItem");

    expect(highRatedItemAfter.currentRating).toBeGreaterThan(
      highRatedItemBefore.currentRating
    );
    expect(lowRatedItemAfter.currentRating).toBeLessThan(
      lowRatedItemBefore.currentRating
    );
    expect(
      highRatedItemAfter.currentRating - lowRatedItemAfter.currentRating
    ).toBeLessThan(1401);
  });

  test("should update ratings correctly after a tie", () => {
    const result: ComparisonResult = {
      itemId1: "item1",
      itemId2: "item2",
      result: "tie",
      timestamp: Date.now(),
    };

    ranker.addComparisonResult(result);

    const item1 = ranker.getItemStats("item1");
    const item2 = ranker.getItemStats("item2");

    expect(item1.currentRating).toBe(1500);
    expect(item2.currentRating).toBe(1500);
    expect(item1.ties).toBe(1);
    expect(item2.ties).toBe(1);
    expect(item1.comparisons).toBe(1);
    expect(item2.comparisons).toBe(1);
  });

  test("should not allow comparing an item with itself", () => {
    const result: ComparisonResult = {
      itemId1: "item1",
      itemId2: "item1",
      result: "win",
      timestamp: Date.now(),
    };

    expect(() => ranker.addComparisonResult(result)).toThrowError(
      "Cannot compare an item with itself"
    );
  });

  test("should not allow ratings to drop below minRating", () => {
    // Create a scenario where an item's rating would drop below minRating if not constrained
    const losingStreakResult: ComparisonResult = {
      itemId1: "item1",
      itemId2: "item2",
      result: "loss",
      timestamp: Date.now(),
    };

    // Simulate a long losing streak
    for (let i = 0; i < 100; i++) {
      ranker.addComparisonResult(losingStreakResult);
    }

    const item1 = ranker.getItemStats("item1");
    expect(item1.currentRating).toBeGreaterThanOrEqual(0);
  });

  test("should return correct progress", () => {
    expect(ranker.getProgress(progressParams)).toBe(0);

    // Simulate comparisons to stabilize some items
    const result: ComparisonResult = {
      itemId1: "item1",
      itemId2: "item2",
      result: "win",
      timestamp: Date.now(),
    };

    for (let i = 0; i < 25; i++) {
      ranker.addComparisonResult(result);
    }

    expect(ranker.getProgress(progressParams)).toBe(0.5);
  });

  test("should return null when no comparisons are needed", () => {
    // Stabilize all items
    const results: ComparisonResult[] = [];

    // Generate enough comparisons to stabilize all items
    for (let i = 0; i < 25; i++) {
      results.push({
        itemId1: "item1",
        itemId2: "item2",
        result: "win",
        timestamp: Date.now(),
      });
      results.push({
        itemId1: "item3",
        itemId2: "item4",
        result: "win",
        timestamp: Date.now(),
      });
    }

    results.forEach((result) => ranker.addComparisonResult(result));

    expect(ranker.getNextComparison()).toBeNull();
  });

  test("should provide correct item statistics", () => {
    const result: ComparisonResult = {
      itemId1: "item1",
      itemId2: "item2",
      result: "win",
      timestamp: Date.now(),
    };

    ranker.addComparisonResult(result);

    const stats = ranker.getItemStats("item1");
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.ties).toBe(0);
    expect(stats.comparisons).toBe(1);
  });

  test("should return a pair of items for the next comparison", () => {
    const nextComparison = ranker.getNextComparison();
    expect(nextComparison).not.toBeNull();
    expect(nextComparison).toHaveLength(2);
    expect(nextComparison![0]).not.toBe(nextComparison![1]);
  });

  test("should throw an error when adding a comparison result with invalid item IDs", () => {
    const result: ComparisonResult = {
      itemId1: "item1",
      itemId2: "nonexistent",
      result: "win",
      timestamp: Date.now(),
    };

    expect(() => ranker.addComparisonResult(result)).toThrowError(
      "One or both items not found"
    );
  });

  test("should maintain sorted rankings after each comparison", () => {
    // Perform several comparisons
    const results: ComparisonResult[] = [
      {
        itemId1: "item1",
        itemId2: "item2",
        result: "win",
        timestamp: Date.now(),
      },
      {
        itemId1: "item1",
        itemId2: "item3",
        result: "win",
        timestamp: Date.now(),
      },
      {
        itemId1: "item1",
        itemId2: "item4",
        result: "win",
        timestamp: Date.now(),
      },
      {
        itemId1: "item2",
        itemId2: "item3",
        result: "loss",
        timestamp: Date.now(),
      },
      {
        itemId1: "item2",
        itemId2: "item4",
        result: "loss",
        timestamp: Date.now(),
      },
    ];

    results.forEach((result) => ranker.addComparisonResult(result));

    const rankings = ranker.getRankings();

    // Check that rankings are sorted in descending order of currentRating
    for (let i = 0; i < rankings.length - 1; i++) {
      expect(rankings[i].currentRating).toBeGreaterThanOrEqual(
        rankings[i + 1].currentRating
      );
    }
  });

  test("should correctly handle tie scenarios in ratings", () => {
    const result: ComparisonResult = {
      itemId1: "item1",
      itemId2: "item2",
      result: "tie",
      timestamp: Date.now(),
    };

    ranker.addComparisonResult(result);

    const item1 = ranker.getItemStats("item1");
    const item2 = ranker.getItemStats("item2");

    expect(item1.currentRating).toBe(1500);
    expect(item2.currentRating).toBe(1500);
  });

  test("should correctly calculate progress when there are no items", () => {
    const emptyRanker = new Ranker([], {});
    expect(emptyRanker.getProgress(progressParams)).toBe(1);
  });

  test("should maintain correct order of items with equal ratings", () => {
    ranker.addItem("equalItem1", 1500);
    ranker.addItem("equalItem2", 1500);

    const rankings = ranker.getRankings();
    const equalItem1Index = rankings.findIndex(
      (item) => item.id === "equalItem1"
    );
    const equalItem2Index = rankings.findIndex(
      (item) => item.id === "equalItem2"
    );

    expect(Math.abs(equalItem1Index - equalItem2Index)).toBe(1);
  });

  test("should correctly handle a long series of alternating wins and losses", () => {
    const initialRating1 = ranker.getItemStats("item1").currentRating;
    const initialRating2 = ranker.getItemStats("item2").currentRating;

    for (let i = 0; i < 100; i++) {
      const result: ComparisonResult = {
        itemId1: "item1",
        itemId2: "item2",
        result: i % 2 === 0 ? "win" : "loss",
        timestamp: Date.now(),
      };
      ranker.addComparisonResult(result);
    }

    const finalRating1 = ranker.getItemStats("item1").currentRating;
    const finalRating2 = ranker.getItemStats("item2").currentRating;

    expect(Math.abs(finalRating1 - initialRating1)).toBeLessThan(100);
    expect(Math.abs(finalRating2 - initialRating2)).toBeLessThan(100);
  });

  test("should correctly apply custom initial ratings", () => {
    ranker.addItem("customItem", 2000);
    expect(ranker.getItemStats("customItem").currentRating).toBe(2000);
    expect(ranker.getItemStats("customItem").initialRating).toBe(2000);
  });

  test("should throw an error when trying to get stats for a non-existent item", () => {
    expect(() => ranker.getItemStats("nonExistentItem")).toThrowError(
      "Item with id nonExistentItem not found"
    );
  });

  test("should correctly handle rating changes near the minimum rating", () => {
    ranker.addItem("lowRatedItem", 10);

    const result: ComparisonResult = {
      itemId1: "lowRatedItem",
      itemId2: "item1",
      result: "loss",
      timestamp: Date.now(),
    };

    ranker.addComparisonResult(result);

    const lowRatedItem = ranker.getItemStats("lowRatedItem");
    expect(Math.round(lowRatedItem.currentRating)).toBe(10);
  });

  test("should return correct getAllItems result", () => {
    const allItems = ranker.getAllItems();
    expect(allItems.length).toBe(ranker.getItemCount());
    expect(allItems.every((item) => item.id && item.currentRating)).toBe(true);
  });

  test("should handle a large number of items correctly", () => {
    for (let i = 0; i < 1000; i++) {
      ranker.addItem(`largeItem${i}`);
    }

    expect(ranker.getItemCount()).toBe(1004); // 1000 new items + 4 initial items
    expect(() => ranker.getNextComparison()).not.toThrow();
    expect(ranker.getRankings().length).toBe(1004);
  });
});

describe("getNextComparison Tests", () => {
  let ranker: Ranker;
  let items: RankableItem[];

  beforeEach(() => {
    items = [
      {
        id: "item1",
        initialRating: 1500,
        currentRating: 1500,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        ratingHistory: [],
        lastComparisonTime: null,
      },
      {
        id: "item2",
        initialRating: 1500,
        currentRating: 1500,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        ratingHistory: [],
        lastComparisonTime: null,
      },
      {
        id: "item3",
        initialRating: 1500,
        currentRating: 1500,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        ratingHistory: [],
        lastComparisonTime: null,
      },
      {
        id: "item4",
        initialRating: 1500,
        currentRating: 1500,
        comparisons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        ratingHistory: [],
        lastComparisonTime: null,
      },
    ];

    const config = {
      kFactor: 32,
      ratingChangeThreshold: 5,
      stableComparisonsThreshold: 10,
      minimumComparisons: 20,
      defaultInitialRating: 1500,
      minRating: 0,
    };

    ranker = new Ranker(items, config);
  });

  test("should return a pair of items for comparison", () => {
    const comparison = ranker.getNextComparison();
    expect(comparison).not.toBeNull();
    expect(comparison).toHaveLength(2);
    expect(comparison![0]).not.toBe(comparison![1]);
  });

  test("should prioritize items with fewer comparisons", () => {
    // Simulate some comparisons for item1
    for (let i = 0; i < 5; i++) {
      ranker.addComparisonResult({
        itemId1: "item1",
        itemId2: "item2",
        result: "win",
        timestamp: Date.now(),
      });
    }

    const comparison = ranker.getNextComparison();
    expect(comparison).not.toBeNull();
    expect(comparison![0]).not.toBe("item1");
  });

  test("should consider rating differences", () => {
    // Set up items with different ratings
    ranker.addComparisonResult({
      itemId1: "item1",
      itemId2: "item2",
      result: "win",
      timestamp: Date.now(),
    });

    const comparison = ranker.getNextComparison();
    expect(comparison).not.toBeNull();
    expect(comparison).toContain("item3");
    expect(comparison).toContain("item4");
  });

  test("should consider time since last comparison", () => {
    // Simulate a comparison for item1 and item2 a week ago
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    ranker.addComparisonResult({
      itemId1: "item1",
      itemId2: "item2",
      result: "win",
      timestamp: oneWeekAgo,
    });

    // Simulate a recent comparison for item3 and item4
    ranker.addComparisonResult({
      itemId1: "item3",
      itemId2: "item4",
      result: "win",
      timestamp: Date.now(),
    });

    const comparison = ranker.getNextComparison();
    expect(comparison).not.toBeNull();
    expect(comparison).toContain("item1");
    expect(comparison).toContain("item2");
  });

  test("should prefer unstable items", () => {
    // Make item1 stable
    for (let i = 0; i < 10; i++) {
      ranker.addComparisonResult({
        itemId1: "item1",
        itemId2: "item2",
        result: "win",
        timestamp: Date.now(),
      });
    }

    const comparison = ranker.getNextComparison();
    expect(comparison).not.toBeNull();
    expect(comparison).not.toContain("item1");
  });

  test("should return null when all items have reached minimum comparisons", () => {
    // Simulate minimum comparisons for all items
    for (let i = 0; i < 20; i++) {
      ranker.addComparisonResult({
        itemId1: "item1",
        itemId2: "item2",
        result: "win",
        timestamp: Date.now(),
      });
      ranker.addComparisonResult({
        itemId1: "item3",
        itemId2: "item4",
        result: "win",
        timestamp: Date.now(),
      });
    }

    const comparison = ranker.getNextComparison();
    expect(comparison).toBeNull();
  });

  test("should handle extreme rating differences gracefully", () => {
    ranker.addItem("highRatedItem", 3000);
    ranker.addItem("lowRatedItem", 100);

    ranker.addComparisonResult({
      itemId1: "highRatedItem",
      itemId2: "lowRatedItem",
      result: "loss",
      timestamp: Date.now(),
    });

    const highRatedItem = ranker.getItemStats("highRatedItem");
    const lowRatedItem = ranker.getItemStats("lowRatedItem");

    expect(highRatedItem.currentRating).toBeLessThan(3000);
    expect(lowRatedItem.currentRating).toBeGreaterThan(100);
    expect(highRatedItem.currentRating).toBeGreaterThan(
      lowRatedItem.currentRating
    );
  });

  test("should maintain consistent rankings over many comparisons", () => {
    const iterations = 1000;
    const items = ["item1", "item2", "item3", "item4"];

    for (let i = 0; i < iterations; i++) {
      const item1 = items[Math.floor(Math.random() * items.length)];
      const item2 = items[Math.floor(Math.random() * items.length)];
      if (item1 !== item2) {
        ranker.addComparisonResult({
          itemId1: item1,
          itemId2: item2,
          result: Math.random() < 0.5 ? "win" : "loss",
          timestamp: Date.now(),
        });
      }
    }

    const rankings = ranker.getRankings();
    expect(rankings.length).toBe(items.length);
    for (let i = 0; i < rankings.length - 1; i++) {
      expect(rankings[i].currentRating).toBeGreaterThanOrEqual(
        rankings[i + 1].currentRating
      );
    }
  });
});

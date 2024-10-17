# Ranker

A flexible and efficient TypeScript library for ranking items based on pairwise comparisons using an Elo-like rating system.

## Features

- Easy-to-use API for managing rankable items and their comparisons
- Configurable ranking parameters
- Automatic calculation of next best comparison
- Progress tracking for ranking stability
- Comprehensive item statistics and history
- TypeScript support with full type definitions

## Installation

Install Ranker using npm:

```bash
npm install ranker
```

Or using yarn:

```bash
yarn add ranker
```

## Quick Start

Here's a basic example to get you started with Ranker:

```typescript
import { Ranker, RankableItem, ComparisonResult } from "ranker";

// Initialize Ranker with some items
const initialItems: RankableItem[] = [
  { id: "item1", initialRating: 1500 },
  { id: "item2", initialRating: 1500 },
  { id: "item3", initialRating: 1500 },
];

const ranker = new Ranker(initialItems, { kFactor: 32 });

// Add a comparison result
const result: ComparisonResult = {
  itemId1: "item1",
  itemId2: "item2",
  result: "win",
  timestamp: Date.now(),
};

ranker.addComparisonResult(result);

// Get current rankings
const rankings = ranker.getRankings();
console.log("Current rankings:", rankings);
```

## Usage Guide

### Initializing the Ranker

Create a new Ranker instance with initial items and optional configuration:

```typescript
const ranker = new Ranker(initialItems, {
  kFactor: 32,
  minimumComparisons: 20,
  defaultInitialRating: 1500,
  minRating: 0,
});
```

### Adding and Removing Items

```typescript
ranker.addItem("newItem", 1400); // Add with custom initial rating
ranker.addItem("anotherItem"); // Add with default initial rating
ranker.removeItem("itemToRemove");
```

### Adding Comparison Results

```typescript
const result: ComparisonResult = {
  itemId1: "item1",
  itemId2: "item2",
  result: "win", // "win", "loss", or "tie"
  timestamp: Date.now(),
};
ranker.addComparisonResult(result);
```

### Getting Next Comparison

```typescript
const nextComparison = ranker.getNextComparison();
if (nextComparison) {
  const [itemId1, itemId2] = nextComparison;
  console.log(`Next comparison: ${itemId1} vs ${itemId2}`);
} else {
  console.log("No more comparisons needed");
}
```

### Retrieving Rankings and Item Stats

```typescript
const rankings = ranker.getRankings();
console.log("Current rankings:", rankings);

const itemStats = ranker.getItemStats("item1");
console.log("Stats for item1:", itemStats);
```

### Tracking Progress

```typescript
const progress = ranker.getProgress({
  ratingChangeThreshold: 5,
  stableComparisonsThreshold: 10,
});
console.log(`Ranking progress: ${progress * 100}%`);
```

## API Reference

### `Ranker`

#### Constructor

```typescript
constructor(initialItems: RankableItem[], config: Partial<RankerConfig>)
```

#### Methods

- `addItem(id: string, initialRating?: number): void`
- `removeItem(id: string): void`
- `addComparisonResult(result: ComparisonResult): void`
- `getNextComparison(): [string, string] | null`
- `getItemStats(id: string): RankableItem`
- `getRankings(): RankableItem[]`
- `getItemCount(): number`
- `getAllItems(): RankableItem[]`
- `getProgress(params: ProgressParams): number`
- `getItemHistory(id: string): Array<{ rating: number; timestamp: number }>`

### Types

#### `RankableItem`

```typescript
type RankableItem = {
  id: string;
  initialRating: number;
  currentRating: number;
  comparisons: number;
  wins: number;
  losses: number;
  ties: number;
  lastComparisonTime: number | null;
  ratingHistory: Array<{ rating: number; timestamp: number }>;
};
```

#### `ComparisonResult`

```typescript
type ComparisonResult = {
  itemId1: string;
  itemId2: string;
  result: "win" | "loss" | "tie";
  timestamp: number;
  metadata?: any;
};
```

#### `RankerConfig`

```typescript
type RankerConfig = {
  kFactor: number;
  minimumComparisons: number;
  defaultInitialRating: number;
  minRating: number;
};
```

#### `ProgressParams`

```typescript
type ProgressParams = {
  ratingChangeThreshold: number;
  stableComparisonsThreshold: number;
};
```

## Advanced Usage

### Custom Configuration

Customize the Ranker's behavior by passing a configuration object:

```typescript
const ranker = new Ranker(initialItems, {
  kFactor: 24,
  minimumComparisons: 30,
  defaultInitialRating: 1600,
  minRating: 100,
});
```

### Tracking Item History

Retrieve the rating history for a specific item:

```typescript
const history = ranker.getItemHistory("item1");
console.log("Rating history for item1:", history);
```

### Handling Large Numbers of Items

For systems with many items, you can implement batched processing:

```typescript
const allItems = ranker.getAllItems();
const batchSize = 100;

for (let i = 0; i < allItems.length; i += batchSize) {
  const batch = allItems.slice(i, i + batchSize);
  // Process batch...
}
```

## Best Practices

1. **Regular Comparisons**: Ensure all items are compared regularly to maintain accurate rankings.
2. **Balanced Comparisons**: Try to balance the number of comparisons across all items.
3. **Monitor Progress**: Use the `getProgress` method to track the stability of your rankings.
4. **Handle Ties**: Don't forget to use the "tie" result when appropriate to ensure accurate ratings.
5. **Metadata Usage**: Utilize the `metadata` field in `ComparisonResult` to store additional information about each comparison.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

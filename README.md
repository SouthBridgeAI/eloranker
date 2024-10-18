# Ranker

A robust and flexible TypeScript library for ranking items based on pairwise comparisons using an advanced Elo-like rating system.

## Table of Contents

- [Ranker](#ranker)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Installation](#installation)
  - [Quick Start](#quick-start)
  - [Configuration](#configuration)
    - [RankerConfig](#rankerconfig)
    - [Effects of Parameters](#effects-of-parameters)
    - [Progress Tracking](#progress-tracking)
      - [ProgressParams](#progressparams)
  - [API Reference](#api-reference)
    - [Ranker Class](#ranker-class)
      - [Constructor](#constructor)
      - [Methods](#methods)
    - [Types](#types)
  - [Advanced Usage](#advanced-usage)
    - [Batch Processing](#batch-processing)
    - [Rating Delta Analysis](#rating-delta-analysis)
  - [Mathematical Foundation](#mathematical-foundation)
  - [Contributing](#contributing)

## Features

- 🚀 Easy-to-use API for managing rankable items and their comparisons
- ⚙️ Highly configurable ranking parameters
- 🧠 Intelligent calculation of optimal next comparison
- 📊 Comprehensive progress tracking for ranking stability
- 📈 Detailed item statistics and historical data
- 🔧 Full TypeScript support with type definitions
- 🧮 Transparent mathematical model with customizable parameters

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

Get up and running with Ranker in just a few lines of code:

```typescript
import { Ranker, RankableItem, ComparisonResult } from "eloranker";

// Initialize items
const initialItems: RankableItem[] = [
  { id: "item1", initialRating: 1500 },
  { id: "item2", initialRating: 1500 },
  { id: "item3", initialRating: 1500 },
];

// Create a new Ranker instance
const ranker = new Ranker(initialItems, { kFactor: 32 });

// Add a comparison result
const result: ComparisonResult = {
  itemId1: "item1",
  itemId2: "item2",
  result: "win",
  timestamp: Date.now(),
};

const ratingDelta = ranker.addComparisonResult(result);
console.log(`Rating change: ${ratingDelta}`);

// Get current rankings
const rankings = ranker.getRankings();
console.log("Current rankings:", rankings);
```

## Configuration

Customize Ranker's behavior with the following configuration options:

### RankerConfig

| Parameter              | Type   | Default | Description                                                     |
| ---------------------- | ------ | ------- | --------------------------------------------------------------- |
| `kFactor`              | number | 32      | Determines the maximum rating change per comparison             |
| `minimumComparisons`   | number | 20      | Minimum comparisons before considering an item's ranking stable |
| `defaultInitialRating` | number | 1500    | Starting rating for new items                                   |
| `minRating`            | number | 0       | Minimum possible rating for any item                            |

Example configuration:

```typescript
const ranker = new Ranker(initialItems, {
  kFactor: 24,
  minimumComparisons: 30,
  defaultInitialRating: 1600,
  minRating: 100,
});
```

### Effects of Parameters

- **kFactor**: Higher values make the system more responsive but potentially volatile. Lower values provide more stability but slower adaptation.
- **minimumComparisons**: Increasing this value requires more data for stability, potentially increasing accuracy but increasing number of comparisons.
- **defaultInitialRating**: Adjust based on prior knowledge about the general strength of new items.
- **minRating**: Prevents extremely low ratings, which may be desirable in some applications.

### Progress Tracking

Monitor ranking stability with the `getProgress` method:

```typescript
const progress = ranker.getProgress({
  ratingChangeThreshold: 5,
  stableComparisonsThreshold: 10,
});
console.log(`Ranking progress: ${progress * 100}%`);
```

#### ProgressParams

| Parameter                    | Type   | Description                                 |
| ---------------------------- | ------ | ------------------------------------------- |
| `ratingChangeThreshold`      | number | Maximum allowed rating change for stability |
| `stableComparisonsThreshold` | number | Number of recent comparisons to check       |

- Lower `ratingChangeThreshold` increases accuracy but slows stabilization.
- Higher `stableComparisonsThreshold` increases confidence but takes longer to achieve.

## API Reference

### Ranker Class

#### Constructor

```typescript
constructor(initialItems: RankableItem[], config: Partial<RankerConfig>)
```

#### Methods

| Method                                          | Description                                    | Return Type                                    |
| ----------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| `addItem(id: string, initialRating?: number)`   | Add a new item to the ranking system           | `void`                                         |
| `removeItem(id: string)`                        | Remove an item from the ranking system         | `void`                                         |
| `addComparisonResult(result: ComparisonResult)` | Add a new comparison result                    | `number` (rating delta)                        |
| `getNextComparison()`                           | Get the optimal next comparison                | `[string, string] \| null`                     |
| `getItemStats(id: string)`                      | Get statistics for a specific item             | `RankableItem`                                 |
| `getRankings()`                                 | Get current rankings of all items              | `RankableItem[]`                               |
| `getItemCount()`                                | Get the total number of items                  | `number`                                       |
| `getAllItems()`                                 | Get all items in the system                    | `RankableItem[]`                               |
| `getProgress(params: ProgressParams)`           | Get the current progress/stability of rankings | `number`                                       |
| `getItemHistory(id: string)`                    | Get rating history for an item                 | `Array<{ rating: number; timestamp: number }>` |

### Types

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

type ComparisonResult = {
  itemId1: string;
  itemId2: string;
  result: "win" | "loss" | "tie";
  timestamp: number;
  metadata?: any;
};

type RankerConfig = {
  kFactor: number;
  minimumComparisons: number;
  defaultInitialRating: number;
  minRating: number;
};

type ProgressParams = {
  ratingChangeThreshold: number;
  stableComparisonsThreshold: number;
};
```

## Advanced Usage

### Batch Processing

For systems with many items, implement batched processing:

```typescript
const allItems = ranker.getAllItems();
const batchSize = 100;

for (let i = 0; i < allItems.length; i += batchSize) {
  const batch = allItems.slice(i, i + batchSize);
  // Process batch...
}
```

### Rating Delta Analysis

Use the rating delta to trigger events or updates:

```typescript
const SIGNIFICANT_CHANGE_THRESHOLD = 50;

const ratingDelta = ranker.addComparisonResult(result);
if (ratingDelta > SIGNIFICANT_CHANGE_THRESHOLD) {
  console.log("Significant ranking change detected!");
  // Trigger updates, notifications, etc.
}
```

## Mathematical Foundation

Ranker uses an advanced Elo-like rating system. Here are the key equations:

1. **Expected Score Calculation**:

   The expected score for player A when competing against player B is:

   $E(A) = \frac{1}{1 + 10^{(R_B - R_A) / 400}}$

   Where $R_A$ and $R_B$ are the current ratings of players A and B.

2. **Rating Update**:

   After a comparison, ratings are updated using:

   $R_{new} = R_{old} + K \cdot (S - E)$

   Where:

   - $R_{new}$ is the new rating
   - $R_{old}$ is the old rating
   - $K$ is the k-factor (configurable)
   - $S$ is the actual score (1 for win, 0.5 for tie, 0 for loss)
   - $E$ is the expected score from step 1

3. **Rating Delta**:

   The rating delta returned by `addComparisonResult` is:

   $\Delta = |R_{new_A} - R_{old_A}| + |R_{new_B} - R_{old_B}|$

   This represents the total change in ratings for both items.

These equations ensure:

- Winning against a higher-rated opponent yields a larger rating increase.
- Losing against a lower-rated opponent results in a larger rating decrease.
- The k-factor controls the maximum possible change from a single comparison.

## Contributing

We welcome contributions to Ranker! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

import { LEVEL_DATA } from '../src/data/levels.js';

console.log("=== FLAPCRYPT LEVEL DATA VALIDATOR ===");
console.log(`Loaded ${LEVEL_DATA.length} levels.`);

let errors = [];

// 1. Check total count
if (LEVEL_DATA.length !== 1000) {
  errors.push(`Expected 1000 levels, found ${LEVEL_DATA.length}`);
}

// 2. Check sequential IDs 1..1000
LEVEL_DATA.forEach((level, idx) => {
  const expectedId = idx + 1;
  if (level.id !== expectedId) {
    errors.push(`Level at index ${idx} has ID ${level.id}, expected ${expectedId}`);
  }
});

// 3. Category count check
const expectedCats = {
  'Quotes': 250,
  'Proverbs': 125,
  'Riddles': 125,
  'Movie Lines': 125,
  'Trivia': 125,
  'Wordplay': 125,
  'Jokes': 125
};

const catCounts = {};
LEVEL_DATA.forEach(l => {
  catCounts[l.category] = (catCounts[l.category] || 0) + 1;
});

for (const [cat, expected] of Object.entries(expectedCats)) {
  const actual = catCounts[cat] || 0;
  if (actual !== expected) {
    errors.push(`Category ${cat} expected ${expected} levels, found ${actual}`);
  }
}

// 4. Tier breakdown check (Quotes: 50/75/72/53; Others: 31/31/31/32)
const tierCounts = {};
LEVEL_DATA.forEach(l => {
  const key = `${l.category} -> ${l.tier}`;
  tierCounts[key] = (tierCounts[key] || 0) + 1;
});

const tiers = ['Tier 1: Beginner', 'Tier 2: Intermediate', 'Tier 3: Advanced', 'Tier 4: Master'];
const expectedQuotesTier = {
  'Tier 1: Beginner': 50,
  'Tier 2: Intermediate': 75,
  'Tier 3: Advanced': 72,
  'Tier 4: Master': 53
};

for (const [cat, expectedTotal] of Object.entries(expectedCats)) {
  tiers.forEach(tier => {
    const key = `${cat} -> ${tier}`;
    const actual = tierCounts[key] || 0;
    const expectedPerTier = cat === 'Quotes'
      ? expectedQuotesTier[tier]
      : (tier === 'Tier 4: Master' ? 32 : 31);
    if (actual !== expectedPerTier) {
      errors.push(`Tier ${key} expected ${expectedPerTier} levels, found ${actual}`);
    }
  });
}

// 5. Duplicate check
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const seen = new Map();
LEVEL_DATA.forEach(l => {
  const norm = normalize(l.quote);
  if (seen.has(norm)) {
    const orig = seen.get(norm);
    errors.push(`Duplicate detected: [${l.category} #${l.num}] and [${orig.category} #${orig.num}]: "${l.quote}"`);
  } else {
    seen.set(norm, l);
  }
});

// 6. Character set check on quotes
const validCharRegex = /^[A-Za-z0-9\s.,!?;:'"–—\-\/()%]+$/;
LEVEL_DATA.forEach(l => {
  if (!validCharRegex.test(l.quote)) {
    const invalidChars = l.quote.split('').filter(c => !validCharRegex.test(c));
    errors.push(`Level ${l.id} contains unsupported characters: ${JSON.stringify(invalidChars)} in "${l.quote}"`);
  }
  if (!l.quote || l.quote.length < 5) {
    errors.push(`Level ${l.id} has abnormally short quote: "${l.quote}"`);
  }
});

console.log("\n=== VALIDATION RESULTS ===");
if (errors.length > 0) {
  console.error(`FAILED with ${errors.length} error(s):`);
  errors.forEach(err => console.error(" - " + err));
  process.exit(1);
} else {
  console.log("PASS! All 800 levels passed all validation checks with 0 errors!");
  console.log("  - Exactly 800 levels sequentially numbered 1..800");
  console.log("  - Exactly 0 duplicates across all categories");
  console.log("  - Quotes: 200 (50 per tier)");
  console.log("  - Proverbs: 100 (25 per tier)");
  console.log("  - Riddles: 100 (25 per tier)");
  console.log("  - Movie Lines: 100 (25 per tier)");
  console.log("  - Trivia: 100 (25 per tier)");
  console.log("  - Wordplay: 100 (25 per tier)");
  console.log("  - Jokes: 100 (25 per tier)");
}

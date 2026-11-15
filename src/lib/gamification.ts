// Gamification and Motivation Engine for Commit & Conquer
import { type DayRecords, formatDateKey } from "./streak-tracker";

export const GAMIFICATION_STORAGE_KEY = "commit-conquer-gamification-v2";

export type LevelInfo = {
  level: number;
  title: string;
  subtitle: string;
  minXP: number;
  maxXP: number;
  progress: number;
  badge: string;
};

export const LEVEL_TIERS: LevelInfo[] = [
  {
    level: 1,
    title: "Sleepy Coder",
    subtitle: "Just beginning the cozy journey. One line at a time.",
    minXP: 0,
    maxXP: 50,
    progress: 0,
    badge: "💤",
  },
  {
    level: 2,
    title: "Bug Catcher",
    subtitle: "Spotting syntax slips and hunting edge cases.",
    minXP: 50,
    maxXP: 150,
    progress: 0,
    badge: "🐛",
  },
  {
    level: 3,
    title: "Logic Wizard",
    subtitle: "Weaving loops, recursion, and clear thinking.",
    minXP: 150,
    maxXP: 300,
    progress: 0,
    badge: "🧙‍♂️",
  },
  {
    level: 4,
    title: "Code Sorceress",
    subtitle: "Conjuring algorithms that bend time complexity.",
    minXP: 300,
    maxXP: 600,
    progress: 0,
    badge: "🪄",
  },
  {
    level: 5,
    title: "Algorithm Queen",
    subtitle: "Ruling competitive brackets with calm precision.",
    minXP: 600,
    maxXP: 1000,
    progress: 0,
    badge: "👑",
  },
  {
    level: 6,
    title: "Grandmaster Coder",
    subtitle: "A legendary garden of boundless discipline and joy.",
    minXP: 1000,
    maxXP: 2500,
    progress: 0,
    badge: "⭐",
  },
];

export function getGamifiedLevel(totalXP: number): LevelInfo {
  const safeXP = Math.max(0, totalXP);
  for (let i = LEVEL_TIERS.length - 1; i >= 0; i--) {
    const tier = LEVEL_TIERS[i];
    if (safeXP >= tier.minXP) {
      const range = tier.maxXP - tier.minXP;
      const gained = safeXP - tier.minXP;
      const progress = Math.min(100, Math.floor((gained / range) * 100));
      return { ...tier, progress };
    }
  }
  return { ...LEVEL_TIERS[0], progress: 0 };
}

export type PetAccessoryId = "none" | "ribbon" | "glasses" | "wizard_hat" | "crown" | "flower_pin";

export type PetAccessory = {
  id: PetAccessoryId;
  name: string;
  icon: string;
  description: string;
  unlockRequirement: string;
};

export const PET_ACCESSORIES: PetAccessory[] = [
  {
    id: "none",
    name: "Classic Natural",
    icon: "🐾",
    description: "Pure cozy fur, ready for coding naps.",
    unlockRequirement: "Unlocked by default",
  },
  {
    id: "ribbon",
    name: "Cozy Pink Ribbon",
    icon: "🎀",
    description: "A soft silk bow tied with careful precision.",
    unlockRequirement: "Reach a 3-day coding streak",
  },
  {
    id: "glasses",
    name: "Hacker Glasses",
    icon: "👓",
    description: "Tiny specs with blue-light filter lenses.",
    unlockRequirement: "Reach a 7-day coding streak",
  },
  {
    id: "wizard_hat",
    name: "Arcane Wizard Hat",
    icon: "🧙",
    description: "Imbued with the power of constant-time lookups.",
    unlockRequirement: "Reach a 14-day coding streak",
  },
  {
    id: "flower_pin",
    name: "Golden Bloom Pin",
    icon: "🌸",
    description: "Crafted from your rarest double-win garden blooms.",
    unlockRequirement: "Complete 3 double-win days (Codeforces + GitHub)",
  },
  {
    id: "crown",
    name: "Algorithm Crown",
    icon: "👑",
    description: "Worn by masters of DP and clean architecture.",
    unlockRequirement: "Reach a 30-day coding streak",
  },
];

export type RewardItem = {
  id: string;
  title: string;
  xpCost: number;
  image?: string;
  emoji: string;
  description: string;
  isCustom?: boolean;
};

export const DEFAULT_REWARDS: RewardItem[] = [
  {
    id: "reward-show",
    title: "Watch an episode of your favorite show",
    xpCost: 100,
    image: "/assets/aistudio/image_5241e55e.png",
    emoji: "📺",
    description: "Kick back on the couch with your favorite comfort series guilt-free.",
  },
  {
    id: "reward-cafe",
    title: "Cute café treat or sweet pastry",
    xpCost: 300,
    image: "/assets/aistudio/image_acdbb1a5.png",
    emoji: "🍰",
    description: "Head to a cozy coffee shop for an iced latte and strawberry shortcake.",
  },
  {
    id: "reward-stationery",
    title: "Buy stationery or coding notebook",
    xpCost: 500,
    image: "/assets/aistudio/image_76f6db95.png",
    emoji: "📚",
    description: "Treat yourself to high-grade pens, cute washi tape, or a grid notebook.",
  },
  {
    id: "reward-gift",
    title: "Special mystery reward of your choice",
    xpCost: 1000,
    image: "/assets/aistudio/image_45dcf2fc.png",
    emoji: "🎁",
    description: "A special item on your personal wishlist you've had your eye on.",
  },
  {
    id: "reward-celebration",
    title: "Big personal celebration reward",
    xpCost: 3000,
    image: "/assets/aistudio/image_2922bca1.png",
    emoji: "🎉",
    description: "A major milestone reward: fancy dinner, keyboard upgrade, or day trip!",
  },
];

export type RedeemedEntry = {
  id: string;
  rewardId: string;
  title: string;
  xpCost: number;
  emoji: string;
  redeemedAt: string;
};

export type LibraryTopics = {
  dp: number;
  graphs: number;
  binarySearch: number;
  greedy: number;
  math: number;
  dataStructures: number;
};

export type GamificationState = {
  soundEnabled: boolean;
  freezesAvailable: number;
  frozenDates: Record<string, boolean>; // date keys that used a streak freeze
  equippedAccessory: PetAccessoryId;
  unopenedChests: number;
  openedChestsCount: number;
  unlockedDecorations: string[];
  customRewards: RewardItem[];
  redeemedLog: RedeemedEntry[];
  spentXP: number;
  bonusXP: number; // one-time bonuses (boss defeat, daily quest bonus, comeback bonus)
  cfRating: number;
  cfRatingGoal: number;
  futureNote: string;
  libraryTopics: LibraryTopics;
  weeklyBossClaimedWeek: string; // ISO week string like "2026-W46"
  lastComebackDate: string;
  cakeSlicesFed: number;
};

export const INITIAL_GAMIFICATION_STATE: GamificationState = {
  soundEnabled: true,
  freezesAvailable: 1, // 1 welcome streak freeze
  frozenDates: {},
  equippedAccessory: "none",
  unopenedChests: 1, // 1 welcome mystery chest
  openedChestsCount: 0,
  unlockedDecorations: ["Oak Programmer Desk", "Cozy Bed & Quilt"],
  customRewards: [],
  redeemedLog: [],
  spentXP: 0,
  bonusXP: 0,
  cfRating: 850,
  cfRatingGoal: 1400,
  futureNote: "Dear future me, consistency beats intensity. Keep planting seeds!",
  libraryTopics: {
    dp: 3,
    graphs: 2,
    binarySearch: 4,
    greedy: 5,
    math: 3,
    dataStructures: 4,
  },
  weeklyBossClaimedWeek: "",
  lastComebackDate: "",
  cakeSlicesFed: 0,
};

export function readGamificationState(): GamificationState {
  if (typeof window === "undefined") return INITIAL_GAMIFICATION_STATE;
  try {
    const raw = window.localStorage.getItem(GAMIFICATION_STORAGE_KEY);
    if (!raw) return INITIAL_GAMIFICATION_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_GAMIFICATION_STATE,
      ...parsed,
      libraryTopics: {
        ...INITIAL_GAMIFICATION_STATE.libraryTopics,
        ...(parsed.libraryTopics || {}),
      },
    };
  } catch {
    return INITIAL_GAMIFICATION_STATE;
  }
}

export function writeGamificationState(state: GamificationState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GAMIFICATION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

// Compute ISO Week string e.g. "2026-W46"
export function getISOWeekKey(d: Date): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNumber =
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    );
  return `${date.getFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

// Get dates for current Monday to Sunday week
export function getCurrentWeekDates(today: Date): string[] {
  const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(formatDateKey(d));
  }
  return dates;
}

export type BossStatus = {
  name: string;
  subtitle: string;
  maxHp: number;
  currentHp: number;
  daysActiveThisWeek: number;
  isDefeated: boolean;
  rewardClaimed: boolean;
  weekKey: string;
};

export function getWeeklyBossStatus(
  records: DayRecords,
  today: Date,
  claimedWeek: string,
): BossStatus {
  const weekDates = getCurrentWeekDates(today);
  const weekKey = getISOWeekKey(today);

  let daysActive = 0;
  for (const dateKey of weekDates) {
    if (records[dateKey]?.codeforces || records[dateKey]?.github) {
      daysActive++;
    }
  }

  const maxHp = 5;
  const currentHp = Math.max(0, maxHp - daysActive);
  const isDefeated = daysActive >= maxHp;
  const rewardClaimed = claimedWeek === weekKey;

  return {
    name: "Bugzilla the Glitch Dragon",
    subtitle:
      "Deals 1 DMG for each coding day logged this week (Mon-Sun). Defeat to earn +50 XP & Boss Chest!",
    maxHp,
    currentHp,
    daysActiveThisWeek: daysActive,
    isDefeated,
    rewardClaimed,
    weekKey,
  };
}

export type ChestDrop = {
  type: "freeze" | "xp" | "decor" | "accessory";
  title: string;
  description: string;
  badge: string;
};

export const POSSIBLE_CHEST_DROPS: ChestDrop[] = [
  {
    type: "freeze",
    title: "Glacial Shield (+1 Streak Freeze)",
    description: "Safely protects any missed day from resetting your streak.",
    badge: "❄️",
  },
  {
    type: "xp",
    title: "Arcane EXP Vial (+35 XP)",
    description: "Concentrated algorithmic essence to boost your level progress.",
    badge: "✨",
  },
  {
    type: "decor",
    title: "Room Item: Synthwave Neon Poster",
    description: "A glowing retro cyberpunk poster for your coding room wall.",
    badge: "🖼️",
  },
  {
    type: "decor",
    title: "Room Item: Warm Fairy Lights",
    description: "Twinkling amber lights strung across your virtual bookshelf.",
    badge: "💡",
  },
  {
    type: "decor",
    title: "Room Item: Zen Bonsai Tree",
    description: "A carefully pruned miniature tree bringing serene focus.",
    badge: "🪴",
  },
  {
    type: "accessory",
    title: "Pet Wear: Arcane Wizard Hat",
    description: "An enchanted hat for your pixel companion to wear with pride.",
    badge: "🧙",
  },
  {
    type: "accessory",
    title: "Pet Wear: Golden Algorithm Crown",
    description: "A sparkling royal crown for reaching peak consistency.",
    badge: "👑",
  },
];

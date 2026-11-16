import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  Flame,
  Flower2,
  Gift,
  Github,
  Heart,
  HelpCircle,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  ShoppingBag,
  Sparkles,
  Sprout,
  Star,
  Swords,
  Target,
  Timer,
  Trophy,
  Volume2,
  VolumeX,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import sproutImage from "@/assets/streak-sprout.png";

// User-provided pixel art assets
const sleepingCatImage = "/assets/aistudio/image_a019cef5.png";
const awakeCatImage = "/assets/aistudio/image_f6faf803.png";
const gardenArtImage = "/assets/aistudio/image_a7bfbdfb.png";
const gardenPlantImage = "/assets/aistudio/image_20412d19.png";
const roomArtImage = "/assets/aistudio/image_a1629dbf.png";
const roomNightImage = "/assets/aistudio/image_82c1d08f.png";
const badgesArtImage = "/assets/aistudio/image_2922bca1.png";
const chestOpenImage = "/assets/aistudio/image_77a9a690.png";
const giftBoxImage = "/assets/aistudio/image_45dcf2fc.png";
const levelUpArtImage = "/assets/aistudio/image_36c9663a.png";
const libraryBooksImage = "/assets/aistudio/image_76f6db95.png";
const chainPaperImage = "/assets/aistudio/image_ca690a25.png";
const cakeImage = "/assets/aistudio/image_acdbb1a5.png";
const couchShowImage = "/assets/aistudio/image_5241e55e.png";
const futureCoderImage = "/assets/aistudio/image_2dc0b4dd.png";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { play8BitSound } from "@/lib/audio-effects";
import {
  DEFAULT_REWARDS,
  getGamifiedLevel,
  getWeeklyBossStatus,
  INITIAL_GAMIFICATION_STATE,
  PET_ACCESSORIES,
  POSSIBLE_CHEST_DROPS,
  readGamificationState,
  writeGamificationState,
  type ChestDrop,
  type GamificationState,
  type PetAccessoryId,
  type RedeemedEntry,
  type RewardItem,
} from "@/lib/gamification";
import { triggerPixelConfetti } from "@/lib/pixel-confetti";
import {
  ACHIEVEMENT_DEFINITIONS,
  createCalendarDays,
  decodeRecords,
  formatDateKey,
  getAchievements,
  getMonthlyCompletion,
  getStreakMetrics,
  getTotalXP,
  RECORDS_STORAGE_KEY,
  toggleActivity,
  xpForDay,
  type AchievementId,
  type ActivityName,
  type DayRecord,
  type DayRecords,
} from "@/lib/streak-tracker";

const CAT_STORAGE_KEY = "commit-conquer-cat-v1";
const TAB_STORAGE_KEY = "commit-conquer-tab-v1";

type ActiveTab = "tracker" | "garden" | "pet_room" | "shop" | "future_me" | "badges";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Commit & Conquer — Cozy Coding RPG & Garden" },
      {
        name: "description",
        content:
          "A cozy pixel-art coding RPG with flower growth, virtual pet, reward shop, streak freeze, weekly boss, and competitive programming roadmap.",
      },
      { property: "og:title", content: "Commit & Conquer — Cozy Coding RPG & Garden" },
      {
        property: "og:description",
        content:
          "Level up your coding habits with an adorable pixel pet, weekly bosses, and real-life rewards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CodingGarden,
});

const ACHIEVEMENT_ART: Record<AchievementId, LucideIcon> = {
  "first-commit": Github,
  "first-problem": Code2,
  "streak-3": Sprout,
  "streak-7": Flower2,
  "streak-14": Star,
  "streak-30": Sparkles,
  "perfect-week": CalendarDays,
  "double-trouble": Trophy,
};

const GARDEN_STAGES = [
  { name: "Little sprout", description: "A tiny seedling with big dreams.", icon: Sprout },
  { name: "Growing green", description: "Your small wins are taking root.", icon: Sprout },
  { name: "Bud & bloom", description: "Your garden is finding its colors.", icon: Flower2 },
  { name: "Cozy tree", description: "Look how much you have grown.", icon: TreeDeciduous },
  { name: "Magic garden", description: "A little wonder you grew yourself.", icon: Sparkles },
] as const;

function TreeDeciduous(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      {...props}
    >
      <path d="M8 19h8a4 4 0 0 0 3.8-2.8 4 4 0 0 0-1.6-4.5c.5-.8.8-1.8.8-2.7a5 5 0 0 0-8.5-3.5A5 5 0 0 0 3 10c0 1.2.4 2.3 1.1 3.2A4 4 0 0 0 4 16.2 4 4 0 0 0 8 19z" />
      <path d="M12 19v3" />
    </svg>
  );
}

const MOTIVATIONS = [
  "One problem a day keeps the rust away.",
  "Little progress is still progress.",
  "Your future self is cheering you on.",
  "Consistency grows one tiny win at a time.",
  "Show up, plant a seed, and let it grow.",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function readSavedRecords(): DayRecords {
  if (typeof window === "undefined") return {};
  try {
    const serialized = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    return serialized ? decodeRecords(JSON.parse(serialized)) : {};
  } catch {
    return {};
  }
}

function writeSavedRecords(records: DayRecords) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage errors
  }
}

function readCatData(): { name: string; pets: number } {
  if (typeof window === "undefined") return { name: "Pixel Cat", pets: 0 };
  try {
    const raw = window.localStorage.getItem(CAT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { name: "Pixel Cat", pets: 0 };
  } catch {
    return { name: "Pixel Cat", pets: 0 };
  }
}

function writeCatData(data: { name: string; pets: number }) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function isSameDay(left: Date, right: Date): boolean {
  return formatDateKey(left) === formatDateKey(right);
}

function CodingGarden() {
  const [records, setRecords] = useState<DayRecords>({});
  const [today, setToday] = useState<Date>(() => new Date());
  const [hydrated, setHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("tracker");
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [catDialogue, setCatDialogue] = useState<string | null>(null);
  const [pettingAnimation, setPettingAnimation] = useState(false);
  const [catData, setCatData] = useState<{ name: string; pets: number }>({
    name: "Pixel Cat",
    pets: 0,
  });
  const [gamification, setGamification] = useState<GamificationState>(INITIAL_GAMIFICATION_STATE);

  // Focus Timer state (20 minutes = 1200s)
  const [timerSeconds, setTimerSeconds] = useState(1200);
  const [timerRunning, setTimerRunning] = useState(false);

  // Modals state
  const [chestModalOpen, setChestModalOpen] = useState(false);
  const [lastLoot, setLastLoot] = useState<ChestDrop | null>(null);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [customRewardModalOpen, setCustomRewardModalOpen] = useState(false);
  const [newRewardTitle, setNewRewardTitle] = useState("");
  const [newRewardCost, setNewRewardCost] = useState("200");
  const [newRewardDesc, setNewRewardDesc] = useState("");
  const [newRewardEmoji, setNewRewardEmoji] = useState("🎁");

  const [motivationIndex, setMotivationIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate accessible IDs for forms and controls
  const fileInputId = useId();
  const rewardTitleId = useId();
  const rewardCostId = useId();
  const rewardDescId = useId();
  const rewardEmojiId = useId();

  useEffect(() => {
    const latestToday = new Date();
    setToday(latestToday);
    setVisibleMonth(new Date(latestToday.getFullYear(), latestToday.getMonth(), 1));
    const savedRecords = readSavedRecords();
    setRecords(savedRecords);
    setCatData(readCatData());
    const savedGamification = readGamificationState();
    setGamification(savedGamification);

    try {
      const savedTab = window.localStorage.getItem(TAB_STORAGE_KEY);
      if (
        savedTab &&
        ["tracker", "garden", "pet_room", "shop", "future_me", "badges"].includes(savedTab)
      ) {
        setActiveTab(savedTab as ActiveTab);
      }
    } catch {
      // Ignore localStorage access errors
    }
    setHydrated(true);
  }, []);

  // 20-minute Focus Timer countdown effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (gamification.soundEnabled) play8BitSound("chime");
            triggerPixelConfetti();
            setFeedback("Focus session complete! 20 minutes of solid coding logged! 🎉");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, timerSeconds, gamification.soundEnabled]);

  function handleTabChange(tab: ActiveTab) {
    setActiveTab(tab);
    if (gamification.soundEnabled) play8BitSound("blip");
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(TAB_STORAGE_KEY, tab);
      } catch {
        // Ignore localStorage access errors
      }
    }
  }

  function toggleSound() {
    const next = !gamification.soundEnabled;
    const updated = { ...gamification, soundEnabled: next };
    setGamification(updated);
    writeGamificationState(updated);
    if (next) play8BitSound("blip");
  }

  const todayKey = formatDateKey(today);
  const todayRecord = records[todayKey];
  const baseXP = getTotalXP(records);
  const totalXP = baseXP + gamification.bonusXP;
  const levelInfo = getGamifiedLevel(totalXP);
  const redeemableXP = Math.max(0, totalXP - gamification.spentXP);

  const metrics = getStreakMetrics(records, today, gamification.frozenDates);
  const monthProgress = getMonthlyCompletion(
    records,
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    today,
  );
  const achievements = getAchievements(records, gamification.frozenDates);
  const gardenStage = GARDEN_STAGES[Math.min(GARDEN_STAGES.length - 1, levelInfo.level - 1)];
  const GardenIcon = gardenStage.icon;

  const selectedKey = selectedDate ? formatDateKey(selectedDate) : "";
  const selectedRecord = selectedKey ? records[selectedKey] : undefined;
  const selectedIsFuture = selectedDate ? formatDateKey(selectedDate) > todayKey : false;
  const monthLabel = visibleMonth.toLocaleDateString("en", { month: "long", year: "numeric" });
  const calendarDays = createCalendarDays(visibleMonth.getFullYear(), visibleMonth.getMonth());

  // Today activity completion status
  const hasTodayActivity = Boolean(todayRecord?.codeforces || todayRecord?.github);
  const isTodayFullyComplete = Boolean(todayRecord?.codeforces && todayRecord?.github);

  // Weekly Boss Status
  const boss = getWeeklyBossStatus(records, today, gamification.weeklyBossClaimedWeek);

  // Check Comeback Status
  const isComebackDay = (() => {
    if (hasTodayActivity || gamification.lastComebackDate === todayKey) return false;
    // Check if yesterday had no activity and user hasn't visited in 2+ days
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = formatDateKey(yesterday);
    return !records[yesterdayKey] && Object.keys(records).length > 0;
  })();

  function claimComebackBonus() {
    const updated = {
      ...gamification,
      bonusXP: gamification.bonusXP + 15,
      lastComebackDate: todayKey,
    };
    setGamification(updated);
    writeGamificationState(updated);
    if (gamification.soundEnabled) play8BitSound("chime");
    triggerPixelConfetti();
    setFeedback("Welcome back! +15 XP bonus added. The garden is cheering you on!");
  }

  // Pet Dialogue and Actions
  function handlePetCat() {
    setPettingAnimation(true);
    const newCount = catData.pets + 1;
    const updatedCat = { ...catData, pets: newCount };
    setCatData(updatedCat);
    writeCatData(updatedCat);

    if (gamification.soundEnabled) play8BitSound("purr");

    const compliments = [
      "Purrr~ You're my favorite programmer! 🐾",
      "Meow! Keep growing your coding garden! 🌸",
      "*Happy headbutts against your keyboard* 💖",
      "Mrrrp! You've got this today! ✨",
      `*Loud rhythmic purring* Petted ${newCount} times! 🐱`,
    ];
    const picked = compliments[Math.floor(Math.random() * compliments.length)] ?? compliments[0];
    setCatDialogue(picked);
    setTimeout(() => {
      setPettingAnimation(false);
    }, 2000);
  }

  function handleFeedCake() {
    const nextCount = (gamification.cakeSlicesFed || 0) + 1;
    const updated = {
      ...gamification,
      cakeSlicesFed: nextCount,
      bonusXP: gamification.bonusXP + 5,
    };
    setGamification(updated);
    writeGamificationState(updated);

    if (gamification.soundEnabled) play8BitSound("chime");
    triggerPixelConfetti();

    const cakeLines = [
      "*Nom nom nom!* The strawberry cake is so delicious! Purrrrr~ 🍓✨",
      "Meow! Best coding treat ever! Extra strawberry on top! 🍰💖",
      "*Licks paws happily* Sugar rush! Ready to solve another problem! 🐾⚡",
      "Mrrrp! Celebrating our coding streak with strawberry cake! 🎉🍰",
    ];
    const picked = cakeLines[Math.floor(Math.random() * cakeLines.length)] ?? cakeLines[0];
    setCatDialogue(picked);
    setFeedback(`Fed ${catData.name} a slice of strawberry cake! (+5 Bonus XP) 🍓`);
  }

  function handleEquipAccessory(accId: PetAccessoryId) {
    const updated = { ...gamification, equippedAccessory: accId };
    setGamification(updated);
    writeGamificationState(updated);
    if (gamification.soundEnabled) play8BitSound("blip");
    setFeedback(`Equipped ${PET_ACCESSORIES.find((a) => a.id === accId)?.name}!`);
  }

  function saveUpdatedRecords(updated: DayRecords) {
    writeSavedRecords(updated);
    setRecords(updated);
    setFeedback("Saved to local storage");
  }

  function updateActivityForDate(dateKey: string, activity: ActivityName, checked: boolean) {
    if (!dateKey || dateKey > todayKey) return;

    const oldRecord = records[dateKey];
    const nextRecord: DayRecord = {
      codeforces: oldRecord?.codeforces ?? false,
      github: oldRecord?.github ?? false,
      [activity]: checked,
    };
    const wasEmpty = !oldRecord?.codeforces && !oldRecord?.github;
    const updated = toggleActivity(records, dateKey, activity, checked);

    saveUpdatedRecords(updated);

    if (gamification.soundEnabled) {
      if (checked) {
        if (nextRecord.codeforces && nextRecord.github) {
          play8BitSound("chime");
        } else {
          play8BitSound("blip");
        }
      }
    }

    if (checked && wasEmpty) {
      setFeedback("Flower planted! Your daily seed took root.");
    }

    if (xpForDay(nextRecord) >= 25 && xpForDay(oldRecord) < 25) {
      triggerPixelConfetti();
      setFeedback("Double win! A rare golden blossom bloomed (+5 XP bonus)!");
    }
  }

  // Streak Freeze handler
  function activateStreakFreeze(dateKey: string) {
    if (gamification.freezesAvailable <= 0) {
      setFeedback("No streak freezes available. Earn more via 7-day milestones or chests!");
      return;
    }
    if (records[dateKey]?.codeforces || records[dateKey]?.github) {
      setFeedback("This day is already completed with coding activity!");
      return;
    }
    const updatedFrozen = { ...gamification.frozenDates, [dateKey]: true };
    const updated = {
      ...gamification,
      freezesAvailable: gamification.freezesAvailable - 1,
      frozenDates: updatedFrozen,
    };
    setGamification(updated);
    writeGamificationState(updated);
    if (gamification.soundEnabled) play8BitSound("chime");
    triggerPixelConfetti();
    setFeedback(`Protected ${dateKey} with a Streak Freeze! ❄️ Your streak is safe.`);
    setFreezeModalOpen(false);
  }

  // Attack Weekly Boss
  function handleAttackBoss() {
    if (!boss.isDefeated) {
      if (gamification.soundEnabled) play8BitSound("boss");
      setFeedback(
        `Code Strike! You have completed ${boss.daysActiveThisWeek} days this week! Boss HP: ${boss.currentHp}/${boss.maxHp}`,
      );
    } else if (!boss.rewardClaimed) {
      const updated = {
        ...gamification,
        bonusXP: gamification.bonusXP + 50,
        unopenedChests: gamification.unopenedChests + 1,
        weeklyBossClaimedWeek: boss.weekKey,
      };
      setGamification(updated);
      writeGamificationState(updated);
      if (gamification.soundEnabled) play8BitSound("levelup");
      triggerPixelConfetti();
      setFeedback("BOSS DEFEATED! +50 XP and +1 Mystery Chest awarded! 🎉");
    }
  }

  // Open Mystery Chest
  function handleOpenChest() {
    if (gamification.unopenedChests <= 0) return;

    const rolled =
      POSSIBLE_CHEST_DROPS[Math.floor(Math.random() * POSSIBLE_CHEST_DROPS.length)] ??
      POSSIBLE_CHEST_DROPS[0];
    setLastLoot(rolled);

    let nextBonusXP = gamification.bonusXP;
    let nextFreezes = gamification.freezesAvailable;
    const nextDecor = [...gamification.unlockedDecorations];

    if (rolled.type === "xp") nextBonusXP += 35;
    if (rolled.type === "freeze") nextFreezes += 1;
    if (rolled.type === "decor" && !nextDecor.includes(rolled.title)) {
      nextDecor.push(rolled.title);
    }

    const updated = {
      ...gamification,
      unopenedChests: gamification.unopenedChests - 1,
      openedChestsCount: gamification.openedChestsCount + 1,
      bonusXP: nextBonusXP,
      freezesAvailable: nextFreezes,
      unlockedDecorations: nextDecor,
    };
    setGamification(updated);
    writeGamificationState(updated);

    if (gamification.soundEnabled) play8BitSound("chest");
    triggerPixelConfetti();
    setChestModalOpen(true);
  }

  // Redeem Real-Life Reward
  function handleRedeemReward(reward: RewardItem) {
    if (redeemableXP < reward.xpCost) {
      setFeedback(`Need ${reward.xpCost - redeemableXP} more XP to redeem this treat!`);
      return;
    }

    const entry: RedeemedEntry = {
      id: "redeemed-" + Date.now(),
      rewardId: reward.id,
      title: reward.title,
      xpCost: reward.xpCost,
      emoji: reward.emoji,
      redeemedAt: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const updated = {
      ...gamification,
      spentXP: gamification.spentXP + reward.xpCost,
      redeemedLog: [entry, ...gamification.redeemedLog],
    };
    setGamification(updated);
    writeGamificationState(updated);

    if (gamification.soundEnabled) play8BitSound("levelup");
    triggerPixelConfetti();
    setFeedback(`Redeemed "${reward.title}"! Enjoy your well-earned reward! 💖`);
  }

  // Add Custom Reward
  function handleAddCustomReward(e: React.FormEvent) {
    e.preventDefault();
    if (!newRewardTitle.trim()) return;
    const cost = Math.max(10, parseInt(newRewardCost) || 100);

    const custom: RewardItem = {
      id: "custom-" + Date.now(),
      title: newRewardTitle.trim(),
      xpCost: cost,
      emoji: newRewardEmoji || "🎁",
      description: newRewardDesc.trim() || "A customized personal treat.",
      isCustom: true,
    };

    const updated = {
      ...gamification,
      customRewards: [...gamification.customRewards, custom],
    };
    setGamification(updated);
    writeGamificationState(updated);
    setNewRewardTitle("");
    setNewRewardDesc("");
    setCustomRewardModalOpen(false);
    if (gamification.soundEnabled) play8BitSound("chime");
    setFeedback(`Added custom reward "${custom.title}" to your shop!`);
  }

  // Save Future Me Note
  function handleSaveFutureNote(note: string) {
    const updated = { ...gamification, futureNote: note };
    setGamification(updated);
    writeGamificationState(updated);
  }

  // Increment Problem Library Topic
  function handleAddLibraryTopic(topic: keyof typeof gamification.libraryTopics) {
    const nextCount = (gamification.libraryTopics[topic] || 0) + 1;
    const updated = {
      ...gamification,
      libraryTopics: { ...gamification.libraryTopics, [topic]: nextCount },
    };
    setGamification(updated);
    writeGamificationState(updated);
    if (gamification.soundEnabled) play8BitSound("blip");
    setFeedback(`Logged +1 problem to ${topic.toUpperCase()} in your library! 📚`);
  }

  // Sample data loader
  function loadSampleData() {
    const sample: DayRecords = {};
    for (let i = 0; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = formatDateKey(d);
      if (i % 3 === 0) {
        sample[k] = { codeforces: true, github: true };
      } else if (i % 2 === 0) {
        sample[k] = { codeforces: true, github: false };
      } else {
        sample[k] = { codeforces: false, github: true };
      }
    }
    saveUpdatedRecords(sample);
    const updatedGamification: GamificationState = {
      ...gamification,
      freezesAvailable: 2,
      unopenedChests: 2,
      bonusXP: 60,
      libraryTopics: {
        dp: 8,
        graphs: 6,
        binarySearch: 7,
        greedy: 10,
        math: 5,
        dataStructures: 9,
      },
    };
    setGamification(updatedGamification);
    writeGamificationState(updatedGamification);
    setFeedback("Loaded 14 days of sample garden & RPG data!");
    setSettingsOpen(false);
  }

  function downloadBackup() {
    const backup = {
      format: "commit-and-conquer",
      version: 2,
      exportedAt: new Date().toISOString(),
      records,
      catData,
      gamification,
    };
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `commit-and-conquer-${formatDateKey(today)}.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setImportMessage("A complete backup of your garden & RPG progress has been saved.");
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const backup = decodeRecords(raw);
      writeSavedRecords(backup);
      setRecords(backup);
      if (raw.gamification) {
        const nextGam = { ...INITIAL_GAMIFICATION_STATE, ...raw.gamification };
        setGamification(nextGam);
        writeGamificationState(nextGam);
      }
      setImportMessage(`Restored ${Object.keys(backup).length} days and RPG progress.`);
      setFeedback("Coding garden & RPG progress restored!");
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "We couldn't read that backup file.",
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetRecords() {
    try {
      writeSavedRecords({});
      setRecords({});
      writeGamificationState(INITIAL_GAMIFICATION_STATE);
      setGamification(INITIAL_GAMIFICATION_STATE);
      setFeedback("Fresh soil. All local storage reset to new beginning!");
      setResetOpen(false);
      setSettingsOpen(false);
    } catch {
      setImportMessage("Could not clear local storage.");
      setResetOpen(false);
    }
  }

  function navigateMonth(amount: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function returnToToday() {
    setToday(new Date());
    setVisibleMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  }

  const allRewards = [...DEFAULT_REWARDS, ...gamification.customRewards];

  return (
    <main className="garden-page">
      <div className="garden-shell">
        {/* App Header */}
        <header className="garden-header">
          <a aria-label="Commit & Conquer home" className="brand-lockup" href="/">
            <span aria-hidden="true" className="brand-sprite">
              <Sprout className="w-6 h-6" />
            </span>
            <span>
              <span className="brand-name font-display">
                commit <span>&</span> conquer
              </span>
              <span className="brand-caption">cozy pixel RPG & coding garden</span>
            </span>
          </a>

          <div className="header-actions">
            {/* Streak Freeze button */}
            <button
              aria-label="Streak Freeze Shield"
              className="freeze-shield-badge"
              onClick={() => setFreezeModalOpen(true)}
              title="Protect a missed day with a Streak Freeze"
            >
              <span>❄️</span>
              <span>{gamification.freezesAvailable} Freezes</span>
            </button>

            {/* Mystery Chest button */}
            {gamification.unopenedChests > 0 && (
              <button
                aria-label="Mystery Chests"
                className="freeze-shield-badge !bg-amber-100 !text-amber-900 !border-amber-300 animate-pulse"
                onClick={handleOpenChest}
                title="Open your mystery reward chest!"
              >
                <span>🎁</span>
                <span>{gamification.unopenedChests} Chest</span>
              </button>
            )}

            {/* Sound Toggle */}
            <button
              aria-label={
                gamification.soundEnabled ? "Disable retro sounds" : "Enable retro sounds"
              }
              className="sound-toggle-btn"
              onClick={toggleSound}
              title={gamification.soundEnabled ? "Sound Effects: ON" : "Sound Effects: MUTED"}
            >
              {gamification.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {/* Settings button */}
            <Button
              aria-label="Open settings and backups"
              className="settings-trigger"
              onClick={() => setSettingsOpen(true)}
              size="icon"
              variant="outline"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Garden Vital Stats Horizontal Bar */}
        <div className="garden-vital-horizontal-bar">
          <div className="flex items-center gap-2">
            <span className="text-primary text-base">✿</span>
            <span className="font-display text-xs font-bold text-foreground tracking-wide">
              Garden Vital Stats
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{metrics.currentOverall} Day Streak</span>
            </span>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <span className="flex items-center gap-1.5">
              <span>🌻</span>
              <span>{metrics.codeforcesDays} Sunflowers</span>
            </span>
            <span aria-hidden="true" className="text-border">
              ·
            </span>
            <span className="flex items-center gap-1.5">
              <span>🌷</span>
              <span>{metrics.githubDays} Tulips</span>
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs italic text-primary font-medium">
            <span>✿</span>
            <span>"{MOTIVATIONS[motivationIndex]}"</span>
          </div>
        </div>

        {/* Level Up & EXP Hero Banner */}
        <section aria-label="Player Level & Title" className="level-hero-banner">
          <div className="level-hero-left">
            <div className="level-art-frame">
              <img alt="Level Up Crest" src={levelUpArtImage} />
            </div>
            <div className="level-info-stack">
              <div className="level-badge-pill">
                <span>{levelInfo.badge}</span>
                <span>LEVEL {levelInfo.level}</span>
              </div>
              <h2 className="level-title-text font-display">{levelInfo.title}</h2>
              <p className="level-sub-text">{levelInfo.subtitle}</p>
            </div>
          </div>

          <div className="level-xp-column">
            <div className="level-xp-labels">
              <span>EXP: {totalXP} PTS</span>
              <span>
                {levelInfo.level < 6 ? `${levelInfo.maxXP - totalXP} to next level` : "MAX TIER"}
              </span>
            </div>
            <div className="level-xp-bar-bg">
              <div
                className="level-xp-bar-fill"
                style={{ width: `${Math.max(5, levelInfo.progress)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-amber-900">
              <span className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-600" /> {metrics.currentOverall} Day Streak
              </span>
              <span className="flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-600" /> {redeemableXP} Spendable XP
              </span>
            </div>
          </div>
        </section>

        {/* Comeback Welcome Banner (if returning after missed days) */}
        {isComebackDay && (
          <div className="comeback-banner">
            <div>
              <h3 className="comeback-title font-display">🌱 Welcome back, coder!</h3>
              <p className="comeback-text">
                Your garden missed you, but your soil is warm and ready. Consistency is a lifelong
                journey!
              </p>
            </div>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700 font-bold text-xs"
              onClick={claimComebackBonus}
              size="sm"
            >
              Claim +15 XP Revival
            </Button>
          </div>
        )}

        {/* Navigation Tabs Bar */}
        <nav aria-label="App Navigation" className="feature-nav-bar">
          <button
            className={`nav-tab-item ${activeTab === "tracker" ? "active" : ""}`}
            onClick={() => handleTabChange("tracker")}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Tracker & Quests</span>
          </button>
          <button
            className={`nav-tab-item ${activeTab === "garden" ? "active" : ""}`}
            onClick={() => handleTabChange("garden")}
          >
            <Flower2 className="w-4 h-4" />
            <span>Coding Garden</span>
          </button>
          <button
            className={`nav-tab-item ${activeTab === "pet_room" ? "active" : ""}`}
            onClick={() => handleTabChange("pet_room")}
          >
            <Heart className="w-4 h-4" />
            <span>Pet & Room</span>
          </button>
          <button
            className={`nav-tab-item ${activeTab === "shop" ? "active" : ""}`}
            onClick={() => handleTabChange("shop")}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Reward Shop</span>
          </button>
          <button
            className={`nav-tab-item ${activeTab === "future_me" ? "active" : ""}`}
            onClick={() => handleTabChange("future_me")}
          >
            <Target className="w-4 h-4" />
            <span>Future Me & Library</span>
          </button>
          <button
            className={`nav-tab-item ${activeTab === "badges" ? "active" : ""}`}
            onClick={() => handleTabChange("badges")}
          >
            <Trophy className="w-4 h-4" />
            <span>Heatmap & Badges</span>
          </button>
        </nav>

        {/* TAB 1: TRACKER & DAILY QUESTS */}
        {activeTab === "tracker" && (
          <div className="space-y-4">
            {/* Front & Center: Pixel Companion & Strawberry Celebration Cake */}
            <div className="companion-cake-card">
              {/* Pet Companion Side */}
              <div className="companion-side">
                <div className="companion-pet-box">
                  <img
                    alt={hasTodayActivity ? "Happy Awake Pixel Cat" : "Sleeping Curled Pixel Cat"}
                    src={hasTodayActivity ? awakeCatImage : sleepingCatImage}
                  />
                  {gamification.equippedAccessory !== "none" && (
                    <span className="pet-equipped-badge">
                      {PET_ACCESSORIES.find((a) => a.id === gamification.equippedAccessory)?.icon ??
                        "🎀"}
                    </span>
                  )}
                </div>

                <div className="companion-info">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-display text-sm font-bold m-0 text-foreground">
                      {catData.name}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasTodayActivity ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                    >
                      {hasTodayActivity ? "☀️ Awake & Cheering" : "💤 Snoozing"}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground m-0 italic line-clamp-2">
                    {catDialogue ||
                      (hasTodayActivity
                        ? "Mrrrp! You're coding today! I'm so happy and proud of you! 🐾"
                        : "Curled up snoozing... solve a problem or push a commit to wake me! 💤")}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      className="gap-1.5 text-xs font-bold h-7 px-2.5"
                      onClick={handlePetCat}
                      size="sm"
                      variant="outline"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${pettingAnimation ? "fill-red-500 text-red-500 scale-125" : ""}`}
                      />
                      Pet Cat ({catData.pets})
                    </Button>
                  </div>
                </div>
              </div>

              {/* Strawberry Cake Side */}
              <div className="cake-side">
                <div className="cake-art-box">
                  <img alt="Pixel Strawberry Cake with Scalloped Plate" src={cakeImage} />
                </div>

                <div className="cake-info">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-display text-sm font-bold m-0 text-rose-950">
                      Strawberry Cake
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      🍰 Sweet Treat
                    </span>
                  </div>

                  <p className="text-xs text-rose-800 m-0">
                    {gamification.cakeSlicesFed > 0
                      ? `${gamification.cakeSlicesFed} slices shared with your kitten!`
                      : "Celebrate today's coding wins with a fresh strawberry slice!"}
                  </p>

                  <button className="feed-cake-btn" onClick={handleFeedCake}>
                    <span>🍓</span> Feed Cat Cake Slice (+5 XP)
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Quest Card */}
            <div className="daily-quest-card">
              <div className="quest-header">
                <span className="quest-header-title font-display">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Today's Daily Quest
                </span>
                <span className="quest-bonus-tag">
                  {isTodayFullyComplete
                    ? "✨ Quest Complete (+10 Bonus XP Earned!)"
                    : "Complete both tasks for +10 XP Bonus!"}
                </span>
              </div>

              <div className="quest-items-grid">
                <div
                  className={`quest-checkbox-row ${todayRecord?.codeforces ? "done" : ""}`}
                  onClick={() =>
                    updateActivityForDate(todayKey, "codeforces", !todayRecord?.codeforces)
                  }
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={todayRecord?.codeforces ?? false}
                      className="border-emerald-600"
                    />
                    <span className="text-sm font-semibold">1 Codeforces Problem</span>
                  </div>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                    +10 XP 🌻
                  </span>
                </div>

                <div
                  className={`quest-checkbox-row ${todayRecord?.github ? "done" : ""}`}
                  onClick={() => updateActivityForDate(todayKey, "github", !todayRecord?.github)}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={todayRecord?.github ?? false}
                      className="border-emerald-600"
                    />
                    <span className="text-sm font-semibold">1 GitHub Commit</span>
                  </div>
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    +10 XP 🌷
                  </span>
                </div>
              </div>
            </div>

            {/* Weekly Boss Battle Arena */}
            <div className="boss-arena-card">
              <div className="boss-arena-header">
                <div className="boss-title-row">
                  <Swords className="w-5 h-5 text-purple-700" />
                  <div>
                    <h3 className="boss-name font-display">{boss.name}</h3>
                    <p className="text-xs text-purple-800">{boss.subtitle}</p>
                  </div>
                </div>

                <div className="boss-health-row">
                  <div className="boss-hearts-container" title={`${boss.currentHp}/5 HP remaining`}>
                    {[1, 2, 3, 4, 5].map((hp) => (
                      <span
                        key={hp}
                        className={`boss-heart ${hp > boss.currentHp ? "damaged" : ""}`}
                      >
                        ❤️
                      </span>
                    ))}
                  </div>

                  <button
                    className="boss-hit-button"
                    disabled={boss.rewardClaimed}
                    onClick={handleAttackBoss}
                  >
                    {boss.isDefeated
                      ? boss.rewardClaimed
                        ? "Victory Claimed ⭐"
                        : "Claim Boss Loot! 🎁"
                      : "Code Strike! ⚔️"}
                  </button>
                </div>
              </div>

              {boss.isDefeated && (
                <div className="boss-defeated-banner">
                  <span>
                    🎉 BOSS DEFEATED! You logged {boss.daysActiveThisWeek}/5 days this week!
                  </span>
                  {!boss.rewardClaimed && (
                    <Button
                      className="bg-purple-700 text-white hover:bg-purple-800 text-xs font-bold"
                      onClick={handleAttackBoss}
                      size="sm"
                    >
                      Open Boss Trophy (+50 XP)
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* 20-Minute Focus Timer */}
            <div className="focus-timer-card">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                  <Timer className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold m-0">"Just 20 Minutes" Focus Timer</h4>
                  <p className="text-xs text-muted-foreground m-0">
                    Overcome procrastination with a mini sprint.
                  </p>
                </div>
              </div>

              <div className="timer-digits">
                {String(Math.floor(timerSeconds / 60)).padStart(2, "0")}:
                {String(timerSeconds % 60).padStart(2, "0")}
              </div>

              <div className="timer-controls">
                <Button
                  className="gap-1 font-bold text-xs"
                  onClick={() => setTimerRunning(!timerRunning)}
                  size="sm"
                  variant={timerRunning ? "outline" : "default"}
                >
                  {timerRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Start
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setTimerRunning(false);
                    setTimerSeconds(1200);
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Calendar Tracker */}
            <section aria-labelledby="calendar-title" className="calendar-card">
              <div className="calendar-header-row">
                <div>
                  <p className="calendar-overline">MONTHLY VIEW</p>
                  <h2 className="calendar-title font-display" id="calendar-title">
                    {monthLabel}
                  </h2>
                </div>
                <div className="calendar-controls">
                  <Button
                    aria-label="Previous month"
                    onClick={() => navigateMonth(-1)}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button className="text-xs font-semibold" onClick={returnToToday} variant="ghost">
                    Today
                  </Button>
                  <Button
                    aria-label="Next month"
                    onClick={() => navigateMonth(1)}
                    size="icon"
                    variant="outline"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Day names */}
              <div className="calendar-grid-header">
                {WEEKDAYS.map((day) => (
                  <span key={day} className="weekday-col-label">
                    {day}
                  </span>
                ))}
              </div>

              {/* Calendar Tiles */}
              <div className="calendar-grid">
                {calendarDays.map((day) => {
                  const record = records[day.key];
                  const hasCf = Boolean(record?.codeforces);
                  const hasGh = Boolean(record?.github);
                  const isBoth = hasCf && hasGh;
                  const isFrozen = Boolean(gamification.frozenDates[day.key]);
                  const isDayToday = isSameDay(day.date, today);
                  const isFuture = day.key > todayKey;

                  let statusClass = "";
                  if (isFrozen) statusClass = "status-frozen";
                  else if (isBoth) statusClass = "status-both";
                  else if (hasCf) statusClass = "status-codeforces";
                  else if (hasGh) statusClass = "status-github";

                  return (
                    <button
                      key={day.key}
                      className={`day-tile ${statusClass} ${!day.inMonth ? "outside-month" : ""} ${isDayToday ? "is-today" : ""} ${isFuture ? "future-day" : ""}`}
                      disabled={isFuture}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <span className="tile-day-number">{day.date.getDate()}</span>
                      <div className="day-flower-icon">
                        {isFrozen ? (
                          <span className="day-freeze-tag" title="Streak Freeze Protected">
                            ❄️
                          </span>
                        ) : isBoth ? (
                          <span title="Double Win: Golden Blossom">✨🌸</span>
                        ) : hasCf ? (
                          <span title="Codeforces: Sunflower">🌻</span>
                        ) : hasGh ? (
                          <span title="GitHub: Tulip">🌷</span>
                        ) : (
                          <span className="opacity-0">·</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Legend & Summary */}
              <div className="calendar-bottom-row">
                <div className="calendar-legend">
                  <span className="legend-item">
                    <span>🌻</span> Codeforces
                  </span>
                  <span className="legend-item">
                    <span>🌷</span> GitHub
                  </span>
                  <span className="legend-item">
                    <span>✨🌸</span> Double Win
                  </span>
                  <span className="legend-item">
                    <span>❄️</span> Freeze Protected
                  </span>
                </div>
                <div className="text-xs text-muted-foreground font-semibold">
                  {monthProgress.completedDays} / {monthProgress.eligibleDays} days completed this
                  month ({monthProgress.percentage}%)
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: CODING GARDEN */}
        {activeTab === "garden" && (
          <div className="space-y-4">
            <section aria-labelledby="garden-hero-title" className="feature-panel garden-sanctuary">
              <div className="garden-artwork-wrapper">
                <img
                  alt="Cozy pixel cottage garden with sunflowers and cherry blossoms"
                  className="garden-pixel-art"
                  src={gardenArtImage}
                />
              </div>

              <div className="garden-status-card">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
                    <GardenIcon className="w-6 h-6" />
                  </span>
                  <div>
                    <h3 className="text-lg font-bold font-display" id="garden-hero-title">
                      {gardenStage.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{gardenStage.description}</p>
                  </div>
                </div>

                <div className="garden-stats-grid">
                  <div className="garden-stat-box">
                    <span className="stat-emoji">🌻</span>
                    <span className="stat-num font-display">{metrics.codeforcesDays}</span>
                    <span className="stat-label">Sunflowers (Codeforces)</span>
                  </div>
                  <div className="garden-stat-box">
                    <span className="stat-emoji">🌷</span>
                    <span className="stat-num font-display">{metrics.githubDays}</span>
                    <span className="stat-label">Tulips (GitHub)</span>
                  </div>
                  <div className="garden-stat-box">
                    <span className="stat-emoji">✨🌸</span>
                    <span className="stat-num font-display">{metrics.fullyCompleteDays}</span>
                    <span className="stat-label">Golden Blooms (Double Win)</span>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground italic">
                  "Every coding day plants a seed. Every double win blooms a golden flower. Your
                  garden preserves every flower forever."
                </p>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: PET & COZY ROOM */}
        {activeTab === "pet_room" && (
          <div className="pet-view-container">
            {/* Virtual Pet Section */}
            <div className="pet-companion-hero">
              <div className="pet-avatar-wrapper">
                {/* Dynamically swaps between sleeping cat (if no task today) and awake cat (if task completed) */}
                <img
                  alt={hasTodayActivity ? "Happy Awake Pixel Cat" : "Sleeping Curled Pixel Cat"}
                  src={hasTodayActivity ? awakeCatImage : sleepingCatImage}
                />
                {/* Equipped Accessory Badge */}
                {gamification.equippedAccessory !== "none" && (
                  <span className="pet-equipped-badge">
                    {PET_ACCESSORIES.find((a) => a.id === gamification.equippedAccessory)?.icon ??
                      "🎀"}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold font-display m-0">{catData.name}</h3>
                <div className="mt-1">
                  <span
                    className={`pet-state-tag ${hasTodayActivity ? "awake" : "asleep"}`}
                    title={
                      hasTodayActivity
                        ? "Awake and purring from today's completed coding!"
                        : "Asleep because today's tasks aren't logged yet."
                    }
                  >
                    {hasTodayActivity ? "☀️ Awake & Joyful" : "💤 Snoozing Peacefully"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-xl text-xs text-muted-foreground min-h-[48px] flex items-center justify-center">
                {catDialogue ||
                  (hasTodayActivity
                    ? "Mrrrp! You coded today! I'm so proud of your dedication! 🐾"
                    : "Curled up dreaming of clean code... Complete a task to wake me! 💤")}
              </div>

              <div className="flex gap-2 w-full">
                <Button
                  className="flex-1 gap-2 font-bold"
                  onClick={handlePetCat}
                  size="sm"
                  variant="outline"
                >
                  <Heart
                    className={`w-4 h-4 ${pettingAnimation ? "fill-red-500 text-red-500 scale-125" : ""}`}
                  />
                  Pet ({catData.pets})
                </Button>
                <Button
                  className="flex-1 gap-1.5 font-bold bg-rose-600 hover:bg-rose-700 text-white text-xs"
                  onClick={handleFeedCake}
                  size="sm"
                >
                  <span>🍰</span> Feed Cake ({gamification.cakeSlicesFed || 0})
                </Button>
              </div>

              {/* Accessory selector */}
              <div className="w-full text-left mt-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Unlockable Accessories
                </span>
                <div className="accessory-chips-grid mt-2">
                  {PET_ACCESSORIES.map((acc) => {
                    const isSelected = gamification.equippedAccessory === acc.id;
                    const isUnlocked =
                      acc.id === "none" ||
                      (acc.id === "ribbon" && metrics.longestOverall >= 3) ||
                      (acc.id === "glasses" && metrics.longestOverall >= 7) ||
                      (acc.id === "wizard_hat" && metrics.longestOverall >= 14) ||
                      (acc.id === "flower_pin" && metrics.fullyCompleteDays >= 3) ||
                      (acc.id === "crown" && metrics.longestOverall >= 30);

                    return (
                      <button
                        key={acc.id}
                        className={`accessory-chip ${isSelected ? "selected" : ""} ${!isUnlocked ? "locked" : ""}`}
                        disabled={!isUnlocked}
                        onClick={() => handleEquipAccessory(acc.id)}
                        title={isUnlocked ? acc.description : `Locked: ${acc.unlockRequirement}`}
                      >
                        <span className="text-xl">{acc.icon}</span>
                        <span className="font-semibold text-xs mt-1">{acc.name}</span>
                        {!isUnlocked && (
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            🔒 Locked
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cozy Room Section */}
            <div className="pet-companion-hero">
              <div className="w-full rounded-2xl overflow-hidden border-2 border-border shadow-md">
                <img
                  alt="Cozy isometric pixel bedroom with desk, fairy lights and bookshelf"
                  className="w-full h-auto object-cover"
                  src={roomArtImage}
                />
              </div>

              <div className="text-left w-full">
                <h3 className="text-base font-bold font-display m-0">Your Coding Room</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Decorated as you earn XP and unlock chest items.
                </p>

                <div className="space-y-1.5 mt-3">
                  {[
                    { name: "Oak Programmer Desk", level: 1, icon: "🪑" },
                    { name: "Cozy Quilt Bed", level: 1, icon: "🛏️" },
                    { name: "Twinkling Fairy Lights", level: 2, icon: "💡" },
                    { name: "Algorithm Bookshelf", level: 3, icon: "📚" },
                    { name: "Bonsai Tree & Plants", level: 3, icon: "🪴" },
                    { name: "Synthwave Neon Poster", level: 4, icon: "🖼️" },
                    { name: "Dual-Monitor Battle Station", level: 5, icon: "🖥️" },
                  ].map((item) => {
                    const unlocked =
                      levelInfo.level >= item.level ||
                      gamification.unlockedDecorations.includes(item.name);
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted text-xs"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <span>{item.icon}</span> {item.name}
                        </span>
                        <span
                          className={`font-bold ${unlocked ? "text-emerald-600" : "text-muted-foreground"}`}
                        >
                          {unlocked ? "✓ Unlocked" : `Level ${item.level}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REWARD SHOP */}
        {activeTab === "shop" && (
          <div className="space-y-4">
            <div className="reward-shop-header">
              <div>
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wider m-0">
                  REAL-LIFE MOTIVATION
                </p>
                <h2 className="text-xl font-bold font-display text-purple-900 m-0">
                  XP Reward Shop
                </h2>
                <p className="text-xs text-purple-800 m-0 mt-0.5">
                  Exchange your hard-earned coding XP for real-world treats you genuinely enjoy.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="redeemable-xp-display">
                  <span>{redeemableXP}</span>
                  <span className="text-xs uppercase text-purple-700 font-bold">Redeemable XP</span>
                </div>

                <Button
                  className="bg-purple-700 text-white hover:bg-purple-800 text-xs font-bold gap-1"
                  onClick={() => setCustomRewardModalOpen(true)}
                  size="sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Custom Treat
                </Button>
              </div>
            </div>

            {/* Rewards Cards Grid */}
            <div className="reward-items-grid">
              {allRewards.map((item) => {
                const canAfford = redeemableXP >= item.xpCost;
                return (
                  <div key={item.id} className="reward-card">
                    {item.image && (
                      <div className="reward-card-thumb">
                        <img alt={item.title} src={item.image} />
                      </div>
                    )}
                    <div className="reward-card-body">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{item.emoji}</span>
                        <h4 className="reward-card-title">{item.title}</h4>
                      </div>
                      <p className="reward-card-desc">{item.description}</p>
                      <div className="reward-card-footer">
                        <span className="reward-xp-pill">{item.xpCost} XP</span>
                        <Button
                          className="font-bold text-xs"
                          disabled={!canAfford}
                          onClick={() => handleRedeemReward(item)}
                          size="sm"
                          variant={canAfford ? "default" : "outline"}
                        >
                          {canAfford ? "Redeem" : "Need more XP"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Redemption History */}
            {gamification.redeemedLog.length > 0 && (
              <div className="p-4 bg-muted/60 border border-border rounded-xl mt-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Recently Redeemed Rewards
                </h4>
                <div className="space-y-1.5">
                  {gamification.redeemedLog.slice(0, 5).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-xs p-2 bg-card rounded-lg border border-border"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <span>{log.emoji}</span> {log.title}
                      </span>
                      <span className="text-muted-foreground font-semibold">
                        -{log.xpCost} XP · {log.redeemedAt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: FUTURE ME & PROBLEM LIBRARY */}
        {activeTab === "future_me" && (
          <div className="space-y-4">
            <div className="future-me-grid">
              {/* Left Column: Future Vision & Developer Map */}
              <div className="future-hero-card">
                <div>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider m-0">
                    WHO YOU ARE BECOMING
                  </p>
                  <h3 className="text-lg font-bold font-display m-0">Future Developer Vision</h3>
                  <p className="text-xs text-muted-foreground m-0 mt-0.5">
                    Every problem solved and commit pushed is building your mastery.
                  </p>
                </div>

                <div className="future-coder-art">
                  <img
                    alt="Pixel art developer girl working at dual monitor desk"
                    src={futureCoderImage}
                  />
                </div>

                {/* Note to future self */}
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-bold text-muted-foreground uppercase"
                    htmlFor="future-note-input"
                  >
                    Letter to Future Self
                  </label>
                  <textarea
                    id="future-note-input"
                    className="w-full text-xs p-2.5 rounded-xl border border-border bg-background focus:ring-1 focus:ring-primary"
                    onBlur={(e) => handleSaveFutureNote(e.target.value)}
                    defaultValue={gamification.futureNote}
                    placeholder="Write a warm note to yourself..."
                    rows={3}
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Saved automatically to your device's local storage.
                  </p>
                </div>
              </div>

              {/* Right Column: Codeforces Rating & Milestones */}
              <div className="future-hero-card">
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider m-0">
                    COMPETITIVE MILESTONES
                  </p>
                  <h3 className="text-lg font-bold font-display m-0">Codeforces Rating Journey</h3>
                  <p className="text-xs text-muted-foreground m-0 mt-0.5">
                    Target: 700 → 800 → 1000 → 1200 → 1400+
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <span className="text-xs font-bold text-amber-900">Current Rating</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <input
                          className="w-16 px-1.5 py-0.5 text-sm font-bold bg-white border border-amber-300 rounded"
                          defaultValue={gamification.cfRating}
                          onBlur={(e) => {
                            const val = parseInt(e.target.value) || 800;
                            const updated = { ...gamification, cfRating: val };
                            setGamification(updated);
                            writeGamificationState(updated);
                          }}
                          type="number"
                        />
                        <span className="text-xs font-bold text-amber-800">
                          {gamification.cfRating >= 1400
                            ? "Specialist ⭐"
                            : gamification.cfRating >= 1200
                              ? "Pupil 🌿"
                              : "Newbie 🪴"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-amber-800 font-semibold">Goal</span>
                    <p className="text-sm font-extrabold text-amber-950 m-0">
                      {gamification.cfRatingGoal}
                    </p>
                  </div>
                </div>

                {/* Progress toward 100 and 500 problems */}
                <div className="goals-list">
                  <div className="goal-item">
                    <div className="goal-header-row">
                      <span>100 Problems Milestone</span>
                      <span>{Math.min(100, metrics.codeforcesDays)} / 100</span>
                    </div>
                    <div className="level-xp-bar-bg !h-3">
                      <div
                        className="level-xp-bar-fill"
                        style={{
                          width: `${Math.min(100, (metrics.codeforcesDays / 100) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="goal-item">
                    <div className="goal-header-row">
                      <span>500 Problems Milestone</span>
                      <span>{Math.min(500, metrics.codeforcesDays)} / 500</span>
                    </div>
                    <div className="level-xp-bar-bg !h-3">
                      <div
                        className="level-xp-bar-fill"
                        style={{
                          width: `${Math.min(100, (metrics.codeforcesDays / 500) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="goal-item">
                    <div className="goal-header-row">
                      <span>GitHub Commit Consistency</span>
                      <span>{Math.min(100, metrics.githubDays)} / 100 Days</span>
                    </div>
                    <div className="level-xp-bar-bg !h-3">
                      <div
                        className="level-xp-bar-fill !bg-blue-500"
                        style={{
                          width: `${Math.min(100, (metrics.githubDays / 100) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Problem-Solving Library by Topic */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <img
                      alt="Stack of cozy books with tea"
                      className="w-8 h-8 object-contain"
                      src={libraryBooksImage}
                    />
                    <div>
                      <h4 className="text-xs font-bold font-display m-0">
                        Virtual Problem Library
                      </h4>
                      <p className="text-[10px] text-muted-foreground m-0">
                        Click + to add a book to your topic collection.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: "dp", label: "Dynamic Programming", icon: "🧠" },
                      { key: "graphs", label: "Graphs & Trees", icon: "🕸️" },
                      { key: "binarySearch", label: "Binary Search", icon: "🔍" },
                      { key: "greedy", label: "Greedy Algorithms", icon: "⚡" },
                      { key: "math", label: "Math & Primes", icon: "🔢" },
                      { key: "dataStructures", label: "Data Structures", icon: "📦" },
                    ].map((topic) => {
                      const count =
                        gamification.libraryTopics[
                          topic.key as keyof typeof gamification.libraryTopics
                        ] || 0;
                      return (
                        <div
                          key={topic.key}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted border border-border"
                        >
                          <span className="truncate flex items-center gap-1 font-medium">
                            <span>{topic.icon}</span> {topic.label}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-bold text-amber-700">{count}</span>
                            <button
                              aria-label={`Log one ${topic.label} problem`}
                              className="w-5 h-5 flex items-center justify-center bg-card rounded hover:bg-accent text-primary border border-border"
                              onClick={() =>
                                handleAddLibraryTopic(
                                  topic.key as keyof typeof gamification.libraryTopics,
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: HEATMAP, BADGES & CHESTS */}
        {activeTab === "badges" && (
          <div className="space-y-4">
            {/* Annual Consistency Heatmap */}
            <div className="heatmap-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="text-sm font-bold font-display m-0">
                      Annual Consistency Heatmap
                    </h3>
                    <p className="text-xs text-muted-foreground m-0">
                      Full year view of your daily coding blooms.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Less</span>
                  <div className="flex items-center gap-1">
                    <span className="heatmap-cell" />
                    <span className="heatmap-cell level-1" />
                    <span className="heatmap-cell level-2" />
                    <span className="heatmap-cell level-3" />
                  </div>
                  <span>More</span>
                </div>
              </div>

              {/* 52-Week Grid */}
              <div className="heatmap-grid-scroll">
                <div className="heatmap-columns-row">
                  {Array.from({ length: 52 }, (_, weekIdx) => {
                    const days = Array.from({ length: 7 }, (_, dayIdx) => {
                      const d = new Date(today);
                      d.setDate(d.getDate() - (51 - weekIdx) * 7 - (6 - dayIdx));
                      const key = formatDateKey(d);
                      const rec = records[key];
                      const isFrozen = Boolean(gamification.frozenDates[key]);
                      const hasCf = Boolean(rec?.codeforces);
                      const hasGh = Boolean(rec?.github);

                      let cellClass = "";
                      if (isFrozen) cellClass = "level-frozen";
                      else if (hasCf && hasGh) cellClass = "level-3";
                      else if (hasGh) cellClass = "level-2";
                      else if (hasCf) cellClass = "level-1";

                      return (
                        <div
                          key={key}
                          className={`heatmap-cell ${cellClass}`}
                          title={`${key}: ${hasCf ? "Codeforces " : ""}${hasGh ? "GitHub " : ""}${isFrozen ? "Freeze Protected" : ""}`}
                        />
                      );
                    });

                    return (
                      <div key={weekIdx} className="heatmap-week-column">
                        {days}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Collectible Badges Collection */}
            <section
              aria-labelledby="badges-view-title"
              className="feature-panel achievements-section"
            >
              <div className="numbers-heading">
                <div>
                  <p className="section-overline">HONOR ROLL</p>
                  <h3 className="section-title font-display" id="badges-view-title">
                    Milestone Badges Collection <span className="section-flower">✿</span>
                  </h3>
                </div>
                <span className="achievement-count">
                  {achievements.filter((a) => a.unlocked).length} / {achievements.length} unlocked
                </span>
              </div>

              <div className="badges-art-banner">
                <img
                  alt="Retro pixel medals, stars and trophies"
                  className="badges-pixel-art"
                  src={badgesArtImage}
                />
              </div>

              <div className="achievements-grid">
                {achievements.map((item) => {
                  const Icon = ACHIEVEMENT_ART[item.id] ?? Star;
                  return (
                    <div
                      key={item.id}
                      className={`achievement-card ${item.unlocked ? "unlocked" : "locked"}`}
                    >
                      <div className="achievement-icon-wrapper">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="achievement-info">
                        <h4 className="achievement-name">{item.name}</h4>
                        <p className="achievement-desc">{item.description}</p>
                      </div>
                      <span className="achievement-status">
                        {item.unlocked ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <LockKeyhole className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* Global Streak Metrics Bar */}
        <section aria-labelledby="numbers-title" className="numbers-section">
          <div className="numbers-heading">
            <div>
              <p className="section-overline">AT A GLANCE</p>
              <h3 className="section-title font-display" id="numbers-title">
                Garden Vital Stats <span className="section-flower">✿</span>
              </h3>
            </div>
            <p className="motivation-text font-display">"{MOTIVATIONS[motivationIndex]}"</p>
          </div>

          <div className="numbers-grid">
            <div className="number-item">
              <span className="number-icon">
                <Flame className="w-5 h-5 text-amber-500" />
              </span>
              <span className="number-value font-display">
                {metrics.currentOverall}
                <small>days</small>
              </span>
              <span className="number-caption">Current Streak</span>
            </div>

            <div className="number-item">
              <span className="number-icon">
                <Trophy className="w-5 h-5 text-yellow-500" />
              </span>
              <span className="number-value font-display">
                {metrics.longestOverall}
                <small>days</small>
              </span>
              <span className="number-caption">Best Streak</span>
            </div>

            <div className="number-item">
              <span className="number-icon">
                <Code2 className="w-5 h-5 text-amber-600" />
              </span>
              <span className="number-value font-display">{metrics.codeforcesDays}</span>
              <span className="number-caption">Codeforces Days</span>
            </div>

            <div className="number-item">
              <span className="number-icon">
                <Github className="w-5 h-5 text-blue-500" />
              </span>
              <span className="number-value font-display">{metrics.githubDays}</span>
              <span className="number-caption">GitHub Days</span>
            </div>

            <div className="number-item">
              <span className="number-icon">
                <Star className="w-5 h-5 text-amber-400" />
              </span>
              <span className="number-value font-display">{metrics.fullyCompleteDays}</span>
              <span className="number-caption">Special Blooms</span>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="garden-footer">
          <span>
            <span aria-hidden="true">✳</span> little by little, you grow{" "}
            <span aria-hidden="true">✳</span>
          </span>
          <span className="footer-local">
            <Database className="w-3.5 h-3.5" /> all habits, XP, and companion state safely
            preserved in local storage
          </span>
        </footer>

        {/* Day Detail / Check-in Modal */}
        <Dialog
          onOpenChange={(open) => !open && setSelectedDate(null)}
          open={Boolean(selectedDate)}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display text-base">
                {selectedDate
                  ? selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : ""}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {selectedIsFuture
                  ? "This date is in the future. Seeds can only be planted in the present."
                  : "Check off your daily accomplishments to grow your flowers."}
              </DialogDescription>
            </DialogHeader>

            {selectedKey && !selectedIsFuture && (
              <div className="space-y-3 py-2">
                <div
                  className={`quest-checkbox-row ${selectedRecord?.codeforces ? "done" : ""}`}
                  onClick={() =>
                    updateActivityForDate(selectedKey, "codeforces", !selectedRecord?.codeforces)
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={selectedRecord?.codeforces ?? false}
                      className="border-emerald-600"
                    />
                    <span className="text-sm font-semibold">Codeforces Problem (+10 XP)</span>
                  </div>
                  <span className="text-lg">🌻</span>
                </div>

                <div
                  className={`quest-checkbox-row ${selectedRecord?.github ? "done" : ""}`}
                  onClick={() =>
                    updateActivityForDate(selectedKey, "github", !selectedRecord?.github)
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={selectedRecord?.github ?? false}
                      className="border-emerald-600"
                    />
                    <span className="text-sm font-semibold">GitHub Commit (+10 XP)</span>
                  </div>
                  <span className="text-lg">🌷</span>
                </div>

                {gamification.freezesAvailable > 0 &&
                  !selectedRecord?.codeforces &&
                  !selectedRecord?.github &&
                  !gamification.frozenDates[selectedKey] && (
                    <Button
                      className="w-full gap-2 border-sky-300 text-sky-800 bg-sky-50 hover:bg-sky-100 text-xs font-bold"
                      onClick={() => activateStreakFreeze(selectedKey)}
                      variant="outline"
                    >
                      <span>❄️</span> Protect this day with Streak Freeze
                    </Button>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Mystery Chest Loot Modal */}
        <Dialog onOpenChange={setChestModalOpen} open={chestModalOpen}>
          <DialogContent className="sm:max-w-[400px] text-center">
            <DialogHeader>
              <DialogTitle className="font-display text-lg text-amber-900">
                ✨ Mystery Chest Opened! ✨
              </DialogTitle>
              <DialogDescription className="text-xs">
                Your streak diligence was rewarded!
              </DialogDescription>
            </DialogHeader>

            {lastLoot && (
              <div className="py-4 space-y-3">
                <div className="chest-dialog-art">
                  <img alt="Glittering treasure chest" src={chestOpenImage} />
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="text-2xl mb-1">{lastLoot.badge}</div>
                  <h4 className="font-bold text-sm text-amber-950 m-0">{lastLoot.title}</h4>
                  <p className="text-xs text-amber-800 mt-1 m-0">{lastLoot.description}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Streak Freeze Modal */}
        <Dialog onOpenChange={setFreezeModalOpen} open={freezeModalOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="font-display text-base text-sky-950 flex items-center gap-2">
                <span>❄️</span> Streak Freeze Shield
              </DialogTitle>
              <DialogDescription className="text-xs">
                Streak freezes protect a missed day so one busy or sick day doesn't break your
                streak.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3">
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-sky-900">Available Freezes</span>
                <span className="text-base font-extrabold text-sky-700">
                  {gamification.freezesAvailable}
                </span>
              </div>

              {gamification.freezesAvailable > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Protect yesterday or click any missed date on the calendar:
                  </p>
                  <Button
                    className="w-full bg-sky-600 text-white hover:bg-sky-700 font-bold text-xs"
                    onClick={() => {
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      activateStreakFreeze(formatDateKey(yesterday));
                    }}
                  >
                    Protect Yesterday ({formatDateKey(new Date(Date.now() - 86400000))})
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Earn more streak freezes by reaching a 7-day streak or opening mystery chests!
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Custom Reward Modal */}
        <Dialog onOpenChange={setCustomRewardModalOpen} open={customRewardModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle className="font-display text-base">Add Real-Life Treat</DialogTitle>
              <DialogDescription className="text-xs">
                Design a custom personal reward to redeem with your coding XP.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-3 py-2" onSubmit={handleAddCustomReward}>
              <div>
                <label className="text-xs font-bold text-muted-foreground" htmlFor={rewardTitleId}>
                  Reward Title
                </label>
                <input
                  id={rewardTitleId}
                  className="w-full text-xs p-2 rounded-lg border border-border mt-1"
                  onChange={(e) => setNewRewardTitle(e.target.value)}
                  placeholder="e.g. Watch movie, favorite boba, buy game..."
                  required
                  value={newRewardTitle}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-muted-foreground" htmlFor={rewardCostId}>
                    XP Cost
                  </label>
                  <input
                    id={rewardCostId}
                    className="w-full text-xs p-2 rounded-lg border border-border mt-1"
                    min="10"
                    onChange={(e) => setNewRewardCost(e.target.value)}
                    type="number"
                    value={newRewardCost}
                  />
                </div>
                <div>
                  <label
                    className="text-xs font-bold text-muted-foreground"
                    htmlFor={rewardEmojiId}
                  >
                    Emoji
                  </label>
                  <input
                    id={rewardEmojiId}
                    className="w-full text-xs p-2 rounded-lg border border-border mt-1"
                    onChange={(e) => setNewRewardEmoji(e.target.value)}
                    value={newRewardEmoji}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground" htmlFor={rewardDescId}>
                  Short Description
                </label>
                <input
                  id={rewardDescId}
                  className="w-full text-xs p-2 rounded-lg border border-border mt-1"
                  onChange={(e) => setNewRewardDesc(e.target.value)}
                  placeholder="A little motivation note..."
                  value={newRewardDesc}
                />
              </div>

              <Button className="w-full font-bold text-xs" type="submit">
                Add to Reward Shop
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Settings & Backup Modal */}
        <Dialog onOpenChange={setSettingsOpen} open={settingsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-display text-base">Garden Settings & Backup</DialogTitle>
              <DialogDescription className="text-xs">
                Your data is stored locally in your browser. Export backups or load sample data.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Button
                className="w-full gap-2 text-xs font-bold bg-amber-500 text-white hover:bg-amber-600"
                onClick={loadSampleData}
              >
                <Sparkles className="w-4 h-4" /> Load 14-Day Sample Garden Data
              </Button>

              <Button
                className="w-full gap-2 text-xs font-bold"
                onClick={downloadBackup}
                variant="outline"
              >
                <ArrowDownToLine className="w-4 h-4" /> Download JSON Backup
              </Button>

              <div>
                <label
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-border text-xs font-bold cursor-pointer hover:bg-muted"
                  htmlFor={fileInputId}
                >
                  <ArrowUpFromLine className="w-4 h-4" /> Restore JSON Backup
                </label>
                <input
                  id={fileInputId}
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => importBackup(e.target.files?.[0])}
                  ref={fileInputRef}
                  type="file"
                />
              </div>

              {importMessage && (
                <p className="text-xs text-center text-muted-foreground">{importMessage}</p>
              )}

              <div className="pt-2 border-t border-border">
                <Button
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                  onClick={() => setResetOpen(true)}
                  variant="outline"
                >
                  Clear All Local Storage
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Confirmation */}
        <AlertDialog onOpenChange={setResetOpen} open={resetOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-base">Reset Garden?</AlertDialogTitle>
              <AlertDialogDescription className="text-xs">
                This will clear all calendar records, XP, and companion data from this browser. This
                cannot be undone unless you have a JSON backup.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep My Garden</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={resetRecords}
              >
                Reset Soil
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </main>
  );
}

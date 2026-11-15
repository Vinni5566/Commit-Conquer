export type ActivityName = "codeforces" | "github";

export type DayRecord = {
  codeforces: boolean;
  github: boolean;
};

export type DayRecords = Record<string, DayRecord>;

export type CalendarDay = {
  key: string;
  date: Date;
  inMonth: boolean;
};

export const RECORDS_STORAGE_KEY = "commit-conquer-records-v1";

export const ACHIEVEMENT_DEFINITIONS = [
  { id: "first-commit", name: "First commit", description: "Make your first GitHub commit." },
  { id: "first-problem", name: "First problem", description: "Solve your first Codeforces problem." },
  { id: "streak-3", name: "Little & mighty", description: "Build a three-day overall streak." },
  { id: "streak-7", name: "One whole week", description: "Build a seven-day overall streak." },
  { id: "streak-14", name: "Fortnight flower", description: "Build a 14-day overall streak." },
  { id: "streak-30", name: "Monthly magic", description: "Build a 30-day overall streak." },
  { id: "perfect-week", name: "Perfect week", description: "Show up all seven days in a week." },
  { id: "double-trouble", name: "Double trouble", description: "Do both activities seven days in a row." },
] as const;

export type AchievementId = (typeof ACHIEVEMENT_DEFINITIONS)[number]["id"];

export type Achievement = (typeof ACHIEVEMENT_DEFINITIONS)[number] & {
  unlocked: boolean;
};

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

function shiftDateKey(key: string, amount: number): string | null {
  const date = dateFromKey(key);
  if (!date) return null;
  date.setDate(date.getDate() + amount);
  return formatDateKey(date);
}

function hasActivity(record: DayRecord | undefined): boolean {
  return Boolean(record?.codeforces || record?.github);
}

function isFullyComplete(record: DayRecord | undefined): boolean {
  return Boolean(record?.codeforces && record?.github);
}

export function createCalendarDays(year: number, monthIndex: number): CalendarDay[] {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const monthLength = new Date(year, monthIndex + 1, 0).getDate();
  const cellCount = Math.ceil((startOffset + monthLength) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(year, monthIndex, index - startOffset + 1);
    return {
      key: formatDateKey(date),
      date,
      inMonth: date.getMonth() === monthIndex,
    };
  });
}

export function toggleActivity(
  records: DayRecords,
  dateKey: string,
  activity: ActivityName,
  completed: boolean,
): DayRecords {
  if (!dateFromKey(dateKey)) return records;

  const updated: DayRecord = {
    codeforces: records[dateKey]?.codeforces ?? false,
    github: records[dateKey]?.github ?? false,
    [activity]: completed,
  };
  const next = { ...records };

  if (!updated.codeforces && !updated.github) {
    delete next[dateKey];
  } else {
    next[dateKey] = updated;
  }

  return next;
}

export function xpForDay(record: DayRecord | undefined): number {
  if (!record) return 0;
  return Number(record.codeforces) * 10 + Number(record.github) * 10 + Number(isFullyComplete(record)) * 5;
}

export function getTotalXP(records: DayRecords): number {
  return Object.values(records).reduce((total, record) => total + xpForDay(record), 0);
}

export function getLevelProgress(totalXP: number): {
  level: number;
  progress: number;
  pointsInLevel: number;
  pointsToNextLevel: number;
} {
  const safeXP = Math.max(0, totalXP);
  const level = Math.min(5, Math.floor(safeXP / 100) + 1);
  const pointsInLevel = level === 5 ? 100 : safeXP % 100;

  return {
    level,
    pointsInLevel,
    pointsToNextLevel: level === 5 ? 0 : 100 - pointsInLevel,
    progress: level === 5 ? 100 : pointsInLevel,
  };
}

function currentStreak(records: DayRecords, activity: (record: DayRecord | undefined) => boolean, todayKey: string) {
  let anchor = todayKey;
  if (!activity(records[anchor])) {
    const yesterday = shiftDateKey(anchor, -1);
    if (!yesterday || !activity(records[yesterday])) return 0;
    anchor = yesterday;
  }

  let streak = 0;
  while (activity(records[anchor])) {
    streak += 1;
    const previous = shiftDateKey(anchor, -1);
    if (!previous) break;
    anchor = previous;
  }

  return streak;
}

function longestStreak(records: DayRecords, activity: (record: DayRecord | undefined) => boolean): number {
  const days = Object.keys(records).filter((key) => activity(records[key])).sort();
  let longest = 0;
  let current = 0;
  let previous: string | null = null;

  for (const key of days) {
    current = previous && shiftDateKey(previous, 1) === key ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = key;
  }

  return longest;
}

export function getStreakMetrics(records: DayRecords, today: Date) {
  const todayKey = formatDateKey(today);
  const overall = hasActivity;
  const codeforces = (record: DayRecord | undefined) => Boolean(record?.codeforces);
  const github = (record: DayRecord | undefined) => Boolean(record?.github);
  const both = isFullyComplete;

  return {
    currentOverall: currentStreak(records, overall, todayKey),
    longestOverall: longestStreak(records, overall),
    currentCodeforces: currentStreak(records, codeforces, todayKey),
    longestCodeforces: longestStreak(records, codeforces),
    currentGithub: currentStreak(records, github, todayKey),
    longestGithub: longestStreak(records, github),
    longestBoth: longestStreak(records, both),
    codeforcesDays: Object.values(records).filter(codeforces).length,
    githubDays: Object.values(records).filter(github).length,
    fullyCompleteDays: Object.values(records).filter(both).length,
  };
}

export function getMonthlyCompletion(
  records: DayRecords,
  year: number,
  monthIndex: number,
  today: Date,
): { completedDays: number; eligibleDays: number; percentage: number } {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const todayKey = formatDateKey(today);
  const lastEligibleDay = year < today.getFullYear() || (year === today.getFullYear() && monthIndex < today.getMonth())
    ? daysInMonth
    : year === today.getFullYear() && monthIndex === today.getMonth()
      ? today.getDate()
      : 0;
  let completedDays = 0;

  for (let day = 1; day <= lastEligibleDay; day += 1) {
    const key = formatDateKey(new Date(year, monthIndex, day));
    if (key <= todayKey && hasActivity(records[key])) completedDays += 1;
  }

  return {
    completedDays,
    eligibleDays: lastEligibleDay,
    percentage: lastEligibleDay === 0 ? 0 : Math.round((completedDays / lastEligibleDay) * 100),
  };
}

function hasPerfectWeek(records: DayRecords): boolean {
  return Object.keys(records).some((key) => {
    if (!hasActivity(records[key])) return false;
    const date = dateFromKey(key);
    if (!date || date.getDay() !== 1) return false;
    return Array.from({ length: 7 }, (_, index) => shiftDateKey(key, index)).every(
      (weekKey) => weekKey !== null && hasActivity(records[weekKey]),
    );
  });
}

export function getAchievements(records: DayRecords): Achievement[] {
  const metrics = getStreakMetrics(records, new Date());
  const unlocked: Record<AchievementId, boolean> = {
    "first-commit": metrics.githubDays > 0,
    "first-problem": metrics.codeforcesDays > 0,
    "streak-3": metrics.longestOverall >= 3,
    "streak-7": metrics.longestOverall >= 7,
    "streak-14": metrics.longestOverall >= 14,
    "streak-30": metrics.longestOverall >= 30,
    "perfect-week": hasPerfectWeek(records),
    "double-trouble": metrics.longestBoth >= 7,
  };

  return ACHIEVEMENT_DEFINITIONS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked[achievement.id],
  }));
}

export function decodeRecords(value: unknown): DayRecords {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("That file doesn't contain a coding garden backup.");
  }

  const payload = value as Record<string, unknown>;
  const candidate = "records" in payload ? payload.records : payload;
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new Error("The backup's daily records aren't in the right format.");
  }

  const records: DayRecords = {};
  for (const [key, rawRecord] of Object.entries(candidate)) {
    if (!dateFromKey(key) || !rawRecord || typeof rawRecord !== "object" || Array.isArray(rawRecord)) {
      throw new Error("The backup contains an invalid calendar date.");
    }
    const item = rawRecord as Record<string, unknown>;
    if (typeof item.codeforces !== "boolean" || typeof item.github !== "boolean") {
      throw new Error("Each backup date needs both activity statuses.");
    }
    if (item.codeforces || item.github) {
      records[key] = { codeforces: item.codeforces, github: item.github };
    }
  }

  return records;
}
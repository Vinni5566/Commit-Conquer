import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpFromLine,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Flower2,
  Flame,
  Github,
  Heart,
  Leaf,
  LockKeyhole,
  PartyPopper,
  Settings2,
  Sparkles,
  Sprout,
  Star,
  TreeDeciduous,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import sproutImage from "@/assets/streak-sprout.png";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ACHIEVEMENT_DEFINITIONS,
  createCalendarDays,
  decodeRecords,
  formatDateKey,
  getAchievements,
  getLevelProgress,
  getMonthlyCompletion,
  getStreakMetrics,
  getTotalXP,
  RECORDS_STORAGE_KEY,
  toggleActivity,
  xpForDay,
  type ActivityName,
  type AchievementId,
  type DayRecord,
  type DayRecords,
} from "@/lib/streak-tracker";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Commit & Conquer — Your cozy coding garden" },
      {
        name: "description",
        content:
          "A tiny, cozy coding garden to track your Codeforces practice, GitHub commits, daily XP, and growing streaks.",
      },
      { property: "og:title", content: "Commit & Conquer — Your cozy coding garden" },
      {
        property: "og:description",
        content: "Keep your coding practice growing, one little daily win at a time.",
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
  { name: "Growing green", description: "Your small wins are taking root.", icon: Leaf },
  { name: "Bud & bloom", description: "Your garden is finding its colors.", icon: Flower2 },
  { name: "Cozy tree", description: "Look how much you have grown.", icon: TreeDeciduous },
  { name: "Magic garden", description: "A little wonder you grew yourself.", icon: Sparkles },
] as const;

const MOTIVATIONS = [
  "One problem a day keeps the rust away.",
  "Little progress is still progress.",
  "Your future self is cheering you on.",
  "Consistency grows one tiny win at a time.",
  "Show up, plant a seed, and let it grow.",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function readSavedRecords(): DayRecords {
  try {
    const serialized = window.localStorage.getItem(RECORDS_STORAGE_KEY);
    return serialized ? decodeRecords(JSON.parse(serialized)) : {};
  } catch {
    return {};
  }
}

function writeSavedRecords(records: DayRecords) {
  window.localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

function isSameDay(left: Date, right: Date): boolean {
  return formatDateKey(left) === formatDateKey(right);
}

function CodingGarden() {
  const [records, setRecords] = useState<DayRecords>({});
  const [today, setToday] = useState<Date>(() => new Date());
  const [hydrated, setHydrated] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const [motivationIndex, setMotivationIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const latestToday = new Date();
    setToday(latestToday);
    setVisibleMonth(new Date(latestToday.getFullYear(), latestToday.getMonth(), 1));
    setRecords(readSavedRecords());
    setHydrated(true);
  }, []);

  const totalXP = getTotalXP(records);
  const level = getLevelProgress(totalXP);
  const metrics = getStreakMetrics(records, today);
  const monthProgress = getMonthlyCompletion(
    records,
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    today,
  );
  const achievements = getAchievements(records);
  const gardenStage = GARDEN_STAGES[level.level - 1] ?? GARDEN_STAGES[0];
  const GardenIcon = gardenStage.icon;
  const selectedKey = selectedDate ? formatDateKey(selectedDate) : "";
  const selectedRecord = selectedKey ? records[selectedKey] : undefined;
  const selectedIsFuture = selectedDate ? formatDateKey(selectedDate) > formatDateKey(today) : false;
  const monthLabel = visibleMonth.toLocaleDateString("en", { month: "long", year: "numeric" });
  const calendarDays = createCalendarDays(visibleMonth.getFullYear(), visibleMonth.getMonth());
  const history = Object.entries(records)
    .filter(([, record]) => record.codeforces || record.github)
    .sort(([left], [right]) => right.localeCompare(left))
    .slice(0, 5);
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;

  function saveUpdatedRecords(updated: DayRecords, wasAchievementUnlocked?: Record<AchievementId, boolean>) {
    if (hydrated) {
      try {
        writeSavedRecords(updated);
        setFeedback("Saved just now");
      } catch {
        setFeedback("Your browser couldn’t save this update.");
      }
    }

    setRecords(updated);

    if (wasAchievementUnlocked) {
      const unlockedNow = getAchievements(updated).find(
        (achievement) => achievement.unlocked && !wasAchievementUnlocked[achievement.id],
      );
      if (unlockedNow) setFeedback(`Badge unlocked: ${unlockedNow.name}!`);
    }
  }

  function updateSelectedActivity(activity: ActivityName, checked: boolean) {
    if (!selectedKey || selectedIsFuture) return;

    const oldRecord = records[selectedKey];
    const nextRecord: DayRecord = {
      codeforces: oldRecord?.codeforces ?? false,
      github: oldRecord?.github ?? false,
      [activity]: checked,
    };
    const wasEmpty = !oldRecord?.codeforces && !oldRecord?.github;
    const wasAchievementUnlocked = Object.fromEntries(
      getAchievements(records).map((achievement) => [achievement.id, achievement.unlocked]),
    ) as Record<AchievementId, boolean>;
    const updated = toggleActivity(records, selectedKey, activity, checked);

    saveUpdatedRecords(updated, wasAchievementUnlocked);

    if (checked && wasEmpty) {
      setFeedback("Day planted. Your garden is growing!");
    }

    if (xpForDay(nextRecord) >= 25 && xpForDay(oldRecord) < 25) {
      setFeedback("Both boxes checked! That’s a 5 XP bonus day!");
    }
  }

  function downloadBackup() {
    const backup = {
      format: "commit-and-conquer",
      version: 1,
      exportedAt: new Date().toISOString(),
      records,
    };
    const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const downloadUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `commit-and-conquer-${formatDateKey(today)}.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setImportMessage("A copy of your coding garden is on its way.");
  }

  async function importBackup(file: File | undefined) {
    if (!file) return;
    try {
      const backup = decodeRecords(JSON.parse(await file.text()));
      if (hydrated) writeSavedRecords(backup);
      setRecords(backup);
      setImportMessage(`Backup restored: ${Object.keys(backup).length} days in your garden.`);
      setFeedback("Your coding garden has been restored.");
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "We couldn't read that backup. Your records are unchanged.",
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetRecords() {
    try {
      writeSavedRecords({});
      setRecords({});
      setFeedback("A fresh patch of soil. Your garden can start growing again!");
      setResetOpen(false);
      setSettingsOpen(false);
    } catch {
      setImportMessage("Your browser couldn't clear the saved garden.");
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

  return (
    <main className="garden-page min-h-screen bg-background text-foreground">
      <div aria-hidden="true" className="pixel-speckles">
        <span className="pixel-speckle pixel-speckle-one" />
        <span className="pixel-speckle pixel-speckle-two" />
        <span className="pixel-speckle pixel-speckle-three" />
      </div>

      <div className="garden-shell">
        <header className="garden-header">
          <a aria-label="Commit & Conquer home" className="brand-lockup" href="/">
            <span aria-hidden="true" className="brand-sprite">
              <Sprout />
            </span>
            <span>
              <span className="brand-name font-display">commit <span>&</span> conquer</span>
              <span className="brand-caption">little wins, lovely gardens</span>
            </span>
          </a>

          <div className="header-right">
            <span className="date-note">
              <CalendarDays aria-hidden="true" />
              <span>{today.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}</span>
            </span>
            <Button
              aria-label="Open garden settings and backup options"
              className="icon-button soft-icon-button"
              onClick={() => {
                setSettingsOpen(true);
                setImportMessage("");
              }}
              size="icon"
              title="Garden settings"
              variant="ghost"
            >
              <Settings2 aria-hidden="true" />
            </Button>
          </div>
        </header>

        <section aria-labelledby="welcome-title" className="welcome-row">
          <div>
            <p className="eyebrow"><span className="eyebrow-sparkle">✳</span> YOUR VERY OWN LITTLE CODING GARDEN</p>
            <h1 className="welcome-title font-display" id="welcome-title">Hey, coder! <span>Ready to grow?</span></h1>
            <p className="welcome-caption">A tiny problem, a little commit — look at you go.</p>
          </div>
          <div className="garden-streak-chip" aria-label={`Current overall streak: ${metrics.currentOverall} days`}>
            <span aria-hidden="true" className="streak-chip-sprite">✳</span>
            <span><strong>{metrics.currentOverall}</strong> day{metrics.currentOverall === 1 ? "" : "s"} growing</span>
          </div>
        </section>

        <section aria-label={`Level ${level.level}, ${totalXP} total experience points`} className="level-strip">
          <div className="level-character">
            <span className="level-portrait pixel-panel">
              <img alt="Your tiny flowering pixel-art plant companion" height={816} src={sproutImage} width={816} />
              <Sparkles aria-hidden="true" className="portrait-sparkle" />
            </span>
          </div>
          <div className="level-copy">
            <div className="level-title-row">
              <p className="level-kicker">YOUR GARDEN JOURNEY</p>
              <span className="level-number">LVL {level.level}</span>
            </div>
            <h2 className="level-name font-display">{gardenStage.name}</h2>
            <p className="level-description">{gardenStage.description}</p>
            <div
              aria-label={level.level === 5 ? "Maximum garden level reached" : `${level.pointsInLevel} of 100 XP toward the next level`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={level.progress}
              className="xp-progress"
              role="progressbar"
            >
              <span className="xp-progress-fill" style={{ width: `${level.progress}%` }} />
            </div>
            <p className="level-progress-note">
              <span><Sparkles aria-hidden="true" /> {totalXP} total XP</span>
              {level.level === 5 ? <span>You found the magic garden!</span> : <span>{level.pointsToNextLevel} XP to level {level.level + 1}</span>}
            </p>
          </div>
          <div className="level-bonus">
            <span className="bonus-icon"><Star aria-hidden="true" /></span>
            <span className="bonus-copy"><strong>+25 XP</strong><span>for a perfect day</span></span>
          </div>
        </section>

        <div className="main-grid">
          <section aria-labelledby="calendar-title" className="calendar-panel">
            <div className="calendar-heading">
              <div>
                <p className="section-overline">YOUR CONSISTENCY PATCH</p>
                <h2 className="section-title font-display" id="calendar-title">Coding calendar <span className="section-flower">✳</span></h2>
              </div>
              <div aria-label={`${monthLabel} month navigation`} className="month-navigation">
                <Button aria-label="Previous month" className="icon-button month-arrow" onClick={() => navigateMonth(-1)} size="icon" variant="ghost">
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <span className="month-label">{monthLabel}</span>
                <Button
                  aria-label="Next month"
                  className="icon-button month-arrow"
                  disabled={visibleMonth.getFullYear() === today.getFullYear() && visibleMonth.getMonth() === today.getMonth()}
                  onClick={() => navigateMonth(1)}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
                <Button aria-label="Return to today's month" className="today-button" disabled={isSameDay(visibleMonth, new Date(today.getFullYear(), today.getMonth(), 1))} onClick={returnToToday} variant="outline">
                  Today
                </Button>
              </div>
            </div>

            <div aria-label={`${monthLabel} coding activity calendar`} className="calendar-grid" role="grid">
              {WEEKDAYS.map((day) => (
                <div aria-label={day} className="weekday-label" key={day} role="columnheader">{day}</div>
              ))}
              {calendarDays.map(({ date, inMonth, key }) => {
                const record = records[key];
                const future = key > formatDateKey(today);
                const isToday = isSameDay(date, today);
                const status = !record?.codeforces && !record?.github
                  ? "status-empty"
                  : record.codeforces && record.github
                    ? "status-both"
                    : record.codeforces
                      ? "status-codeforces"
                      : "status-github";

                return (
                  <div className="calendar-cell" key={key} role="gridcell">
                    <Button
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${date.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${record?.codeforces ? ", Codeforces done" : ""}${record?.github ? ", GitHub done" : ""}${future ? ", future date" : ""}`}
                      className={`day-tile ${status}${inMonth ? "" : "outside-month"}${future ? " future-day" : ""}${isToday ? " is-today" : ""}`}
                      disabled={!inMonth || future}
                      onClick={() => setSelectedDate(date)}
                      variant="ghost"
                    >
                      <span className="tile-day-number">{date.getDate()}</span>
                      <span aria-hidden="true" className="tile-activity-dots">
                        {record?.codeforces && <span className="activity-pip pip-codeforces" />}
                        {record?.github && <span className="activity-pip pip-github" />}
                        {!record?.codeforces && !record?.github && inMonth && !future && <span className="tile-empty-dot" />}
                      </span>
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="calendar-bottom-row">
              <div aria-label="Calendar activity colors" className="calendar-legend">
                <span className="legend-item"><i className="legend-swatch swatch-both" />Both</span>
                <span className="legend-item"><i className="legend-swatch swatch-codeforces" />Codeforces</span>
                <span className="legend-item"><i className="legend-swatch swatch-github" />GitHub</span>
                <span className="legend-item"><i className="legend-swatch swatch-empty" />Not yet</span>
              </div>
              <p aria-live="polite" className={`save-feedback${feedback.startsWith("Badge unlocked") || feedback.startsWith("Both boxes") ? " feedback-celebration" : ""}`}>
                {feedback && <><Sparkles aria-hidden="true" />{feedback}</>}
              </p>
            </div>
          </section>

          <aside aria-label="Garden progress" className="side-column">
            <section aria-labelledby="streaks-title" className="streak-panel">
              <div className="compact-heading">
                <div><p className="section-overline">TINY WINS ADD UP</p><h2 className="side-title font-display" id="streaks-title">Your streaks</h2></div>
                <span aria-hidden="true" className="heading-icon"><Flame /></span>
              </div>
              <div className="streak-row primary-streak">
                <span className="streak-art streak-art-overall"><Flame aria-hidden="true" /></span>
                <span className="streak-row-copy"><strong>Overall</strong><span>any coding day</span></span>
                <span className="streak-row-value">{metrics.currentOverall}<small>days</small></span>
              </div>
              <div className="streak-row">
                <span className="streak-art streak-art-cf"><Code2 aria-hidden="true" /></span>
                <span className="streak-row-copy"><strong>Codeforces</strong><span>{metrics.longestCodeforces} day best</span></span>
                <span className="streak-row-value">{metrics.currentCodeforces}<small>days</small></span>
              </div>
              <div className="streak-row">
                <span className="streak-art streak-art-gh"><Github aria-hidden="true" /></span>
                <span className="streak-row-copy"><strong>GitHub</strong><span>{metrics.longestGithub} day best</span></span>
                <span className="streak-row-value">{metrics.currentGithub}<small>days</small></span>
              </div>
              <div className="longest-note">
                <Trophy aria-hidden="true" /><span>Longest garden streak</span><strong>{metrics.longestOverall} days</strong>
              </div>
            </section>

            <section aria-labelledby="buddy-title" className="buddy-panel">
              <div className="buddy-heading">
                <span className="buddy-level">YOUR COMPANION · LVL {level.level}</span>
                <GardenIcon aria-hidden="true" className="buddy-level-icon" />
              </div>
              <img alt="A sweet pixel-art flower sprout for your coding garden" className={`buddy-image buddy-image-level-${level.level}`} height={816} loading="lazy" src={sproutImage} width={816} />
              <h2 className="buddy-title font-display" id="buddy-title">{gardenStage.name}!</h2>
              <p className="buddy-description">Every bit of practice helps your little buddy bloom.</p>
              <div className="monthly-progress">
                <div className="monthly-progress-label"><span>{monthLabel.split(" ")[0]} patch</span><strong>{monthProgress.percentage}%</strong></div>
                <div
                  aria-label={`${monthProgress.percentage}% of eligible days completed this month`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={monthProgress.percentage}
                  className="monthly-progress-track"
                  role="progressbar"
                ><span className="monthly-progress-fill" style={{ width: `${monthProgress.percentage}%` }} /></div>
                <span className="monthly-progress-caption">{monthProgress.completedDays} of {monthProgress.eligibleDays} days with a little win</span>
              </div>
            </section>

            <section aria-labelledby="motivation-title" className="motivation-panel">
              <span aria-hidden="true" className="motivation-sticker"><Heart /></span>
              <div className="motivation-copy"><p className="section-overline" id="motivation-title">A LITTLE REMINDER</p><p className="motivation-quote">“{MOTIVATIONS[motivationIndex]}”</p></div>
              <Button aria-label="Show another little reminder" className="icon-button quote-next" onClick={() => setMotivationIndex((current) => (current + 1) % MOTIVATIONS.length)} size="icon" title="Another reminder" variant="ghost"><ArrowRight aria-hidden="true" /></Button>
            </section>
          </aside>
        </div>

        <section aria-labelledby="stats-title" className="numbers-section">
          <div className="numbers-heading">
            <div><p className="section-overline">THE LITTLE THINGS YOU’VE DONE</p><h2 className="section-title font-display" id="stats-title">Look at that progress <span className="section-flower">✿</span></h2></div>
            <span className="month-completion-chip"><Sparkles aria-hidden="true" /> {monthProgress.percentage}% this month</span>
          </div>
          <div className="number-grid">
            <div className="number-item number-mint"><span className="number-icon"><Flame aria-hidden="true" /></span><span className="number-value">{metrics.currentOverall}<small>days</small></span><span className="number-caption">Current streak</span></div>
            <div className="number-item number-butter"><span className="number-icon"><Trophy aria-hidden="true" /></span><span className="number-value">{metrics.longestOverall}<small>days</small></span><span className="number-caption">Best streak</span></div>
            <div className="number-item number-lavender"><span className="number-icon"><Code2 aria-hidden="true" /></span><span className="number-value">{metrics.codeforcesDays}</span><span className="number-caption">Codeforces days</span></div>
            <div className="number-item number-pink"><span className="number-icon"><Github aria-hidden="true" /></span><span className="number-value">{metrics.githubDays}</span><span className="number-caption">GitHub days</span></div>
            <div className="number-item number-sky"><span className="number-icon"><Star aria-hidden="true" /></span><span className="number-value">{metrics.fullyCompleteDays}</span><span className="number-caption">Double-win days</span></div>
          </div>
          <div className="streak-detail-line"><LockKeyhole aria-hidden="true" /><span>Your streak grows with one or both activities — missing a day never takes away your XP.</span></div>
        </section>

        <section aria-labelledby="achievements-title" className="achievements-section">
          <div className="numbers-heading achievements-heading">
            <div><p className="section-overline">BADGES FROM YOUR LITTLE ADVENTURES</p><h2 className="section-title font-display" id="achievements-title">Tiny triumphs <span className="section-flower">✿</span></h2></div>
            <span className="achievement-count">{unlockedCount} of {ACHIEVEMENT_DEFINITIONS.length} found</span>
          </div>
          <div className="achievement-grid">
            {achievements.map((achievement, index) => {
              const Icon = ACHIEVEMENT_ART[achievement.id];
              return (
                <div aria-label={`${achievement.name}: ${achievement.unlocked ? "unlocked" : "locked"}. ${achievement.description}`} className={`achievement-item${achievement.unlocked ? " is-unlocked" : " is-locked"}`} key={achievement.id}>
                  <span className={`achievement-icon achievement-icon-${index}`}><Icon aria-hidden="true" />{achievement.unlocked && <Check aria-hidden="true" className="achievement-check" />}</span>
                  <span className="achievement-copy"><strong>{achievement.name}</strong><span>{achievement.description}</span></span>
                  {achievement.unlocked ? <Star aria-label="Unlocked" className="achievement-star" /> : <LockKeyhole aria-label="Locked" className="achievement-lock" />}
                </div>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="history-title" className="history-section">
          <div className="numbers-heading history-heading">
            <div><p className="section-overline">A LITTLE LOOK BACK</p><h2 className="section-title font-display" id="history-title">Recent days <span className="section-flower">✿</span></h2></div>
            <span className="achievement-count">{metrics.fullyCompleteDays} double-win days total</span>
          </div>
          {history.length ? (
            <ul className="history-list">
              {history.map(([dateKey, record]) => {
                const date = new Date(`${dateKey}T12:00:00`);
                return (
                  <li className="history-row" key={dateKey}>
                    <span aria-hidden="true" className="history-flower"><Flower2 /></span>
                    <time className="history-date" dateTime={dateKey}>{date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}</time>
                    <span className="history-activity">{record.codeforces && <span className="history-tag tag-cf"><Code2 aria-hidden="true" /> Codeforces</span>}{record.github && <span className="history-tag tag-gh"><Github aria-hidden="true" /> GitHub</span>}</span>
                    <span className="history-xp"><Sparkles aria-hidden="true" /> +{xpForDay(record)} XP</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="history-empty"><span aria-hidden="true" className="empty-sprout"><Sprout /></span><p>Your first little win will bloom here.</p><span>Pick any day on the calendar to get started.</span></div>
          )}
        </section>

        <footer className="garden-footer">
          <span><span aria-hidden="true">✳</span> little by little, you grow <span aria-hidden="true">✳</span></span>
          <span className="footer-local"><LockKeyhole aria-hidden="true" /> your garden stays on this device</span>
        </footer>
      </div>

      <Dialog onOpenChange={(open) => !open && setSelectedDate(null)} open={selectedDate !== null}>
        <DialogContent className="activity-dialog">
          <DialogHeader className="activity-dialog-heading">
            <span className="dialog-day-flower"><Flower2 aria-hidden="true" /></span>
            <p className="section-overline">ONE DAY AT A TIME</p>
            <DialogTitle className="activity-dialog-title font-display">
              {selectedDate?.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
            </DialogTitle>
            <DialogDescription className="activity-dialog-description">
              {selectedIsFuture ? "This day is still on its way. Your next little win will be right here." : "What did you do in your coding garden today?"}
            </DialogDescription>
          </DialogHeader>
          <div className="activity-options">
            <label className={`activity-option activity-option-cf${selectedRecord?.codeforces ? " activity-is-done" : ""}`}>
              <span className="activity-brand-icon icon-codeforces"><Code2 aria-hidden="true" /></span>
              <span className="activity-option-copy"><strong>Solved a Codeforces problem</strong><span>+10 XP for showing up</span></span>
              <Checkbox aria-label="Solved a Codeforces problem" checked={selectedRecord?.codeforces ?? false} disabled={selectedIsFuture} onCheckedChange={(checked) => updateSelectedActivity("codeforces", checked === true)} />
            </label>
            <label className={`activity-option activity-option-gh${selectedRecord?.github ? " activity-is-done" : ""}`}>
              <span className="activity-brand-icon icon-github"><Github aria-hidden="true" /></span>
              <span className="activity-option-copy"><strong>Made a meaningful GitHub commit</strong><span>+10 XP for growing the garden</span></span>
              <Checkbox aria-label="Made a meaningful GitHub commit" checked={selectedRecord?.github ?? false} disabled={selectedIsFuture} onCheckedChange={(checked) => updateSelectedActivity("github", checked === true)} />
            </label>
          </div>
          <div className="activity-dialog-footer">
            <span className="day-xp"><Sparkles aria-hidden="true" /> {xpForDay(selectedRecord)} XP earned <span>· +5 for both</span></span>
            <span className="today-status">{selectedIsFuture ? "up ahead" : selectedRecord?.codeforces && selectedRecord.github ? "Both little wins — wonderful!" : selectedRecord?.codeforces || selectedRecord?.github ? "A little win, nicely done!" : "Ready when you are"}</span>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setSettingsOpen} open={settingsOpen}>
        <DialogContent className="settings-dialog">
          <DialogHeader className="settings-heading">
            <span aria-hidden="true" className="settings-sprout"><Sprout /></span>
            <DialogTitle className="activity-dialog-title font-display">Your garden settings</DialogTitle>
            <DialogDescription className="activity-dialog-description">Keep a copy of your progress, or start a fresh patch whenever you like.</DialogDescription>
          </DialogHeader>
          <div className="settings-actions">
            <Button className="backup-button" onClick={downloadBackup} variant="outline"><ArrowDownToLine aria-hidden="true" /> Save a backup</Button>
            <Button className="backup-button" onClick={() => fileInputRef.current?.click()} variant="outline"><ArrowUpFromLine aria-hidden="true" /> Restore a backup</Button>
            <input
              accept="application/json,.json"
              aria-label="Choose a coding garden backup file"
              className="visually-hidden"
              onChange={(event) => void importBackup(event.target.files?.[0])}
              ref={fileInputRef}
              type="file"
            />
            {importMessage && <p aria-live="polite" className="import-feedback">{importMessage}</p>}
            <div className="settings-divider" />
            <Button className="reset-button" onClick={() => setResetOpen(true)} variant="outline"><ArrowLeft aria-hidden="true" /> Start a fresh garden</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog onOpenChange={setResetOpen} open={resetOpen}>
        <AlertDialogContent className="reset-dialog">
          <AlertDialogHeader>
            <span className="reset-flower"><PartyPopper aria-hidden="true" /></span>
            <AlertDialogTitle className="reset-title font-display">Ready for a fresh patch?</AlertDialogTitle>
            <AlertDialogDescription className="activity-dialog-description">
              This clears your garden and every saved day from this device. Save a backup first if you'd like to keep a little keepsake.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="reset-actions">
            <AlertDialogCancel>Keep my garden</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); resetRecords(); }}>Clear all my days</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
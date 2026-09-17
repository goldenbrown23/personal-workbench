// @ts-check
// Regression guard for a data-integrity bug: a habit with NO Goal Plan configured (full,
// small, and small2 all empty/whitespace) was being logged as a "Smaller Version"
// ("counted") completion when the user tapped Home's plain "✓ Done" button, purely because
// several fallback code paths hardcoded status:"counted" for the "nothing configured" case.
// See homePrimaryTier(), versionRowsForHabit(), and noVersionsConfiguredRow() in
// src/js/habits.js. "Smaller Version" must only ever represent a version the user actually
// chose from a real, non-empty menu of options — never an inferred default.
import { test, expect, boot, seedState, readState } from './helpers.js';

const bareHabit = {
  id: 'h-bare', name: 'Night Face Wash', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: '', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
// Whitespace-only values must trim to "nothing configured" exactly like empty strings —
// the bug's root fields (homePrimaryTier's bareMin/smaller/full) already trim, but the
// fallback status they defaulted to was wrong regardless of how "empty" was spelled.
const whitespaceOnlyHabit = {
  id: 'h-whitespace', name: 'Evening Reset', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: '   ', small: '  \t ', small2: ' ',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const fullOnlyHabit = {
  id: 'h-full-only', name: 'Wash Face', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Wash face for 60 seconds', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const fullSmallHabit = {
  id: 'h-full-small', name: 'Wash Face Plus', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Wash face for 60 seconds', small: 'Use a cleansing wipe', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
// Two habits so one day's logs can independently hold small (h-a) and small2 (h-b) completions.
const threeVersionHabitA = {
  id: 'h-three-a', name: 'Morning Face Wash', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Wash face normally', small: 'Use a cleansing wipe', small2: 'Rinse face',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const threeVersionHabitB = {
  id: 'h-three-b', name: 'Evening Face Wash', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Wash face normally', small: 'Use a cleansing wipe', small2: 'Rinse face',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const weeklyBareHabit = {
  id: 'h-weekly-bare', name: 'Call a Friend', icon: 'phone', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: '', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 2, paused: false,
};

const EVENING = '2026-09-16T20:00:00';
const TODAY = '2026-09-16';

test.describe('completion status integrity: "Smaller Version" requires a real, chosen version', () => {
  test('1. habit with NO Goal Plan values: Home Done stores a normal completion, not Smaller Version', async ({page}) => {
    await boot(page, {state: seedState({habits: [bareHabit]}), at: EVENING});
    await expect(page.locator('#homeNow')).toContainText('Night Face Wash');
    // No configured versions at all means no version choice to offer.
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']).toBe('done');
  });

  test('2. empty-string smaller version does not count as configured (full-only habit logs as full/normal)', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullOnlyHabit]}), at: EVENING});
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-only']).toBe('done');
  });

  test('3. whitespace-only Goal Plan values do not count as configured', async ({page}) => {
    await boot(page, {state: seedState({habits: [whitespaceOnlyHabit]}), at: EVENING});
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-whitespace']).toBe('done');
  });

  test('4. Full + Smaller configured: choosing Full via the version picker logs a normal/full completion', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullSmallHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText('Wash face for 60 seconds');
    await options.first().click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']).toBe('done');
  });

  test('5. Full + Smaller configured: explicitly choosing Smaller logs a Smaller Version completion', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullSmallHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options.nth(1)).toContainText('Use a cleansing wipe');
    await options.nth(1).click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']).toBe('counted');
  });

  test('6. reload after completion: a no-Goal-Plan habit keeps its normal-completion status', async ({page}) => {
    await boot(page, {state: seedState({habits: [bareHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']).toBe('done');
    await page.reload();
    expect((await readState(page)).logs[TODAY]['h-bare']).toBe('done');
  });

  test('7. Habit Log history shows "Full version," never "Smaller version," for a no-Goal-Plan habit logged as Done', async ({page}) => {
    await boot(page, {
      view: 'habitLogView', at: EVENING,
      state: seedState({habits: [bareHabit], logs: {[TODAY]: {'h-bare': 'done'}}}),
    });
    const row = page.locator('#habitLogHistory .history-item', {hasText: 'Night Face Wash'});
    await expect(row).toContainText('Full version');
    await expect(row).not.toContainText('Smaller version');
  });

  test('8. Trends: a normal Done from a no-Goal-Plan habit is not counted in the "Smaller" (Smaller Version) tally', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: EVENING,
      state: seedState({habits: [bareHabit], logs: {[TODAY]: {'h-bare': 'done'}}}),
    });
    const overview = page.locator('#practiceOverview');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Smaller'})).toContainText('0 (0%)');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Regular'})).toContainText('1 (100%)');
  });

  test('10. Trends: both "small" and "small2" versions aggregate into the same "Smaller" row', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: EVENING,
      state: seedState({
        habits: [threeVersionHabitA, threeVersionHabitB],
        logs: {[TODAY]: {'h-three-a': 'counted', 'h-three-b': 'counted'}},
      }),
    });
    const overview = page.locator('#practiceOverview');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Smaller'})).toContainText('2 (100%)');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Regular'})).toContainText('0 (0%)');
  });

  test('9. weekly progress still counts a no-Goal-Plan habit\'s Done correctly', async ({page}) => {
    await boot(page, {state: seedState({habits: [weeklyBareHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-weekly-bare']).toBe('done');
    const progress = await page.evaluate(() => weeklyProgress(state.habits[0]));
    expect(progress).toBe(1);
  });
});

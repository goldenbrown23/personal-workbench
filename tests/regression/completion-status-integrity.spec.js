// @ts-check
// Regression guard for a data-integrity bug: a habit with NO Goal Plan configured (full,
// small, and small2 all empty/whitespace) was being logged as a "Smaller Version"
// ("counted") completion when the user tapped Home's plain "✓ Done" button, purely because
// several fallback code paths hardcoded status:"counted" for the "nothing configured" case.
// See homePrimaryTier(), versionRowsForHabit(), and noVersionsConfiguredRow() in
// src/js/habits.js. "Smaller Version" must only ever represent a version the user actually
// chose from a real, non-empty menu of options — never an inferred default.
import {
  test, expect, boot, seedState, readState,
  bareHabit, whitespaceOnlyHabit, fullOnlyHabit, fullSmallHabit, weeklyBareHabit,
} from './helpers.js';

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

const EVENING = '2026-09-16T20:00:00';
const TODAY = '2026-09-16';

test.describe('completion status integrity: "Smaller Version" requires a real, chosen version', () => {
  test('1. habit with NO Goal Plan values: Home Done stores a normal completion, not Smaller Version', async ({page}) => {
    await boot(page, {state: seedState({habits: [bareHabit]}), at: EVENING});
    await expect(page.locator('#homeNow')).toContainText('Night Face Wash');
    // No configured versions at all means no version choice to offer.
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    // A no-Goal-Plan habit's single check-in unambiguously IS the full version (see
    // noVersionsConfiguredRow/homePrimaryTier), so the exact tier is known and preserved.
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']?.status).toBe('done');
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']?.tier).toBe('full');
  });

  test('2. empty-string smaller version does not count as configured (full-only habit logs as full/normal)', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullOnlyHabit]}), at: EVENING});
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-only']?.status).toBe('done');
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-only']?.tier).toBe('full');
  });

  test('3. whitespace-only Goal Plan values do not count as configured', async ({page}) => {
    await boot(page, {state: seedState({habits: [whitespaceOnlyHabit]}), at: EVENING});
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-whitespace']?.status).toBe('done');
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-whitespace']?.tier).toBe('full');
  });

  test('4. Full + Smaller configured: choosing Full via the version picker logs a normal/full completion', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullSmallHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText('Wash face for 60 seconds');
    await options.first().click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']?.status).toBe('done');
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']?.tier).toBe('full');
  });

  test('5. Full + Smaller configured: explicitly choosing Smaller logs a Smaller Version completion', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullSmallHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options.nth(1)).toContainText('Use a cleansing wipe');
    await options.nth(1).click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']?.status).toBe('counted');
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']?.tier).toBe('smaller');
  });

  test('6. reload after completion: a no-Goal-Plan habit keeps its normal-completion status', async ({page}) => {
    await boot(page, {state: seedState({habits: [bareHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']?.status).toBe('done');
    await page.reload();
    expect((await readState(page)).logs[TODAY]['h-bare'].status).toBe('done');
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
    await expect(overview.locator('.overview-legend-row', {hasText: 'Smaller'})).toContainText('0');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Regular'})).toContainText('1');
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
    await expect(overview.locator('.overview-legend-row', {hasText: 'Smaller'})).toContainText('2');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Regular'})).toContainText('0');
  });

  test('9. weekly progress still counts a no-Goal-Plan habit\'s Done correctly', async ({page}) => {
    await boot(page, {state: seedState({habits: [weeklyBareHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-weekly-bare']?.status).toBe('done');
    const progress = await page.evaluate(() => weeklyProgress(state.habits[0]));
    expect(progress).toBe(1);
  });
});

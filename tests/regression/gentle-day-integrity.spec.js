// @ts-check
// Regression guard for a data-integrity bug: Gentle Day being ON was independent
// evidence for status:"counted" — Home's doNextHTML (src/js/home.js) hardcoded
// primaryStatus="counted" whenever gentle was true, and the Habits-tab quick tap
// (quickCompleteHabit, src/js/habits.js) logged gentleDayOn()?"counted":"done" — both
// regardless of whether the habit had any real configured smaller version (full/small/
// small2). That falsified history: a bare or full-only habit tapped "✓ Done" on a Gentle
// Day was recorded as a "Smaller Version" completion that was never offered or chosen.
//
// The fix keeps Gentle Day's presentation/encouragement role but requires "counted" to
// always come from the habit's actual Goal Plan (homePrimaryTier()/hasSmallerVersion() —
// the same single source of truth completion-status-integrity.spec.js already guards for
// the non-Gentle-Day path) — never from Gentle Day alone. See CLAUDE.md's completion
// invariant: done = normal completion, counted = a real chosen smaller version.
import {
  test, expect, boot, seedState, readState,
  bareHabit, whitespaceOnlyHabit, fullOnlyHabit, fullSmallHabit, weeklyBareHabit,
} from './helpers.js';

const threeVersionHabit = {
  id: 'h-three', name: 'Morning Face Wash', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Wash face normally', small: 'Use a cleansing wipe', small2: 'Rinse face',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};

const EVENING = '2026-09-16T20:00:00';
const TODAY = '2026-09-16';

const turnGentleDayOn = page => page.evaluate(() => setGentleDay(true));

test.describe('Gentle Day must not falsify completion type', () => {
  test('1&2. bare habit + Gentle Day + Done logs "done", never fabricates "counted"', async ({page}) => {
    await boot(page, {state: seedState({habits: [bareHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await expect(page.locator('#homeNow')).toContainText('Night Face Wash');
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']).toBe('done');
  });

  test('3. full-only habit + Gentle Day + Done logs "done"', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullOnlyHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-only']).toBe('done');
  });

  test('4. Full + Small + Gentle Day: choosing Full via the version picker still logs "done"', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullSmallHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options.first()).toContainText('Wash face for 60 seconds');
    await options.first().click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']).toBe('done');
  });

  test('5. Full + Small + Gentle Day: explicitly choosing Small logs "counted"', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullSmallHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options.nth(1)).toContainText('Use a cleansing wipe');
    await options.nth(1).click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']).toBe('counted');
  });

  test('6. Full + Small + Small2 + Gentle Day: explicitly choosing Small2 logs "counted"', async ({page}) => {
    await boot(page, {state: seedState({habits: [threeVersionHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options.nth(2)).toContainText('Rinse face');
    await options.nth(2).click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-three']).toBe('counted');
  });

  test('7. whitespace-only smaller fields + Gentle Day are treated as no smaller version: Done logs "done"', async ({page}) => {
    await boot(page, {state: seedState({habits: [whitespaceOnlyHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-whitespace']).toBe('done');
  });

  test('8. reload after a Gentle Day completion keeps the correct stored status', async ({page}) => {
    await boot(page, {state: seedState({habits: [bareHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']).toBe('done');
    await page.reload();
    expect((await readState(page)).logs[TODAY]['h-bare']).toBe('done');
  });

  test('9. Habit Log history shows "Full version" for a bare habit completed on a Gentle Day', async ({page}) => {
    await boot(page, {
      view: 'habitLogView', at: EVENING,
      state: seedState({habits: [bareHabit], logs: {[TODAY]: {'h-bare': 'done'}}}),
    });
    await turnGentleDayOn(page);
    await page.reload();
    const row = page.locator('#habitLogHistory .history-item', {hasText: 'Night Face Wash'});
    await expect(row).toContainText('Full version');
    await expect(row).not.toContainText('Smaller version');
  });

  test('10. Trends: a bare habit\'s Gentle Day completion tallies as "Regular," never "Smaller"', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: EVENING,
      state: seedState({habits: [bareHabit], logs: {[TODAY]: {'h-bare': 'done'}}}),
    });
    await turnGentleDayOn(page);
    await page.reload();
    const overview = page.locator('#practiceOverview');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Smaller'})).toContainText('0');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Regular'})).toContainText('1');
  });

  test('11. Trends: an actual smaller-version selection during Gentle Day tallies as "Smaller"', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: EVENING,
      state: seedState({habits: [fullSmallHabit], logs: {[TODAY]: {'h-full-small': 'counted'}}}),
    });
    await turnGentleDayOn(page);
    await page.reload();
    const overview = page.locator('#practiceOverview');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Smaller'})).toContainText('1');
    await expect(overview.locator('.overview-legend-row', {hasText: 'Regular'})).toContainText('0');
  });

  test('12. weekly progress for a Gentle Day completion is unchanged', async ({page}) => {
    await boot(page, {state: seedState({habits: [weeklyBareHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-weekly-bare']).toBe('done');
    const progress = await page.evaluate(() => weeklyProgress(state.habits[0]));
    expect(progress).toBe(1);
  });

  test('14. Gentle Day OFF: bare habit Done still logs "done" (baseline unchanged)', async ({page}) => {
    await boot(page, {state: seedState({habits: [bareHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.primary').click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']).toBe('done');
  });

  test('14. Gentle Day OFF: explicitly choosing Small via the picker still logs "counted" (baseline unchanged)', async ({page}) => {
    await boot(page, {state: seedState({habits: [fullSmallHabit]}), at: EVENING});
    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await options.nth(1).click();
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']).toBe('counted');
  });

  test('15. Habits tab quick tap on a bare habit during Gentle Day does not silently become "counted"', async ({page}) => {
    await boot(page, {view: 'todayView', state: seedState({habits: [bareHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await page.evaluate(() => quickCompleteHabit('h-bare'));
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']).toBe('done');
  });

  test('15. Habits tab quick tap on a habit with a real smaller version during Gentle Day logs "counted"', async ({page}) => {
    await boot(page, {view: 'todayView', state: seedState({habits: [fullSmallHabit]}), at: EVENING});
    await turnGentleDayOn(page);
    await page.reload();
    await page.evaluate(() => quickCompleteHabit('h-full-small'));
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-full-small']).toBe('counted');
  });

  test('15. Habits tab quick tap on a bare habit with Gentle Day OFF still logs "done" (baseline unchanged)', async ({page}) => {
    await boot(page, {view: 'todayView', state: seedState({habits: [bareHabit]}), at: EVENING});
    await page.evaluate(() => quickCompleteHabit('h-bare'));
    await expect.poll(async () => (await readState(page)).logs[TODAY]?.['h-bare']).toBe('done');
  });
});

// @ts-check
// Regression guard for the schedule-aware Return calculation and its dependents: historical
// edits, backfill, deletion, weekly-target recomputation, and cross-view agreement between
// Habit Log / Weekly Detail / Trends. Returns are always DERIVED from the live timeline via
// isReturnDay()/missedOpportunityAnchor() in habits.js — never trusted from a persisted flag —
// so every mutation here must change the rendered Return state immediately, with no reload.
import { test, expect, boot, seedState, readState } from './helpers.js';

const dailyHabit = {
  id: 'h-daily', name: 'Morning walk', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Full walk', small: 'Short walk', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const weeklyHabit = {
  id: 'h-weekly', name: 'Call a friend', icon: 'phone', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: '', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 3, paused: false,
};

// 2026-09-16 is a Wednesday: the current Monday-start week (09-14..09-20) and the last-7-day
// Trends window (09-10..09-16) both contain the full Mon/Tue/Wed test timeline below, so the
// same seeded data is visible to Weekly Detail (practiceView), Trends (weekView) and Habit Log
// (habitLogView) at once — required for the cross-view consistency checks.
const AT = '2026-09-16T10:00:00';
const MON = '2026-09-14', TUE = '2026-09-15', WED = '2026-09-16';

test.describe('historical Full <-> Smaller edit', () => {
  test('editing a past entry via Habit Log updates in place, no duplicate, createdAt preserved', async ({page}) => {
    await boot(page, {view: 'habitLogView', at: AT, state: seedState({
      habits: [dailyHabit],
      logs: {[MON]: {'h-daily': {status: 'done', isReturn: false, timeBlock: 'morning', note: '', createdAt: '2026-09-14T08:00:00.000Z', updatedAt: '2026-09-14T08:00:00.000Z'}}},
    })});

    // Monday isn't "today" (Wednesday, per AT), so its day-group starts collapsed.
    await page.locator('#habitLogHistory .history-day[data-day-key="2026-09-14"] summary').click();
    await page.locator('#habitLogHistory .history-item-edit', {hasText: 'Full version'}).click();
    await expect(page.locator('#statusModal')).toHaveClass(/show/);
    await page.locator('#statusVersionList .version-option', {hasText: 'Short walk'}).click();
    await page.locator('#statusLogBtn').click();
    // Editing to a different version triggers the replace-confirmation sheet.
    await expect(page.locator('#replaceLogModal')).toHaveClass(/show/);
    await page.locator('#replaceLogBtn').click();

    const after = await readState(page);
    const entry = after.logs[MON]['h-daily'];
    expect(entry.status).toBe('counted');
    expect(entry.createdAt).toBe('2026-09-14T08:00:00.000Z');
    expect(entry.updatedAt).not.toBe('2026-09-14T08:00:00.000Z');
    expect(Object.keys(after.logs[MON])).toHaveLength(1); // no duplicate entry created

    await page.reload();
    const reloaded = await readState(page);
    expect(reloaded.logs[MON]['h-daily'].status).toBe('counted');
  });
});

test.describe('backfill removes a Return', () => {
  test('a Return on day 3 disappears once the blank gap day is backfilled', async ({page}) => {
    await boot(page, {view: 'habitLogView', at: AT, state: seedState({
      habits: [dailyHabit],
      logs: {[MON]: {'h-daily': 'done'}, [WED]: {'h-daily': 'done'}},
    })});

    await expect(page.locator('#habitLogHistory .history-item', {hasText: 'Return'})).toHaveCount(1);
    await page.locator('.tabbar .tab[data-view="weekView"]').click();
    await expect(page.locator('#returnsMetric')).toHaveText('1');
    await page.evaluate(() => switchView('practiceView'));
    await expect(page.locator('#metricReturns')).toHaveText('1');

    await page.evaluate(TUE => saveHabitLogEntry('h-daily', {date: TUE, timeBlock: 'morning', status: 'counted', note: ''}), TUE);

    await page.evaluate(() => switchView('habitLogView'));
    await expect(page.locator('#habitLogHistory .history-item', {hasText: 'Return'})).toHaveCount(0);
    await page.evaluate(() => switchView('weekView'));
    await expect(page.locator('#returnsMetric')).toHaveText('0');
    await page.evaluate(() => switchView('practiceView'));
    await expect(page.locator('#metricReturns')).toHaveText('0');

    // The backfilled gap day must be a real logged entry, never a synthetic persisted miss.
    const state = await readState(page);
    expect(state.logs[TUE]['h-daily'].status).toBe('counted');
  });
});

test.describe('deletion creates a Return', () => {
  test('deleting the middle of three consecutive Full days turns day 3 into a Return', async ({page}) => {
    await boot(page, {view: 'habitLogView', at: AT, state: seedState({
      habits: [dailyHabit],
      logs: {[MON]: {'h-daily': 'done'}, [TUE]: {'h-daily': 'done'}, [WED]: {'h-daily': 'done'}},
    })});

    await expect(page.locator('#habitLogHistory .history-item', {hasText: 'Return'})).toHaveCount(0);

    await page.evaluate(() => clearHabitLogEntry('h-daily', '2026-09-15'));

    await expect(page.locator('#habitLogHistory .history-item', {hasText: 'Return'})).toHaveCount(1);
    await page.evaluate(() => switchView('weekView'));
    await expect(page.locator('#returnsMetric')).toHaveText('1');
    await page.evaluate(() => switchView('practiceView'));
    await expect(page.locator('#metricReturns')).toHaveText('1');

    await page.reload();
    await expect(page.locator('#metricReturns')).toHaveText('1');
    const state = await readState(page);
    expect(state.logs[TUE]?.['h-daily']).toBeUndefined();
  });
});

test.describe('weekly-target recomputation', () => {
  test('progress and attention-state recompute live as entries are added and removed', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [weeklyHabit],
      logs: {[MON]: {'h-weekly': 'done'}, [TUE]: {'h-weekly': 'counted'}},
    })});

    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(2);
    expect(await page.evaluate(() => habitStillNeedsAttentionToday(state.habits[0]))).toBe(true);

    await page.evaluate(WED => saveHabitLogEntry('h-weekly', {date: WED, timeBlock: 'morning', status: 'done', note: ''}), WED);
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(3);
    expect(await page.evaluate(() => habitStillNeedsAttentionToday(state.habits[0]))).toBe(false);

    await page.evaluate(() => clearHabitLogEntry('h-weekly', '2026-09-16'));
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(2);
    expect(await page.evaluate(() => habitStillNeedsAttentionToday(state.habits[0]))).toBe(true);

    // A blank day within the same week must never itself register as a Return for a
    // weekly-rhythm habit — only a fully-elapsed week that missed its target can.
    const blankDayReturn = await page.evaluate(() => isReturnDay(getLogEntry('h-weekly', '2026-09-17'), state.habits[0], '2026-09-17'));
    expect(blankDayReturn).toBe(false);
  });
});

test.describe('cross-view consistency', () => {
  test('Habit Log, Weekly Detail and Trends agree on the same seeded timeline', async ({page}) => {
    const habit = {...dailyHabit};
    await boot(page, {view: 'habitLogView', at: AT, state: seedState({
      habits: [habit],
      logs: {
        [MON]: {'h-daily': {status: 'done', isReturn: false, timeBlock: 'morning', note: 'felt great', createdAt: 't', updatedAt: 't'}},
        [WED]: {'h-daily': {status: 'counted', isReturn: false, timeBlock: 'morning', note: '', createdAt: 't', updatedAt: 't'}},
      },
    })});

    // Habit Log: Wednesday is a Return (Tuesday was a blank expected daily opportunity),
    // and Monday's note is visible once its day-group (collapsed by default, since
    // Wednesday is "today") is opened.
    await page.locator('#habitLogHistory .history-day[data-day-key="2026-09-14"] summary').click();
    await expect(page.locator('#habitLogHistory .history-item', {hasText: 'felt great'})).toBeVisible();
    await expect(page.locator('#habitLogHistory .history-item', {hasText: 'Smaller version · Return'})).toHaveCount(1);

    await page.evaluate(() => switchView('weekView'));
    await expect(page.locator('#returnsMetric')).toHaveText('1');
    await expect(page.locator('#engagementMetric')).toHaveText('2');

    await page.evaluate(() => switchView('practiceView'));
    await expect(page.locator('#metricReturns')).toHaveText('1');
    await expect(page.locator('#metricEngagementNote')).toContainText('2 /');
  });
});

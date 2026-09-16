// @ts-check
// Regression guard for the Habits tab's Today / Logged today split: a habit that already
// has a log entry for today must never render in both sections at once. The bug was that
// renderHabitsChecklist()'s Today filter duplicated only the weekly-target half of
// habitStillNeedsAttentionToday() (habits.js) instead of calling it, so a daily/specific-day
// habit stayed in Today after being logged. Fixed by having that filter call
// habitStillNeedsAttentionToday() directly, the same helper Home's Do This Next/Later uses,
// so there's exactly one definition of "still needs attention today".
import { test, expect, boot, seedState, readState } from './helpers.js';

const dailyHabit = {
  id: 'h-daily', name: 'Morning Face Wash', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Full wash', small: 'Quick rinse', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const weeklyHabit = {
  id: 'h-weekly', name: 'Weekly Shower', icon: 'droplet', color: 'blue', goalType: 'practice',
  timeBlock: 'morning', full: 'Shower', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 2, paused: false,
};

// 2026-09-16 is a Wednesday within the 09-14..09-20 Monday-start week.
const AT = '2026-09-16T09:00:00';
const TODAY = '2026-09-16';

const todayCount = page => page.locator('#habitsCountLabel').innerText();
const todayRow = (page, name) => page.locator('#habitsChecklist .checklist-row', {hasText: name});
const loggedRow = (page, name) => page.locator('#habitsDoneList .later-row', {hasText: name});

async function logStatus(page, habitId, status) {
  await page.evaluate(id => openStatusModal(id), habitId);
  if (status === 'miss') {
    await page.locator('#statusNotTodayBtn').click();
    return;
  }
  const label = habitId === 'h-daily' ? (status === 'done' ? 'Full wash' : 'Quick rinse') : null;
  if (label) {
    await page.locator('#statusVersionList .version-option', {hasText: label}).click();
  } else {
    // weekly habit only has one configured version ("Shower")
    await page.locator('#statusVersionList .version-option').first().click();
  }
  await page.locator('#statusLogBtn').click();
}

test.describe('Habits tab: Today and Logged today are mutually exclusive', () => {
  test('Done removes a daily habit from Today and moves it to Logged today', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [dailyHabit]})});
    await expect(todayRow(page, 'Morning Face Wash')).toHaveCount(1);
    await expect(loggedRow(page, 'Morning Face Wash')).toHaveCount(0);

    await logStatus(page, 'h-daily', 'done');

    await expect(todayRow(page, 'Morning Face Wash')).toHaveCount(0);
    await expect(loggedRow(page, 'Morning Face Wash')).toHaveCount(1);
    expect((await readState(page)).logs[TODAY]['h-daily'].status).toBe('done');
  });

  test('Not today removes a daily habit from Today and moves it to Logged today', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [dailyHabit]})});
    await expect(todayCount(page)).resolves.toBe('Today · 1');

    await logStatus(page, 'h-daily', 'miss');

    await expect(todayRow(page, 'Morning Face Wash')).toHaveCount(0);
    await expect(loggedRow(page, 'Morning Face Wash')).toContainText('Not today');
    await expect(todayCount(page)).resolves.toBe('Today · 0');
  });

  test('Smaller Version removes a daily habit from Today and moves it to Logged today', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [dailyHabit]})});

    await logStatus(page, 'h-daily', 'counted');

    await expect(todayRow(page, 'Morning Face Wash')).toHaveCount(0);
    await expect(loggedRow(page, 'Morning Face Wash')).toHaveCount(1);
    expect((await readState(page)).logs[TODAY]['h-daily'].status).toBe('counted');
  });

  test('a weekly habit drops out of Today for the rest of the day after its first completion, even though its weekly target is unmet', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [dailyHabit, weeklyHabit]})});
    await expect(todayCount(page)).resolves.toBe('Today · 2');
    await expect(todayRow(page, 'Weekly Shower')).toHaveCount(1);

    await logStatus(page, 'h-weekly', 'done');

    // weekly progress is 1 of 2 — not complete — but it must still leave Today for today
    expect(await page.evaluate(() => weeklyProgress(state.habits.find(h => h.id === 'h-weekly')))).toBe(1);
    await expect(todayRow(page, 'Weekly Shower')).toHaveCount(0);
    await expect(loggedRow(page, 'Weekly Shower')).toHaveCount(1);
    await expect(todayCount(page)).resolves.toBe('Today · 1');
    await expect(todayRow(page, 'Morning Face Wash')).toHaveCount(1);
  });

  test('a weekly habit under target becomes eligible for Today again on a later day this week', async ({page}) => {
    const MON = '2026-09-14';
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [weeklyHabit],
      logs: {[MON]: {'h-weekly': 'done'}},
    })});
    // Logged Monday (progress 1/2), viewing Wednesday: still under target, so eligible today.
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(1);
    await expect(todayRow(page, 'Weekly Shower')).toHaveCount(1);
    await expect(loggedRow(page, 'Weekly Shower')).toHaveCount(0);
  });

  test('a weekly habit that already reached its target this week does not reappear in Today', async ({page}) => {
    const MON = '2026-09-14', TUE = '2026-09-15';
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [weeklyHabit],
      logs: {[MON]: {'h-weekly': 'done'}, [TUE]: {'h-weekly': 'done'}},
    })});
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(2);
    await expect(todayRow(page, 'Weekly Shower')).toHaveCount(0);
    await expect(loggedRow(page, 'Weekly Shower')).toHaveCount(0);
  });

  test('deleting today\'s log restores Today eligibility', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [dailyHabit],
      logs: {[TODAY]: {'h-daily': 'miss'}},
    })});
    await expect(todayRow(page, 'Morning Face Wash')).toHaveCount(0);
    await expect(loggedRow(page, 'Morning Face Wash')).toHaveCount(1);

    await page.evaluate(() => clearHabitLogEntry('h-daily', '2026-09-16'));

    await expect(todayRow(page, 'Morning Face Wash')).toHaveCount(1);
    await expect(loggedRow(page, 'Morning Face Wash')).toHaveCount(0);
    await expect(todayCount(page)).resolves.toBe('Today · 1');
  });

  test('editing today\'s log to remove it (toggle off) restores Today eligibility', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [dailyHabit]})});
    await logStatus(page, 'h-daily', 'done');
    await expect(loggedRow(page, 'Morning Face Wash')).toHaveCount(1);

    // Re-applying the same status toggles the entry off (see setStatus in habits.js).
    await page.evaluate(() => setStatus('h-daily', 'done'));

    await expect(todayRow(page, 'Morning Face Wash')).toHaveCount(1);
    await expect(loggedRow(page, 'Morning Face Wash')).toHaveCount(0);
    expect((await readState(page)).logs[TODAY]?.['h-daily']).toBeUndefined();
  });

  test('Home Do This Next also skips a habit already logged today (shared eligibility helper)', async ({page}) => {
    await boot(page, {view: 'homeView', at: AT, state: seedState({
      habits: [dailyHabit],
      logs: {[TODAY]: {'h-daily': 'done'}},
    })});
    expect(await page.evaluate(() => habitStillNeedsAttentionToday(state.habits[0]))).toBe(false);
    await expect(page.locator('#homeNow')).not.toContainText('Morning Face Wash');
  });
});

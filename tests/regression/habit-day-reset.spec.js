// @ts-check
// Regression guard for the "habit day" concept: a personal day boundary, distinct from the
// calendar day, that defaults to 4am and is user-adjustable in Settings. See
// getHabitDayResetHour/activeHabitDate/activeHabitDateKey/habitTodayKey in state.js — the
// one shared place every "what's today for habit purposes" caller goes through. Backfill/
// history (explicit date pickers) intentionally still use dateKey()/real calendar dates —
// this suite never touches those.
import { test, expect, boot, seedState, readState } from './helpers.js';

const eveningHabit = {
  id: 'h-evening', name: 'Evening walk', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Evening walk', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const weeklyHabit = {
  id: 'h-weekly', name: 'Weekly Shower', icon: 'droplet', color: 'blue', goalType: 'practice',
  timeBlock: 'evening', full: 'Shower', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 2, paused: false,
};

// 2026-09-15 is a Monday, 2026-09-16 a Tuesday, both inside the same Mon-start week.
const MON = '2026-09-15';
const TUE = '2026-09-16';
const TUE_2AM = '2026-09-16T02:00:00';
const TUE_4AM = '2026-09-16T04:00:00';
const TUE_530AM = '2026-09-16T05:30:00';

const doNextCard = page => page.locator('#homeNow');

test.describe('Habit day reset: default', () => {
  test('1. existing users with no saved preference default to 4:00 AM', async ({page}) => {
    await boot(page, {view: 'settingsView', at: TUE_2AM, state: seedState({habits: []})});
    expect(await page.evaluate(() => getHabitDayResetHour())).toBe(4);
    await expect(page.locator('#habitDayReset')).toHaveValue('4');
  });
});

test.describe('Habit day reset: active date resolution', () => {
  test('2. Tuesday 2am with reset 4am resolves to Monday', async ({page}) => {
    await boot(page, {at: TUE_2AM, state: seedState({habits: []})});
    expect(await page.evaluate(() => activeHabitDateKey())).toBe(MON);
  });

  test('3. Tuesday 4am with reset 4am resolves to Tuesday', async ({page}) => {
    await boot(page, {at: TUE_4AM, state: seedState({habits: []})});
    expect(await page.evaluate(() => activeHabitDateKey())).toBe(TUE);
  });

  test('4. Tuesday 2am with reset Midnight resolves to Tuesday', async ({page}) => {
    await boot(page, {at: TUE_2AM, state: seedState({habits: [], settings: {...seedState().settings, habitDayResetHour: 0}})});
    expect(await page.evaluate(() => activeHabitDateKey())).toBe(TUE);
  });

  test('5. Tuesday 5:30am with reset 6am resolves to Monday', async ({page}) => {
    await boot(page, {at: TUE_530AM, state: seedState({habits: [], settings: {...seedState().settings, habitDayResetHour: 6}})});
    expect(await page.evaluate(() => activeHabitDateKey())).toBe(MON);
  });
});

test.describe('Habit day reset: Do This Next during the carryover window', () => {
  test('6. an evening habit already logged Monday night does not resurface as Tuesday\'s during carryover', async ({page}) => {
    await boot(page, {view: 'homeView', at: TUE_2AM, state: seedState({
      habits: [eveningHabit],
      logs: {[MON]: {'h-evening': 'done'}},
    })});
    await expect(doNextCard(page)).not.toContainText('Evening walk');
  });

  test('a genuinely unlogged evening habit still surfaces during carryover', async ({page}) => {
    await boot(page, {view: 'homeView', at: TUE_2AM, state: seedState({habits: [eveningHabit]})});
    await expect(doNextCard(page)).toContainText('Evening walk');
  });
});

test.describe('Habit day reset: completion logging during the carryover window', () => {
  test('7. completing a habit at Tuesday 2am (reset 4am) logs it under Monday', async ({page}) => {
    await boot(page, {view: 'homeView', at: TUE_2AM, state: seedState({habits: [eveningHabit]})});
    await page.evaluate(() => setStatus('h-evening', 'done'));
    const state = await readState(page);
    expect(state.logs[MON]?.['h-evening']).toBe('done');
    expect(state.logs[TUE]?.['h-evening']).toBeUndefined();
  });
});

test.describe('Habit day reset: weekly progress during the carryover window', () => {
  test('8. a weekly habit completed Tuesday 2am (reset 4am) counts toward Monday\'s week, not split across a phantom Tuesday', async ({page}) => {
    await boot(page, {view: 'homeView', at: TUE_2AM, state: seedState({habits: [weeklyHabit]})});
    await page.evaluate(() => setStatus('h-weekly', 'done'));
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(1);
    const loggedState = await readState(page);
    expect(loggedState.logs[MON]?.['h-weekly']).toBe('done');
  });
});

test.describe('Habit day reset: backfill/history stays calendar-based', () => {
  test('9. explicitly picking a calendar date to log/edit still targets that exact date, not the active habit date', async ({page}) => {
    await boot(page, {view: 'homeView', at: TUE_2AM, state: seedState({habits: [eveningHabit]})});
    // openStatusModal with an explicit presetDate is the backfill/history path (e.g. editing
    // an existing history row) — it must never be silently redirected to habitTodayKey().
    await page.evaluate(() => openStatusModal('h-evening', '2026-09-10'));
    expect(await page.evaluate(() => loggingSelectedDate)).toBe('2026-09-10');
  });
});

test.describe('Habit day reset: settings UI', () => {
  test('changing the setting persists and is reflected in getHabitDayResetHour()', async ({page}) => {
    await boot(page, {view: 'settingsView', at: TUE_2AM, state: seedState({habits: []})});
    await page.locator('#habitDayReset').selectOption('6');
    expect(await page.evaluate(() => state.settings.habitDayResetHour)).toBe(6);
    expect(await page.evaluate(() => getHabitDayResetHour())).toBe(6);
    const saved = await readState(page);
    expect(saved.settings.habitDayResetHour).toBe(6);
  });
});

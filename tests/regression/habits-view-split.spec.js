// @ts-check
// Regression guard for the Habits tab's Today / This Week split: weekly-target habits
// ("shower 2x/week") used to be mixed into the same category+daypart filtered checklist
// as daily habits, which meant finding one required guessing the right category AND the
// right Morning/Afternoon/Evening tab. This splits the tab into two modes — Today (daily/
// specific-day, still filtered by category+daypart) and This Week (weekly-target habits,
// filtered by category only, sorted "Still open" before "Done enough") — via the segmented
// control (#habitsViewSwitch) above the daypart switch. See isWeeklyTargetHabit/
// habitsForTodayView/habitsForWeekView/renderHabitsWeekList/weeklyRowHTML in habits.js.
import { test, expect, boot, seedState, readState } from './helpers.js';

const dailyHabit = {
  id: 'h-daily', name: 'Morning walk', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Full walk', small: 'Short walk', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false, category: 'wellbeing',
};
const showerHabit = {
  id: 'h-shower', name: 'Shower', icon: 'droplet', color: 'blue', goalType: 'practice',
  timeBlock: 'evening', full: 'Shower', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 2, paused: false, category: 'wellbeing',
};
const poopHabit = {
  id: 'h-poop', name: 'Poop', icon: 'leaf', color: 'sand', goalType: 'practice',
  timeBlock: 'morning', full: 'Poop', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 2, paused: false, category: 'home',
};
const readingHabit = {
  id: 'h-reading', name: 'Reading', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'afternoon', full: 'Read', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 1, paused: false, category: 'growth',
};
const laundryHabit = {
  id: 'h-laundry', name: 'Laundry reset', icon: 'leaf', color: 'gray', goalType: 'practice',
  timeBlock: 'morning', full: 'Laundry', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 1, paused: false, category: 'home',
};

// 2026-09-15 is a Monday, 2026-09-16 a Tuesday, both inside the same Mon-start week.
const MON = '2026-09-15';
const TUE = '2026-09-16';
const MORNING = '2026-09-16T08:00:00';
const TUE_2AM = '2026-09-16T02:00:00';

const viewSwitch = page => page.locator('#habitsViewSwitch');
const weekRow = (page, name) => page.locator('#habitsWeekList .checklist-row', {hasText: name});
const chip = (page, id) => page.locator(`#habitsCategoryFilter [data-category="${id}"]`);

test.describe('Habits screen: view switch defaults and visibility', () => {
  test('1. Habits screen defaults to Today view', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [dailyHabit, showerHabit]})});
    await expect(viewSwitch(page).locator('[data-view="today"]')).toHaveClass(/active/);
    await expect(viewSwitch(page).locator('[data-view="week"]')).not.toHaveClass(/active/);
    await expect(page.locator('#habitsChecklist')).toBeVisible();
    await expect(page.locator('#habitsWeekList')).toBeHidden();
  });

  test('2. Today view shows the daypart tabs', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [dailyHabit]})});
    await expect(page.locator('#habitsPeriodSwitch')).toBeVisible();
  });

  test('3. Today view excludes weekly target habits from the daypart list', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [dailyHabit, poopHabit]})});
    // poopHabit's timeBlock is "morning", same block/category context as dailyHabit — it
    // would show up here under the old mixed model, but weekly habits never do now.
    await expect(page.locator('#habitsChecklist')).toContainText('Morning walk');
    await expect(page.locator('#habitsChecklist')).not.toContainText('Poop');
    await expect(page.locator('#habitsCountLabel')).toHaveText('Today · 1');
  });

  test('4. This Week view hides the daypart tabs', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [showerHabit]})});
    await page.evaluate(() => setHabitsView('week'));
    await expect(page.locator('#habitsPeriodSwitch')).toBeHidden();
    await expect(page.locator('#habitsChecklist')).toBeHidden();
    await expect(page.locator('#habitsWeekList')).toBeVisible();
  });

  test('5. This Week shows weekly target habits regardless of their preferred daypart', async ({page}) => {
    // showerHabit=evening, poopHabit=morning, readingHabit=afternoon — three different blocks.
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [showerHabit, poopHabit, readingHabit]})});
    await page.evaluate(() => setHabitsView('week'));
    await expect(weekRow(page, 'Shower')).toHaveCount(1);
    await expect(weekRow(page, 'Poop')).toHaveCount(1);
    await expect(weekRow(page, 'Reading')).toHaveCount(1);
  });
});

test.describe('Habits screen: This Week category filtering', () => {
  test('6. category chips still filter This Week habits by category', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [showerHabit, poopHabit]})});
    await page.evaluate(() => setHabitsView('week'));
    await expect(weekRow(page, 'Shower')).toHaveCount(1);
    await expect(weekRow(page, 'Poop')).toHaveCount(1);

    await chip(page, 'wellbeing').click();
    await expect(weekRow(page, 'Shower')).toHaveCount(1);
    await expect(weekRow(page, 'Poop')).toHaveCount(0);

    await chip(page, 'home').click();
    await expect(weekRow(page, 'Shower')).toHaveCount(0);
    await expect(weekRow(page, 'Poop')).toHaveCount(1);
  });

  test('empty state: no weekly habits at all', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [dailyHabit]})});
    await page.evaluate(() => setHabitsView('week'));
    await expect(page.locator('#habitsWeekList')).toContainText('No weekly target habits yet.');
  });

  test('empty state: weekly habits exist but none in the filtered category', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [showerHabit]})});
    await page.evaluate(() => setHabitsView('week'));
    await chip(page, 'growth').click();
    await expect(page.locator('#habitsWeekList')).toContainText('No weekly habits in this category yet.');
  });
});

test.describe('Habits screen: This Week ordering and progress', () => {
  test('7. incomplete weekly habits appear before completed weekly habits', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [showerHabit, laundryHabit],
      logs: {[MON]: {'h-laundry': 'done'}}, // laundry target is 1 — already met
    })});
    await page.evaluate(() => setHabitsView('week'));
    const rows = page.locator('#habitsWeekList .checklist-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('Shower'); // still open
    await expect(rows.nth(1)).toContainText('Laundry reset'); // done enough
    await expect(page.locator('#habitsWeekList')).toContainText('Still open');
    await expect(page.locator('#habitsWeekList')).toContainText('Done enough');
  });

  test('8. weekly progress text displays correctly ("1 of 2 this week")', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [showerHabit],
      logs: {[MON]: {'h-shower': 'done'}},
    })});
    await page.evaluate(() => setHabitsView('week'));
    await expect(weekRow(page, 'Shower')).toContainText('1 of 2 this week');
  });

  test('10. a weekly habit whose target is met moves into Done enough', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [laundryHabit]})});
    await page.evaluate(() => setHabitsView('week'));
    await expect(page.locator('#habitsWeekList')).toContainText('Still open');
    await expect(page.locator('#habitsWeekList')).not.toContainText('Done enough');

    await weekRow(page, 'Laundry reset').locator('.weekly-log-btn').click();

    await expect(page.locator('#habitsWeekList')).not.toContainText('Still open');
    await expect(page.locator('#habitsWeekList')).toContainText('Done enough');
    await expect(weekRow(page, 'Laundry reset').locator('.weekly-done-check')).toHaveCount(1);
    await expect(weekRow(page, 'Laundry reset').locator('.weekly-log-btn')).toHaveCount(0);
  });
});

test.describe('Habits screen: logging from This Week', () => {
  test('9. tapping + Log from This Week logs under the active habit date and updates weekly progress', async ({page}) => {
    // 2am, reset hour defaults to 4am, so the active habit date is still Monday.
    await boot(page, {view: 'todayView', at: TUE_2AM, state: seedState({habits: [showerHabit]})});
    await page.evaluate(() => setHabitsView('week'));
    await weekRow(page, 'Shower').locator('.weekly-log-btn').click();

    const saved = await readState(page);
    expect(saved.logs[MON]?.['h-shower']).toBe('done');
    expect(saved.logs[TUE]?.['h-shower']).toBeUndefined();
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(1);
    await expect(weekRow(page, 'Shower')).toContainText('1 of 2 this week');
  });
});

test.describe('Habits screen: existing behavior preserved', () => {
  test('11. existing daily habit completion still works in Today view', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [dailyHabit]})});
    await page.locator('.checklist-row', {hasText: 'Morning walk'}).locator('.checklist-status').click();
    expect((await readState(page)).logs[TUE]?.['h-daily']).toBeTruthy();
    await expect(page.locator('#habitsChecklist')).not.toContainText('Morning walk');
  });

  test('12. active habit day reset behavior still applies with the view split in place', async ({page}) => {
    await boot(page, {view: 'todayView', at: TUE_2AM, state: seedState({habits: [dailyHabit]})});
    expect(await page.evaluate(() => activeHabitDateKey())).toBe(MON);
  });
});

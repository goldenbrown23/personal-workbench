// @ts-check
// Regression guard for Home's Do This Next selection hierarchy: (1) something genuinely
// due in the CURRENT daypart, (2) failing that, a genuinely flexible habit
// (scheduleType==="flexible" — never a weekly/daily habit surfaced early just because it's
// incomplete), (3) failing that, an intentional calm empty state. See pickStartHereHabit
// and flexibleHabitsNow in habits.js, and doNextEmptyCopy in home.js.
//
// The bug this replaces: pickStartHereHabit used to walk BLOCK_SEARCH_ORDER through every
// other daypart (and treated any incomplete weekly habit as fair game) whenever the current
// daypart had nothing, manufacturing a recommendation ("Nothing left from afternoon, so
// here's one from morning instead") the product explicitly doesn't want — see CLAUDE.md's
// "no guilt mechanics" / momentum-not-perfection principles.
import { test, expect, boot, seedState, readState } from './helpers.js';

const morningHabit = {
  id: 'h-morning', name: 'Take vitamins', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Take vitamins', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const morningHabit2 = {
  id: 'h-morning-2', name: 'Stretch', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Stretch', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const eveningHabit = {
  id: 'h-evening', name: 'Evening walk', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Evening walk', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const weeklyMorningHabit = {
  id: 'h-weekly', name: 'Weekly Shower', icon: 'droplet', color: 'blue', goalType: 'practice',
  timeBlock: 'morning', full: 'Shower', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 2, paused: false,
};
const flexibleHabit = {
  id: 'h-flex', name: 'Read a page', icon: 'leaf', color: 'sand', goalType: 'practice',
  timeBlock: 'morning', full: 'Read a page', small: '', small2: '',
  scheduleType: 'flexible', weekdays: [], weeklyTarget: 1, paused: false,
};

// 2026-09-16 is a Wednesday within the 09-14..09-20 Monday-start week.
const MORNING = '2026-09-16T08:00:00';
const AFTERNOON = '2026-09-16T14:00:00';
const EVENING = '2026-09-16T19:00:00';
const TODAY = '2026-09-16';
const MON = '2026-09-14';

const doNextCard = page => page.locator('#homeNow');

test.describe('Do This Next: current-daypart habits', () => {
  test('1. a morning habit appears during morning', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [morningHabit]})});
    await expect(doNextCard(page)).toContainText('Take vitamins');
    await expect(doNextCard(page).locator('.do-next-btn.primary')).toBeVisible();
  });

  test('2. a morning habit whose daypart passed does not surface in the afternoon', async ({page}) => {
    await boot(page, {view: 'homeView', at: AFTERNOON, state: seedState({habits: [morningHabit]})});
    await expect(doNextCard(page)).not.toContainText('Take vitamins');
    await expect(doNextCard(page).locator('.do-next-btn')).toHaveCount(0);
  });

  test('12. a current-daypart habit takes priority over a flexible one', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [morningHabit, flexibleHabit]})});
    await expect(doNextCard(page)).toContainText('Take vitamins');
    await expect(doNextCard(page)).not.toContainText('Read a page');
  });

  test('13. once the current pick is handled, the next eligible current-daypart habit is chosen', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({
      habits: [morningHabit, morningHabit2],
      logs: {[TODAY]: {'h-morning': 'done'}},
    })});
    await expect(doNextCard(page)).toContainText('Stretch');
    await expect(doNextCard(page)).not.toContainText('Take vitamins');
  });
});

test.describe('Do This Next: "handled today" statuses all close the door for today', () => {
  test('3. an explicit Not today in the morning is not offered again in the afternoon or evening', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [morningHabit]})});
    await page.evaluate(() => setStatus('h-morning', 'miss'));
    expect((await readState(page)).logs[TODAY]['h-morning']).toBe('miss');

    await page.clock.setFixedTime(new Date(AFTERNOON));
    await page.evaluate(() => renderHome());
    await expect(doNextCard(page)).not.toContainText('Take vitamins');

    await page.clock.setFixedTime(new Date(EVENING));
    await page.evaluate(() => renderHome());
    await expect(doNextCard(page)).not.toContainText('Take vitamins');
  });

  test('4. a Done habit does not reappear later the same day', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({
      habits: [morningHabit],
      logs: {[TODAY]: {'h-morning': 'done'}},
    })});
    expect(await page.evaluate(() => habitStillNeedsAttentionToday(state.habits[0]))).toBe(false);
    await expect(doNextCard(page)).not.toContainText('Take vitamins');
  });

  test('5. a Smaller Version habit does not reappear later the same day', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({
      habits: [morningHabit],
      logs: {[TODAY]: {'h-morning': 'counted'}},
    })});
    expect(await page.evaluate(() => habitStillNeedsAttentionToday(state.habits[0]))).toBe(false);
    await expect(doNextCard(page)).not.toContainText('Take vitamins');
  });
});

test.describe('Do This Next: empty state', () => {
  test('6. afternoon with nothing eligible renders the calm empty state, no Done button', async ({page}) => {
    await boot(page, {view: 'homeView', at: AFTERNOON, state: seedState({habits: [morningHabit, eveningHabit]})});
    await expect(doNextCard(page)).toContainText('Nothing you need to do right now.');
    await expect(doNextCard(page)).toContainText('Come back when the evening starts.');
    await expect(doNextCard(page).locator('.do-next-btn')).toHaveCount(0);
    await expect(doNextCard(page)).toHaveClass(/quiet/);
  });

  test('7. evening with nothing eligible renders its own empty state', async ({page}) => {
    await boot(page, {view: 'homeView', at: EVENING, state: seedState({habits: [morningHabit]})});
    await expect(doNextCard(page)).toContainText('You’re clear for tonight.');
    await expect(doNextCard(page).locator('.do-next-btn')).toHaveCount(0);
  });

  test('14. no eligible current-daypart or flexible habit: selection returns null and UI matches', async ({page}) => {
    await boot(page, {view: 'homeView', at: AFTERNOON, state: seedState({habits: [weeklyMorningHabit]})});
    const pick = await page.evaluate(() => pickStartHereHabit(currentTimePeriod()));
    expect(pick).toBeNull();
    await expect(doNextCard(page).locator('.do-next-btn')).toHaveCount(0);
    await expect(doNextCard(page)).not.toContainText('Weekly Shower');
  });
});

test.describe('Do This Next: weekly habits are never quota fallback material', () => {
  test('8. a weekly habit completed once today does not reappear the same day even though progress is 1 of 2', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [weeklyMorningHabit]})});
    await expect(doNextCard(page)).toContainText('Weekly Shower');

    await page.evaluate(() => setStatus('h-weekly', 'done'));
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(1);
    await expect(doNextCard(page)).not.toContainText('Weekly Shower');
    await expect(doNextCard(page).locator('.do-next-btn')).toHaveCount(0);
  });

  test('9. a weekly habit under target becomes eligible again on a later appropriate day', async ({page}) => {
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({
      habits: [weeklyMorningHabit],
      logs: {[MON]: {'h-weekly': 'done'}},
    })});
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(1);
    await expect(doNextCard(page)).toContainText('Weekly Shower');
  });

  test('10. a weekly habit with a preferred morning daypart is not pulled into the afternoon merely because its target is incomplete', async ({page}) => {
    await boot(page, {view: 'homeView', at: AFTERNOON, state: seedState({habits: [weeklyMorningHabit]})});
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(0);
    await expect(doNextCard(page)).not.toContainText('Weekly Shower');
    await expect(doNextCard(page)).toContainText('Nothing you need to do right now.');
  });

  // Reproduces the exact scenario from the bug report: Weekly Shower, preferred morning,
  // target incomplete, viewed in the afternoon with no afternoon habits at all.
  test('reproduces the reported scenario: Weekly Shower is not pulled forward into an empty afternoon', async ({page}) => {
    await boot(page, {view: 'homeView', at: AFTERNOON, state: seedState({habits: [weeklyMorningHabit]})});
    await expect(doNextCard(page)).not.toContainText('Weekly Shower');
    await expect(doNextCard(page)).not.toContainText('Nothing left from afternoon');
    await expect(doNextCard(page).locator('.do-next-block-note')).toHaveCount(0);
  });
});

test.describe('Do This Next: genuinely flexible habits', () => {
  test('11. a truly flexible habit may appear when there is no current-daypart habit', async ({page}) => {
    await boot(page, {view: 'homeView', at: AFTERNOON, state: seedState({habits: [flexibleHabit]})});
    await expect(doNextCard(page)).toContainText('Read a page');
    await expect(doNextCard(page).locator('.do-next-btn.primary')).toBeVisible();
  });

  test('a flexible habit already handled today does not reappear', async ({page}) => {
    await boot(page, {view: 'homeView', at: AFTERNOON, state: seedState({
      habits: [flexibleHabit],
      logs: {[TODAY]: {'h-flex': 'done'}},
    })});
    await expect(doNextCard(page)).not.toContainText('Read a page');
  });
});

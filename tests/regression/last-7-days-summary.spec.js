// @ts-check
// Regression guard for the Last 7 Days summary cleanup (Weekly Detail's #practiceOverview
// card, rendered by renderPracticeGrid() in src/js/practice.js):
//
//   1. "Returned" is no longer a fourth primary bucket next to Regular/Smaller/Not today —
//      a modern return (isReturn/isReturnDay(), habits.js) keeps its real done/counted
//      status and is surfaced as a separate, secondary "N returns" line instead, hidden
//      entirely when there are none this window.
//   2. "X / Y possible" is gone from this card — the denominator mixed daily/specific-day/
//      weekly-target/flexible scheduling semantics and read as a completion score, which
//      doesn't fit this app's non-scorecard philosophy. (The separate Insights "Engagement"
//      tile inside the Detailed History disclosure, #metricEngagementNote, still shows an
//      X/Y possible note — that tile is untouched; this only concerns the summary card.)
//   3. Percentages are gone from the three legend rows — counts only.
//
// Legacy status:"returned" records (pre-dating the done/counted + isReturn split) are never
// guessed into Regular or Smaller (their real tier is unrecoverable), but isReturnDay()
// still counts them toward the secondary returns line so real historical activity isn't
// silently dropped from the card.
import { test, expect, boot, seedState, readState, bareHabit, dailyHabit } from './helpers.js';

const specificDayHabit = {
  id: 'h-days', name: 'Gym', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Full workout', small: '', small2: '',
  scheduleType: 'days', weekdays: [1, 3, 5], weeklyTarget: 1, paused: false,
};
const flexibleHabit = {
  id: 'h-flex', name: 'Read a chapter', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Read a chapter', small: '', small2: '',
  scheduleType: 'flexible', weekdays: [], weeklyTarget: 1, paused: false,
};
const weeklyHabit = {
  id: 'h-weekly', name: 'Call a friend', icon: 'phone', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Call', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 3, paused: false,
};
const pausedHabit = {
  id: 'h-paused', name: 'Paused habit', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Anything', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: true,
};

// 2026-09-16 is a Wednesday; MON..WED fall inside both the Mon-start calendar week and the
// rolling Last-7-Days window ending "today" — matching returns.spec.js's established anchor.
const AT = '2026-09-16T20:00:00';
const MON = '2026-09-14', TUE = '2026-09-15', WED = '2026-09-16';

const overview = page => page.locator('#practiceOverview');
const legendRow = (page, label) => overview(page).locator('.overview-legend-row', {hasText: label});

test.describe('Last 7 Days summary: Returned is context, not a fourth bucket', () => {
  test('1&2&3. done/counted/miss render as Regular/Smaller/Not today, as plain counts', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'done'}, [TUE]: {'h-daily': 'counted'}, [MON]: {'h-daily': 'miss'}}}),
    });
    await expect(legendRow(page, 'Regular')).toContainText('1');
    await expect(legendRow(page, 'Smaller')).toContainText('1');
    await expect(legendRow(page, 'Not today')).toContainText('1');
    // No percentages anywhere in the primary legend.
    await expect(overview(page).locator('.overview-legend')).not.toContainText('%');
  });

  test('4&6. a modern returned "done" counts as Regular and does not create a fourth bucket', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      // Monday done, Tuesday blank (a missed daily opportunity), Wednesday done again = a
      // modern Return on Wednesday, per isReturnDay()/missedOpportunityAnchor() (habits.js).
      state: seedState({habits: [dailyHabit], logs: {[MON]: {'h-daily': 'done'}, [WED]: {'h-daily': 'done'}}}),
    });
    await expect(legendRow(page, 'Regular')).toContainText('2');
    await expect(legendRow(page, 'Smaller')).toContainText('0');
    await expect(overview(page).locator('.overview-legend-row')).toHaveCount(3); // Regular, Smaller, Not today — never a 4th
    await expect(overview(page).locator('.overview-returns')).toContainText('1 return');
  });

  test('5&6. a modern returned "counted" counts as Smaller and does not create a fourth bucket', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit], logs: {[MON]: {'h-daily': 'done'}, [WED]: {'h-daily': 'counted'}}}),
    });
    await expect(legendRow(page, 'Regular')).toContainText('1');
    await expect(legendRow(page, 'Smaller')).toContainText('1');
    await expect(overview(page).locator('.overview-legend-row')).toHaveCount(3);
    await expect(overview(page).locator('.overview-returns')).toContainText('1 return');
  });

  test('7. zero modern returns: the secondary Return line is hidden entirely', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'done'}}}),
    });
    await expect(overview(page).locator('.overview-returns')).toHaveCount(0);
  });

  test('8. multiple returns produce the correct secondary count', async ({page}) => {
    const habitA = {...dailyHabit, id: 'h-a', name: 'Habit A'};
    const habitB = {...dailyHabit, id: 'h-b', name: 'Habit B'};
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({
        habits: [habitA, habitB],
        logs: {
          [MON]: {'h-a': 'done', 'h-b': 'done'},
          [WED]: {'h-a': 'done', 'h-b': 'counted'}, // both return on Wednesday (Tuesday blank for both)
        },
      }),
    });
    await expect(overview(page).locator('.overview-returns')).toContainText('2 returns');
  });

  test('9. legacy status:"returned" contributes to the secondary Return line without being guessed into Regular or Smaller', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      // A bare legacy string status "returned" with no way to recover whether it was
      // originally a full or smaller completion.
      state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'returned'}}}),
    });
    await expect(legendRow(page, 'Regular')).toContainText('0');
    await expect(legendRow(page, 'Smaller')).toContainText('0');
    await expect(overview(page).locator('.overview-legend-row')).toHaveCount(3);
    await expect(overview(page).locator('.overview-returns')).toContainText('1 return');
    // The persisted legacy record itself must remain untouched — no migration.
    const state = await readState(page);
    expect(state.logs[WED]['h-daily']).toBe('returned');
  });

  test('10&11. "X / Y possible" is no longer rendered in the summary card', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'done'}}}),
    });
    await expect(overview(page)).not.toContainText('possible');
    await expect(overview(page).locator('.overview-total')).toHaveCount(0);
  });

  test('13&14. daily and specific-day habits contribute their logged events, not a possible/opportunity count', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({
        habits: [dailyHabit, specificDayHabit],
        logs: {[WED]: {'h-daily': 'done', 'h-days': 'done'}},
      }),
    });
    await expect(legendRow(page, 'Regular')).toContainText('2');
    await expect(overview(page)).not.toContainText('possible');
  });

  test('15. a flexible habit with no log this window does not manufacture a phantom entry', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [flexibleHabit]}),
    });
    // Nothing logged at all → the calm empty state, not a fabricated 0-row breakdown implying missed opportunities.
    await expect(overview(page)).toContainText('No check-ins logged this week yet.');
  });

  test('16. a weekly-target habit\'s logged events show up as plain Regular/Smaller counts, not weekly-target progress', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [weeklyHabit], logs: {[MON]: {'h-weekly': 'done'}, [TUE]: {'h-weekly': 'counted'}}}),
    });
    await expect(legendRow(page, 'Regular')).toContainText('1');
    await expect(legendRow(page, 'Smaller')).toContainText('1');
    // weeklyTarget is 3 — the card must not show "2 / 3" or any target-based framing.
    await expect(overview(page)).not.toContainText('/ 3');
    await expect(overview(page)).not.toContainText('possible');
  });

  test('17. a paused habit\'s stale log entries do not distort the summary', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit, pausedHabit], logs: {[WED]: {'h-daily': 'done', 'h-paused': 'done'}}}),
    });
    // Paused habits are excluded from scheduling ("possible"), but a log entry that actually
    // exists is still real logged activity, so it's fine for it to still count as Regular —
    // this card describes what happened, not what "should" have happened per schedule.
    await expect(legendRow(page, 'Regular')).toContainText('2');
  });

  test('18. an empty window (no logs at all) renders the calm existing empty state', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit]}),
    });
    await expect(overview(page)).toContainText('No check-ins logged this week yet.');
    await expect(overview(page).locator('.overview-legend-row')).toHaveCount(0);
  });

  test('19. the rolling Last 7 Days date range label is unaffected', async ({page}) => {
    await boot(page, {view: 'practiceView', at: AT, state: seedState({habits: [dailyHabit]})});
    await expect(page.locator('#practiceWeekLabel')).toContainText('Last 7 Days');
  });

  test('20. Detailed History (per-day event list) is unaffected by the summary cleanup', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [dailyHabit], logs: {[WED]: {'h-daily': 'done'}}}),
    });
    await page.locator('#practiceDetailDisclosure summary').first().click();
    await expect(page.locator('#practiceHistoryList')).toContainText('Full version');
  });

  test('22. a bare habit logged as Done still tallies as Regular', async ({page}) => {
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [bareHabit], logs: {[WED]: {'h-bare': 'done'}}}),
    });
    await expect(legendRow(page, 'Regular')).toContainText('1');
    await expect(legendRow(page, 'Smaller')).toContainText('0');
  });

  test('23. both configured smaller options still aggregate under the same Smaller row', async ({page}) => {
    const habitSmall = {...dailyHabit, id: 'h-small', full: 'Full', small: 'Small', small2: ''};
    const habitSmall2 = {...dailyHabit, id: 'h-small2', full: 'Full', small: '', small2: 'Minimum'};
    await boot(page, {
      view: 'practiceView', at: AT,
      state: seedState({habits: [habitSmall, habitSmall2], logs: {[WED]: {'h-small': 'counted', 'h-small2': 'counted'}}}),
    });
    await expect(legendRow(page, 'Smaller')).toContainText('2');
  });

  for (const width of [360, 390, 402, 430]) {
    test(`${width}px: the summary card renders without overflow and with readable text labels for every row`, async ({page}) => {
      await page.setViewportSize({width, height: 844});
      await boot(page, {
        view: 'practiceView', at: AT,
        // Monday done, Tuesday blank, Wednesday counted = a real return (Tuesday was a
        // missed daily opportunity), so the secondary return line has something to show.
        state: seedState({
          habits: [dailyHabit],
          logs: {[MON]: {'h-daily': 'done'}, [WED]: {'h-daily': 'counted'}},
        }),
      });
      await expect(overview(page)).toBeVisible();
      // Text labels, not just colored dots, communicate each category (accessibility).
      await expect(legendRow(page, 'Regular')).toBeVisible();
      await expect(legendRow(page, 'Smaller')).toBeVisible();
      await expect(legendRow(page, 'Not today')).toBeVisible();
      await expect(overview(page).locator('.overview-returns')).toContainText('return');
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    });
  }
});

// @ts-check
// Regression guard for Detailed History's reverse-chronological ordering (Trends →
// Weekly Detail). History should read like a log — Today first, Yesterday second, older
// days descending below — never a Monday-start calendar week with unlogged future days
// baked in. See practiceWeekDays()/renderPracticeHistoryList() in src/js/practice.js.
import { test, expect, boot, seedState } from './helpers.js';

const habit = {
  id: 'h-daily', name: 'Morning walk', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Full walk', small: 'Short walk', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};

async function openHistory(page) {
  const disclosure = page.locator('#practiceDetailDisclosure');
  if (!(await disclosure.getAttribute('open'))) {
    await disclosure.locator('> summary').click();
  }
}

function dayLabels(page) {
  return page.locator('#practiceHistoryList .history-day-label, #practiceHistoryList .history-quiet-day-date').allTextContents();
}

test.describe('Detailed History ordering', () => {
  test('Today leads, Yesterday second, older days descend, mid-week (no future days)', async ({page}) => {
    // 2026-09-16 is a Wednesday.
    await boot(page, {view: 'practiceView', at: '2026-09-16T10:00:00', state: seedState({habits: [habit], logs: {}})});
    await openHistory(page);
    const labels = await dayLabels(page);
    expect(labels).toEqual([
      'Today', 'Yesterday', 'Monday, September 14', 'Sunday, September 13',
      'Saturday, September 12', 'Friday, September 11', 'Thursday, September 10',
    ]);
  });

  test('older/newer navigation crosses a month boundary correctly', async ({page}) => {
    // 2026-10-02 is a Friday; going back one 7-day window should land squarely in September.
    await boot(page, {view: 'practiceView', at: '2026-10-02T10:00:00', state: seedState({habits: [habit], logs: {}})});
    await openHistory(page);
    await page.locator('#practicePrevWeek').click();
    const labels = await dayLabels(page);
    expect(labels).toEqual([
      'Friday, September 25', 'Thursday, September 24', 'Wednesday, September 23',
      'Tuesday, September 22', 'Monday, September 21', 'Sunday, September 20', 'Saturday, September 19',
    ]);
    // "Newer" is re-enabled and returns exactly to the original window, anchored on Today.
    await expect(page.locator('#practiceNextWeek')).toBeEnabled();
    await page.locator('#practiceNextWeek').click();
    await expect(page.locator('#practiceHistoryList .history-quiet-day-date, #practiceHistoryList .history-day-label').first()).toHaveText('Today');
    await expect(page.locator('#practiceNextWeek')).toBeDisabled();
  });

  test('older navigation crosses a year boundary correctly', async ({page}) => {
    // 2027-01-03 is a Sunday; one window back should land at the end of 2026.
    await boot(page, {view: 'practiceView', at: '2027-01-03T10:00:00', state: seedState({habits: [habit], logs: {}})});
    await openHistory(page);
    await page.locator('#practicePrevWeek').click();
    const labels = await dayLabels(page);
    expect(labels).toEqual([
      'Sunday, December 27', 'Saturday, December 26', 'Friday, December 25',
      'Thursday, December 24', 'Wednesday, December 23', 'Tuesday, December 22', 'Monday, December 21',
    ]);
  });

  test('logs and notes stay associated with the correct date after reordering', async ({page}) => {
    await boot(page, {view: 'practiceView', at: '2026-09-16T10:00:00', state: seedState({
      habits: [habit],
      logs: {'2026-09-14': {'h-daily': 'done'}},
      dayNotes: {'2026-09-13': 'felt good'},
    })});
    await openHistory(page);
    const mondayRow = page.locator('#practiceHistoryList .history-day', {hasText: 'Monday, September 14'});
    await expect(mondayRow).toContainText('Morning walk');
    const sundayRow = page.locator('#practiceHistoryList .history-day', {hasText: 'Sunday, September 13'});
    await expect(sundayRow.locator('[data-day-note]')).toContainText('felt good');
    // Today (no log, no note) still collapses to the quiet-day row.
    await expect(page.locator('#practiceHistoryList .history-quiet-day', {hasText: 'Today'})).toBeVisible();
  });

  test('expand/collapse state is preserved per day', async ({page}) => {
    await boot(page, {view: 'practiceView', at: '2026-09-16T10:00:00', state: seedState({
      habits: [habit],
      logs: {'2026-09-14': {'h-daily': 'done'}},
    })});
    await openHistory(page);
    const mondayDetails = page.locator('#practiceHistoryList .history-day[data-day-key="2026-09-14"]');
    await expect(mondayDetails).not.toHaveAttribute('open', '');
    await mondayDetails.locator('summary').click();
    await expect(mondayDetails).toHaveAttribute('open', '');
  });
});

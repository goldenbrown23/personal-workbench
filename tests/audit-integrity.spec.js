// @ts-check
import { test, expect } from '@playwright/test';

// Functional-integrity audit tests for gaps not covered by workbench.spec.js or
// cadence-audit.spec.js: weekly-target habits, Smaller Version historical logging,
// editing/deleting past logs and their effect on derived Trends stats, and the
// future-date guard on Circle interactions.

const STORAGE_KEY = 'return_habit_tracker_v1';
const VIEW_KEY = 'personal_workbench_last_view';

function seedState(overrides = {}) {
  return {
    habits: [], logs: {}, people: [], dayNotes: {},
    settings: {
      startScreen: 'last', compactMode: false, hapticsEnabled: false, backupReminderEnabled: false,
      guideOpened: true, firstUsedAt: '2026-01-01T00:00:00.000Z', lastBackupAt: null,
      backupRemindAfter: null, pinnedModules: [],
    },
    ...overrides,
  };
}

async function boot(page, {state = seedState(), view = 'homeView', at = '2026-09-14T10:00:00'} = {}) {
  await page.clock.setFixedTime(new Date(at));
  await page.addInitScript(([key, viewKey, value, startView]) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.clear();
    localStorage.setItem(key, value);
    localStorage.setItem(viewKey, startView);
  }, [STORAGE_KEY, VIEW_KEY, JSON.stringify(state), view]);
  await page.goto('/index.html');
  await expect(page.locator('.view.active')).toHaveAttribute('id', view);
  // The service worker's clients.claim() on first activation fires a controllerchange
  // that update.js reloads the page for (see update.js's shouldReloadForNewController) —
  // a real, one-time reload on fresh storage, not a bug. Let it settle before any
  // page.evaluate() runs, since evaluate (unlike locator actions) has no built-in retry
  // across a navigation and fails hard with "Execution context was destroyed."
  await page.waitForTimeout(400);
  await expect(page.locator('.view.active')).toHaveAttribute('id', view);
}

const readState = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);

// 2026-09-14 is a Monday, so this week runs Mon 09-14 .. Sun 09-20.
const weeklyHabit = {
  id: 'h-weekly', name: 'Call a friend', icon: 'phone', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: '', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 3, paused: false,
};

test.describe('weekly-target habits', () => {
  test('weeklyProgress counts only logs within the current Monday-start week', async ({page}) => {
    await boot(page, {state: seedState({habits: [weeklyHabit]})});
    // Two logs last week (should NOT count), two logs this week (should count).
    await page.evaluate(() => {
      state.logs['2026-09-06'] = {'h-weekly': 'done'}; // last Sunday, previous week
      state.logs['2026-09-13'] = {'h-weekly': 'done'}; // yesterday, previous week (Sunday)
      state.logs['2026-09-14'] = {'h-weekly': 'done'}; // today, this week (Monday)
      state.logs['2026-09-16'] = {'h-weekly': 'counted'}; // Wednesday, this week
      saveState();
    });
    const progress = await page.evaluate(() => weeklyProgress(state.habits[0]));
    expect(progress).toBe(2);
  });

  // As of the "habit system update" (d3ad0d9), a weekly habit that already met its rhythm
  // for the week steps out of the Habits checklist entirely, not just Start Here / Later —
  // renderHabitsChecklist's own comment: "same 'enough attention for now' rule ... also
  // applied here so it doesn't keep appearing in the main Today checklist. It stays
  // reachable via Search, its own detail sheet, and history." This replaces the older
  // "stays visible" expectation with the current, intentionally quieter one.
  test('a weekly habit that already met its target drops out of Start Here / Later AND the Habits checklist, but stays visible before the target is met', async ({page}) => {
    await boot(page, {state: seedState({habits: [weeklyHabit]})});

    await page.locator('.tabbar .tab[data-view="todayView"]').click();
    await page.locator('#habitsPeriodSwitch [data-block="morning"]').click();
    await expect(page.locator('#habitsChecklist .checklist-name', {hasText: 'Call a friend'})).toBeVisible();

    await page.evaluate(() => {
      state.logs['2026-09-14'] = {'h-weekly': 'done'};
      state.logs['2026-09-15'] = {'h-weekly': 'done'};
      state.logs['2026-09-16'] = {'h-weekly': 'done'};
      saveState();
    });
    const stillNeeds = await page.evaluate(() => habitStillNeedsAttentionToday(state.habits[0]));
    expect(stillNeeds).toBe(false);

    await expect(page.locator('#habitsChecklist .checklist-name', {hasText: 'Call a friend'})).toHaveCount(0);
    // Still reachable through the rest of the app — not deleted, just quieted for the week.
    await expect.poll(() => page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(3);
  });

  test('scheduleLabel reflects live progress and resets to 0 in the new week', async ({page}) => {
    await boot(page, {state: seedState({habits: [weeklyHabit]}), at: '2026-09-14T10:00:00'});
    await page.evaluate(() => { state.logs['2026-09-14'] = {'h-weekly': 'done'}; saveState(); });
    expect(await page.evaluate(() => scheduleLabel(state.habits[0]))).toBe('1/3 this week');

    // Jump the clock into the following week (Monday 2026-09-21) without adding new logs.
    await page.clock.setFixedTime(new Date('2026-09-21T10:00:00'));
    await page.evaluate(() => renderAll());
    expect(await page.evaluate(() => scheduleLabel(state.habits[0]))).toBe('0/3 this week');
  });
});

const versionedHabit = {
  id: 'h-versions', name: 'Journal', icon: 'journal', color: 'lavender', goalType: 'practice',
  timeBlock: 'evening', full: 'Write a full page', small: 'Write two sentences',
  small2: 'Just open the notebook', scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};

test.describe('Smaller Version logging and historical edits', () => {
  // The overwrite guard no longer runs through window.confirm() from inside
  // handleLogStatusClick — handleLogStatusClick only stages a pending version now (see its
  // own comment: "never saves by itself"). The actual write, and the overwrite guard, live
  // in commitSingleStatusLog(), which opens the shared in-app #replaceLogModal (not the
  // browser's confirm()) whenever the day already has a different status. Declining is
  // "Keep current" (#keepCurrentLogBtn); confirming is "Replace" (#replaceLogBtn).
  test('logging a Smaller Version for a past day never overwrites an existing Full Completion unless explicitly confirmed', async ({page}) => {
    await boot(page, {state: seedState({habits: [versionedHabit]})});
    await page.evaluate(() => {
      state.logs['2026-09-10'] = {'h-versions': {status: 'done', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}};
      saveState();
    });
    const before = await readState(page);
    await page.evaluate(() => {
      loggingHabitId = 'h-versions';
      loggingSelectedDate = '2026-09-10';
      loggingDateIsCustom = true;
      loggingMode = 'single';
      commitSingleStatusLog('counted');
    });
    await expect(page.locator('#replaceLogModal')).toHaveClass(/show/);
    await page.locator('#keepCurrentLogBtn').click();
    await expect(page.locator('#replaceLogModal')).not.toHaveClass(/show/);

    const after = await readState(page);
    expect(after.logs['2026-09-10']['h-versions'].status).toBe('done');
    expect(after).toEqual(before);
  });

  test('confirmed Smaller Version overwrite on a past day updates the stored status and Trends immediately', async ({page}) => {
    await boot(page, {state: seedState({habits: [versionedHabit]})});
    await page.evaluate(() => {
      state.logs['2026-09-10'] = {'h-versions': {status: 'done', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}};
      saveState();
      loggingHabitId = 'h-versions';
      loggingSelectedDate = '2026-09-10';
      loggingDateIsCustom = true;
      loggingMode = 'single';
      commitSingleStatusLog('counted');
    });
    await expect(page.locator('#replaceLogModal')).toHaveClass(/show/);
    await page.locator('#replaceLogBtn').click();

    const after = await readState(page);
    expect(after.logs['2026-09-10']['h-versions'].status).toBe('counted');
  });

  test('deleting a past log immediately drops it from the 7-day engagement count', async ({page}) => {
    await boot(page, {state: seedState({habits: [versionedHabit]})});
    await page.evaluate(() => {
      state.logs['2026-09-13'] = {'h-versions': {status: 'done', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}};
      saveState();
    });
    await page.locator('.tabbar .tab[data-view="weekView"]').click();
    await expect(page.locator('#engagementMetric')).toHaveText('1');

    await page.evaluate(() => clearHabitLogEntry('h-versions', '2026-09-13'));
    await expect(page.locator('#engagementMetric')).toHaveText('—');
    const after = await readState(page);
    expect(after.logs['2026-09-13']?.['h-versions']).toBeUndefined();
  });

  test('editing a past log\'s status recalculates Weekly Detail engagement % without a reload', async ({page}) => {
    await boot(page, {state: seedState({habits: [versionedHabit]}), at: '2026-09-14T10:00:00'});
    await page.evaluate(() => {
      // Log the habit "miss" on every day of this week so far (Mon-Sun through today).
      for (const d of ['2026-09-14']) state.logs[d] = {'h-versions': 'miss'};
      saveState();
    });
    await page.evaluate(() => switchView('practiceView'));
    await expect(page.locator('#metricEngagement')).toHaveText('0%');

    // 1 engaged day of the 7-day week (the habit applies daily) = 14%, rounded.
    await page.evaluate(() => saveHabitLogEntry('h-versions', {date: '2026-09-14', timeBlock: 'evening', status: 'done', note: ''}));
    await expect(page.locator('#metricEngagement')).toHaveText('14%');
  });
});

test.describe('My Circle: future-dated and same-day interactions', () => {
  test('the contact date picker caps out at today, refusing a future date', async ({page}) => {
    const person = {id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend', frequency: 7, lastContact: null, interactions: [], notes: []};
    await boot(page, {state: seedState({people: [person]}), at: '2026-09-14T10:00:00'});
    await page.locator('.tabbar .tab[data-view="circleView"]').click();
    await page.locator('.circle-hero-btn.primary, .circle-no-content-btn').first().click();
    const max = await page.locator('#contactDateCustom').getAttribute('max');
    expect(max).toBe('2026-09-14');
  });

  test('two same-day interactions for the same person are additive (different methods), not silently merged', async ({page}) => {
    const person = {id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend', frequency: 7, lastContact: null, interactions: [], notes: []};
    await boot(page, {state: seedState({people: [person]}), at: '2026-09-14T10:00:00'});
    await page.evaluate(() => {
      const p = state.people[0];
      p.interactions.push({id: 'i-1', date: '2026-09-14', method: 'Text', note: '', countsAsSeen: false, createdAt: 't1', updatedAt: 't1'});
      p.interactions.push({id: 'i-2', date: '2026-09-14', method: 'In person', note: '', countsAsSeen: true, createdAt: 't2', updatedAt: 't2'});
      syncLastContact(p);
      saveState();
    });
    const after = await readState(page);
    expect(after.people[0].interactions).toHaveLength(2);
    expect(after.people[0].lastContact).toBe('2026-09-14');
    const timing = await page.evaluate(() => personTiming(state.people[0]));
    expect(timing.class).toBe('good');
  });
});

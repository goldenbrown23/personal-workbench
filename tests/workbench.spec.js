// @ts-check
import { test, expect } from '@playwright/test';

// Behaviour tests for the flows most likely to regress silently: navigation, habit
// logging and its persistence, the smaller-version model, Circle interaction logging,
// and the Trends activity filter. Each test seeds localStorage before the app boots, so
// no test depends on another's leftovers or on whatever is in the browser profile.

const STORAGE_KEY = 'return_habit_tracker_v1';
const VIEW_KEY = 'personal_workbench_last_view';

/** A habit with a full AND a smaller version — the two-version case Home offers "Easier version" for. */
const twoVersionHabit = {
  id: 'h-stretch', name: 'Evening stretch', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'evening', full: 'Full 15-minute stretch', small: 'Two stretches, one minute',
  small2: '', scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
/** A habit with no versions configured at all — the "nothing to offer" fallback case. */
const bareHabit = {
  id: 'h-bare', name: 'Drink water', icon: 'water', color: 'blue', goalType: 'practice',
  timeBlock: 'evening', full: '', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};

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

/**
 * Boots the app with a known state and a fixed wall clock. The clock matters: the habit
 * picker, the Home greeting and the "Do this next" copy are all time-of-day dependent.
 */
async function boot(page, {state = seedState(), view = 'homeView', at = '2026-09-13T20:00:00'} = {}) {
  await page.clock.setFixedTime(new Date(at));
  // addInitScript runs on every navigation, reloads included — seed only the first time so
  // a test can reload to check that what the APP wrote survived, not what the test wrote.
  await page.addInitScript(([key, viewKey, value, startView]) => {
    if (sessionStorage.getItem('__seeded')) return;
    sessionStorage.setItem('__seeded', '1');
    localStorage.clear();
    localStorage.setItem(key, value);
    localStorage.setItem(viewKey, startView);
  }, [STORAGE_KEY, VIEW_KEY, JSON.stringify(state), view]);
  await page.goto('/index.html');
  await expect(page.locator('.view.active')).toHaveAttribute('id', view);
  // The service worker's clients.claim() on first activation fires a controllerchange that
  // update.js reloads the page for (a real, one-time reload on fresh storage, not a bug).
  // Let it settle before any evaluate/locator call with no built-in retry across a
  // navigation — this is the source of this file's known "Execution context was destroyed" flake.
  await page.waitForTimeout(400);
  await expect(page.locator('.view.active')).toHaveAttribute('id', view);
}

const readState = page => page.evaluate(k => JSON.parse(localStorage.getItem(k)), STORAGE_KEY);

test.describe('navigation', () => {
  test('every tab activates exactly one view, with no stale views or sideways scroll', async ({page}) => {
    await boot(page, {state: seedState({habits: [twoVersionHabit]})});
    const tabs = ['homeView', 'todayView', 'circleView', 'weekView', 'moreView'];

    for (let round = 0; round < 2; round++) {
      for (const view of tabs) {
        await page.locator(`.tabbar .tab[data-view="${view}"]`).click();
        await expect(page.locator('.view.active')).toHaveCount(1);
        await expect(page.locator('.view.active')).toHaveAttribute('id', view);
        await expect(page.locator('.tab.active')).toHaveAttribute('data-view', view);

        const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        expect(overflows, `${view} scrolls horizontally`).toBe(false);
      }
    }
  });

  test('the last view is restored after a reload', async ({page}) => {
    await boot(page, {state: seedState({habits: [twoVersionHabit]})});
    await page.locator('.tabbar .tab[data-view="weekView"]').click();
    await page.reload();
    await expect(page.locator('.view.active')).toHaveAttribute('id', 'weekView');
  });
});

test.describe('habit logging', () => {
  test('logging from Home persists across a reload', async ({page}) => {
    await boot(page, {state: seedState({habits: [twoVersionHabit]})});

    await expect(page.locator('#homeNow')).toContainText('Evening stretch');
    await page.locator('#homeNow .do-next-btn.primary').click();

    // The smallest configured version is what the primary button logs, so this is
    // "counted", not "done" — see homePrimaryTier() in habits.js.
    await expect.poll(async () => (await readState(page)).logs['2026-09-13']?.['h-stretch'])
      .toBe('counted');

    await page.reload();
    expect((await readState(page)).logs['2026-09-13']['h-stretch']).toBe('counted');
  });

  test('a smaller version is visually distinct from a full one', async ({page}) => {
    await boot(page, {
      view: 'todayView',
      state: seedState({
        habits: [twoVersionHabit, bareHabit],
        logs: {'2026-09-13': {'h-stretch': 'done', 'h-bare': 'counted'}},
      }),
    });

    const rowStatus = name => page.locator('.checklist-row', {hasText: name}).locator('.checklist-status');
    await expect(rowStatus('Evening stretch')).toHaveText('✓');
    await expect(rowStatus('Drink water')).toHaveText('○');
  });

  test('Easier version offers each configured version and logs the smaller one', async ({page}) => {
    await boot(page, {state: seedState({habits: [twoVersionHabit]})});

    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText('Full 15-minute stretch');

    await options.nth(1).click();
    await expect.poll(async () => (await readState(page)).logs['2026-09-13']?.['h-stretch'])
      .toBe('counted');
  });

  test('a habit with no easier version keeps a single full-width action', async ({page}) => {
    await boot(page, {state: seedState({habits: [bareHabit]})});

    await expect(page.locator('#homeNow .do-next-btn.primary')).toBeVisible();
    await expect(page.locator('#homeNow .do-next-btn.secondary')).toHaveCount(0);

    const {buttonWidth, rowWidth} = await page.evaluate(() => ({
      buttonWidth: document.querySelector('#homeNow .do-next-btn.primary').getBoundingClientRect().width,
      rowWidth: document.querySelector('#homeNow .do-next-actions').getBoundingClientRect().width,
    }));
    // Ratio rather than an exact match: sub-pixel layout rounding varies between runs.
    expect(buttonWidth / rowWidth, `button ${buttonWidth} of row ${rowWidth}`).toBeGreaterThan(0.98);
  });

  test('backdating a log writes the date that was picked, not today', async ({page}) => {
    await boot(page, {view: 'todayView', state: seedState({habits: [bareHabit]})});

    await page.locator('.checklist-row', {hasText: 'Drink water'}).locator('.checklist-overflow').click();
    await page.locator('#statusDateDetails > summary').click();
    await page.locator('#statusDateChips [data-pick="2026-09-11"]').click();
    await page.locator('#statusVersionList .version-option').first().click();

    const logs = (await readState(page)).logs;
    expect(logs['2026-09-11']['h-bare'].status).toBe('counted');
    expect(logs['2026-09-13']).toBeUndefined();
  });
});

test.describe('Home "do this next" context note', () => {
  // The note explains why a habit from another block is being surfaced. It must never
  // claim something was "left from" late night, which is not one of the three time blocks.
  test('is shown when falling back to another block', async ({page}) => {
    await boot(page, {at: '2026-09-13T09:00:00', state: seedState({habits: [twoVersionHabit]})});
    await expect(page.locator('#homeNow .do-next-block-note'))
      .toHaveText(/Nothing left from morning, so here’s one from evening instead\./);
  });

  test('is not shown after midnight, when there is no block to fall back from', async ({page}) => {
    await boot(page, {at: '2026-09-13T01:00:00', state: seedState({habits: [twoVersionHabit]})});
    await expect(page.locator('#homeNow')).toContainText('Evening stretch');
    await expect(page.locator('#homeNow .do-next-block-note')).toHaveCount(0);
  });
});

test.describe('My Circle', () => {
  test('logging an interaction updates last contact immediately and after reload', async ({page}) => {
    await boot(page, {
      view: 'circleView',
      state: seedState({people: [{
        id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend',
        frequency: 7, lastContact: null, interactions: [], notes: [],
      }]}),
    });

    // Sam has never been contacted, so frequency=7 makes them due for a first check-in —
    // they start out as the hero card.
    await expect(page.locator('.circle-hero-name')).toHaveText('Sam');

    await page.locator('#circleHeroCard .circle-hero-btn.primary').click();
    await page.locator('#contactMethod').selectOption('Text');
    await page.locator('#contactNote').fill('Quick catch-up');
    await page.locator('#saveContactBtn').click();

    // Logging today's interaction recalculates Next Due Date to 7 days out, so Sam
    // immediately drops out of "People to check in with" — nobody else is due either.
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
    await expect(page.locator('#circleRecentList')).toContainText('Quick catch-up');

    const person = (await readState(page)).people[0];
    expect(person.interactions).toHaveLength(1);
    expect(person.interactions[0].date).toBe('2026-09-13');
    expect(person.lastContact).toBe('2026-09-13');

    await page.reload();
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
    await expect(page.locator('#circleRecentList')).toContainText('Quick catch-up');
  });

  test('the empty state offers no dead "View all" controls', async ({page}) => {
    await boot(page, {view: 'circleView'});
    await expect(page.locator('#circleHeroCard')).toContainText('Your Circle starts here');
    await expect(page.locator('#circleCheckinList')).toBeEmpty();
    await expect(page.locator('#circleCheckinViewAll')).toBeHidden();
    await expect(page.locator('#circleRecentViewAll')).toBeHidden();
  });

  test('an interaction\'s ••• menu opens even when it sits below the fold', async ({page}) => {
    // Regression guard: clicking a summary that is out of view makes the browser scroll it
    // into view, and that scroll used to close the menu before it was ever positioned.
    const interactions = Array.from({length: 3}, (_, i) => ({
      id: `i-${i}`, date: `2026-09-0${i + 1}`, method: 'Text', note: `Note ${i}`,
      countsAsSeen: false, createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    }));
    await boot(page, {
      view: 'circleView',
      // Robin is listed first and is equally overdue, so Robin takes the single hero slot
      // and Sam — the one with the interactions — lands in the tappable check-in list.
      state: seedState({people: [
        {id: 'p-2', name: 'Robin', icon: 'person', color: 'sage', relation: 'friend',
         frequency: 7, lastContact: '2026-08-20', interactions: [], notes: []},
        {id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend',
         frequency: 7, lastContact: '2026-09-03', interactions, notes: []},
      ]}),
    });

    await page.locator('#circleCheckinList .circle-row', {hasText: 'Sam'}).click();
    await page.locator('#personDetailModal .modal').evaluate(el => {el.scrollTop = 0;});

    const menu = page.locator('#personDetailBody .interaction-row').first().locator('.interaction-menu');
    await menu.locator('summary').click();

    await expect(menu).toHaveAttribute('open', '');
    await expect(menu.getByRole('button', {name: 'Delete'})).toBeVisible();
  });
});

test.describe('Trends', () => {
  const loggedState = seedState({
    habits: [twoVersionHabit],
    logs: {'2026-09-12': {'h-stretch': 'counted'}, '2026-09-13': {'h-stretch': 'done'}},
    people: [{
      id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend', frequency: 7,
      lastContact: '2026-09-13',
      interactions: [{id: 'i-1', date: '2026-09-13', method: 'Text', note: '', countsAsSeen: false,
        createdAt: '2026-09-13T00:00:00.000Z', updatedAt: '2026-09-13T00:00:00.000Z'}],
      notes: [],
    }],
  });

  test('metrics match the stored logs', async ({page}) => {
    await boot(page, {view: 'weekView', state: loggedState});
    await expect(page.locator('#engagementMetric')).toHaveText('2');
    await expect(page.locator('#returnsMetric')).toHaveText('0');
    await expect(page.locator('#reviewHistory')).not.toContainText(/NaN|undefined/);
  });

  test('each activity filter shows only its own kind of entry', async ({page}) => {
    await boot(page, {view: 'weekView', state: loggedState});

    const openFilter = async () => {
      await page.locator('#weekView details.floating-menu').scrollIntoViewIfNeeded();
      await page.locator('#weekView details.floating-menu > summary').click();
    };

    await openFilter();
    await page.locator('[data-review-filter="habit"]').click();
    await expect(page.locator('#reviewHistory')).toContainText('Evening stretch');
    await expect(page.locator('#reviewHistory')).not.toContainText('Connected with Sam');

    await openFilter();
    await page.locator('[data-review-filter="circle"]').click();
    await expect(page.locator('#reviewHistory')).toContainText('Connected with Sam');
    await expect(page.locator('#reviewHistory')).not.toContainText('Evening stretch');

    await openFilter();
    await page.locator('[data-review-filter="all"]').click();
    await expect(page.locator('#reviewHistory')).toContainText('Evening stretch');
    await expect(page.locator('#reviewHistory')).toContainText('Connected with Sam');
  });

  test('Weekly Detail engagement % excludes paused habits from "possible"', async ({page}) => {
    // Two daily habits over a 7-day week: one active, one paused. A paused habit isn't
    // something the user is expected to complete (see CLAUDE.md's "no guilt mechanics"),
    // so it must not inflate the "possible" denominator — only the active habit's 7 daily
    // slots should count, never both habits' 14.
    const activeHabit = {...twoVersionHabit, id: 'h-active', paused: false};
    const pausedHabit = {...twoVersionHabit, id: 'h-paused', name: 'Paused habit', paused: true};
    await boot(page, {view: 'practiceView', state: seedState({habits: [activeHabit, pausedHabit], logs: {}})});
    await expect(page.locator('#metricEngagementNote')).toHaveText('0 / 7 possible');
  });

  test('Weekly Detail "coming up, gently" nudge ignores paused habits', async ({page}) => {
    // A 3-miss streak on a habit the user already paused shouldn't nudge them about it —
    // pausing is a deliberate break, not a failure to be flagged.
    const paused = {...twoVersionHabit, id: 'h-paused', paused: true};
    const logs = {};
    ['2026-09-11', '2026-09-12', '2026-09-13'].forEach(d => { logs[d] = {'h-paused': 'miss'}; });
    await boot(page, {view: 'practiceView', state: seedState({habits: [paused], logs})});
    await expect(page.locator('#practiceSystemLock')).toContainText('0 / 3');
    await expect(page.locator('#practiceSystemLock')).toContainText('Nothing to act on yet');
  });
});

test.describe('destructive actions', () => {
  test('declining the reset confirmation keeps every record', async ({page}) => {
    await boot(page, {view: 'settingsView', state: seedState({
      habits: [twoVersionHabit],
      logs: {'2026-09-13': {'h-stretch': 'done'}},
    })});

    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#clearDataBtn').click();
    await page.locator('#resetDataBtn').click();

    const after = await readState(page);
    expect(after.habits).toHaveLength(1);
    expect(after.logs['2026-09-13']['h-stretch']).toBe('done');
  });
});

test('the app boots with no console errors', async ({page}) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(String(err)));

  await boot(page, {state: seedState({habits: [twoVersionHabit]})});
  for (const view of ['todayView', 'circleView', 'weekView', 'moreView']) {
    await page.locator(`.tabbar .tab[data-view="${view}"]`).click();
  }

  expect(errors).toEqual([]);
});

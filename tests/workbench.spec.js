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
    // "counted", not "done" — see homePrimaryTier() in habits.js. That exact version
    // (Smaller, since twoVersionHabit has no Tiny configured) is known and preserved.
    await expect.poll(async () => (await readState(page)).logs['2026-09-13']?.['h-stretch']?.status)
      .toBe('counted');
    await expect.poll(async () => (await readState(page)).logs['2026-09-13']?.['h-stretch']?.tier)
      .toBe('smaller');

    await page.reload();
    expect((await readState(page)).logs['2026-09-13']['h-stretch'].status).toBe('counted');
  });

  test('a smaller version is visually distinct from a full one', async ({page}) => {
    await boot(page, {
      view: 'todayView',
      state: seedState({
        habits: [twoVersionHabit, bareHabit],
        logs: {'2026-09-13': {'h-stretch': 'done', 'h-bare': 'counted'}},
      }),
    });

    // Already-logged habits live in Logged today, not the Today checklist — see
    // habitStillNeedsAttentionToday() in habits.js.
    const loggedRow = name => page.locator('#habitsDoneList .later-row', {hasText: name});
    await expect(loggedRow('Evening stretch')).toContainText('Done');
    await expect(loggedRow('Drink water')).toContainText('Counted');
  });

  test('Easier version offers each configured version and logs the smaller one', async ({page}) => {
    await boot(page, {state: seedState({habits: [twoVersionHabit]})});

    await page.locator('#homeNow .do-next-btn.secondary').click();
    const options = page.locator('#easierVersionList .version-option');
    await expect(options).toHaveCount(2);
    await expect(options.first()).toContainText('Full 15-minute stretch');

    await options.nth(1).click();
    // The Easier-version row explicitly names "Two stretches, one minute" (the Smaller
    // version) — that exact choice must survive into the log, not just its status.
    await expect.poll(async () => (await readState(page)).logs['2026-09-13']?.['h-stretch']?.status)
      .toBe('counted');
    await expect.poll(async () => (await readState(page)).logs['2026-09-13']?.['h-stretch']?.tier)
      .toBe('smaller');
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
    // The date picker's own preset chips are only Today/Yesterday now (see setupDatePicker
    // in state.js) — any other date goes through "Pick date", which reveals the native
    // #statusDateCustom input.
    await page.locator('#statusDateChips [data-pick="custom"]').click();
    await page.locator('#statusDateCustom').fill('2026-09-11');
    await page.locator('#statusVersionList .version-option').first().click();
    // Selecting a version only stages it now (handleLogStatusClick) — the Log button is the
    // one place a single-date entry actually commits (commitSingleStatusLog).
    await page.locator('#statusLogBtn').click();

    const logs = (await readState(page)).logs;
    // bareHabit has no full/small/small2 configured, so its only version-list row is the
    // no-versions-configured fallback, which logs "done" — see noVersionsConfiguredRow()
    // in habits.js (a habit with nothing configured has no smaller version to record).
    expect(logs['2026-09-11']['h-bare'].status).toBe('done');
    expect(logs['2026-09-13']).toBeUndefined();
  });
});

test.describe('Home "do this next" no longer walks backward across dayparts', () => {
  // twoVersionHabit is timeBlock:"evening" and scheduleType:"daily" — not flexible — so an
  // empty morning must render the calm empty state, never surface an evening habit early.
  // See tests/regression/do-this-next.spec.js for the fuller eligibility regression suite.
  test('an evening-only habit does not get pulled forward into an empty morning', async ({page}) => {
    await boot(page, {at: '2026-09-13T09:00:00', state: seedState({habits: [twoVersionHabit]})});
    await expect(page.locator('#homeNow')).not.toContainText('Evening stretch');
    await expect(page.locator('#homeNow .do-next-btn')).toHaveCount(0);
  });

  // Late-night (00:00-04:59) reads as a continuation of evening (see currentBlockForPeriod
  // in habits.js), so the evening habit is genuinely the CURRENT daypart here, not a fallback.
  test('late-night treats evening as the current daypart, not a fallback', async ({page}) => {
    await boot(page, {at: '2026-09-13T01:00:00', state: seedState({habits: [twoVersionHabit]})});
    await expect(page.locator('#homeNow')).toContainText('Evening stretch');
  });
});

test.describe('My Circle: My People / single nudge / Recent Moments', () => {
  function personWith(id, name, extra = {}) {
    return {id, name, icon: 'person', color: 'rose', relation: '', frequency: 0, lastContact: null, interactions: [], notes: [], ...extra};
  }

  test('My People shows everyone added, with no Main Circle / Other People split', async ({page}) => {
    await boot(page, {
      view: 'circleView',
      state: seedState({people: [personWith('p1', 'Mom'), personWith('p2', 'Dad'), personWith('p3', 'Alex')]}),
    });
    const names = await page.locator('#circlePeopleList .circle-people-item .circle-people-name').allInnerTexts();
    // Add Person no longer has a tile of its own in this rail — it lives only in the hero's
    // addPersonBtn now (see circle.js's comment on circlePeopleRowHTML: "a second entry
    // point in this limited-width rail would just cost space that should go to actual
    // people"), so the rail holds exactly the people added, nothing else.
    expect(names).toEqual(['Mom', 'Dad', 'Alex']);
    await expect(page.locator('#addPersonBtn')).toBeVisible();
    await expect(page.locator('.circle-main-card, .circle-people-card:has-text("Other People")')).toHaveCount(0);
  });

  test('zero people preserves the friendly onboarding empty state', async ({page}) => {
    await boot(page, {view: 'circleView'});
    await expect(page.locator('#circlePeopleList')).toBeEmpty();
    await expect(page.locator('#circleHeroCard')).toContainText('Your Circle starts here');
  });

  test('only one check-in nudge appears on the landing page; the full queue stays hidden until requested', async ({page}) => {
    await boot(page, {
      view: 'circleView',
      state: seedState({people: [
        personWith('p1', 'Overdue1', {frequency: 7, lastContact: '2026-09-01'}),
        personWith('p2', 'Overdue2', {frequency: 7, lastContact: '2026-08-20'}),
      ]}),
    });
    await expect(page.locator('.circle-hero-card')).toHaveCount(1);
    await expect(page.locator('#circleQueueModal')).not.toHaveClass(/show/);
    await page.locator('#circleHeroCard .circle-hero-menu summary').click();
    await page.getByRole('button', {name: 'View all check-ins'}).click();
    await expect(page.locator('#circleQueueModal')).toHaveClass(/show/);
    await expect(page.locator('#circleQueueList .circle-row')).toHaveCount(2);
  });

  test('"Not today" swaps the nudge to the next eligible person without a reload', async ({page}) => {
    await boot(page, {
      view: 'circleView',
      state: seedState({people: [
        personWith('p1', 'Overdue1', {frequency: 7, lastContact: '2026-08-20'}),
        personWith('p2', 'Overdue2', {frequency: 7, lastContact: '2026-09-01'}),
      ]}),
    });
    await expect(page.locator('.circle-hero-name')).toHaveText('Overdue1');
    await page.locator('#circleHeroCard .circle-hero-menu summary').click();
    await page.getByRole('button', {name: 'Not today'}).click();
    await expect(page.locator('.circle-hero-name')).toHaveText('Overdue2');
  });

  // Recent Moments no longer renders inline on the My Circle landing page — the full
  // chronological interaction archive moved to More → Circle Moments (circleMomentsView),
  // reusing the same row markup (circleRecentRowHTML/.circle-row). See circle.js's comment
  // on renderCircleMoments: "the full interaction archive that used to render inline on the
  // My Circle landing page ('Recent Moments') ... only where it's shown moved."
  test('Log moment updates last contact immediately and appears in Circle Moments', async ({page}) => {
    await boot(page, {
      view: 'circleView',
      state: seedState({people: [personWith('p1', 'Sam', {frequency: 7})]}),
    });
    await page.locator('#circleHeroCard .circle-hero-btn.primary').click();
    await page.locator('#contactNote').fill('Sent a photo');
    await page.locator('#saveContactBtn').click();
    await expect(page.locator('#circleHeroCard')).toContainText('caught up');

    await page.evaluate(() => switchView('circleMomentsView'));
    await expect(page.locator('#circleMomentsList .circle-row')).toContainText('Sent a photo');
  });

  test('Circle Moments (More → Circle Moments) lists every logged interaction, not just a landing-page preview', async ({page}) => {
    const interactions = ['2026-09-10', '2026-09-11', '2026-09-12'].map((date, i) => ({
      id: `i-${i}`, date, method: 'Text', note: `Moment ${i}`, countsAsSeen: false,
      createdAt: `${date}T00:00:00.000Z`, updatedAt: `${date}T00:00:00.000Z`,
    }));
    await boot(page, {
      view: 'circleView',
      state: seedState({people: [personWith('p1', 'Sam', {interactions})]}),
    });
    // The landing page itself carries no Recent Moments list at all any more — just the
    // hero and My People.
    await expect(page.locator('#circleView .circle-row')).toHaveCount(0);

    await page.evaluate(() => switchView('circleMomentsView'));
    await expect(page.locator('#circleMomentsList .circle-row')).toHaveCount(3);
  });

  test('"See all" on My People opens the people directory', async ({page}) => {
    await boot(page, {
      view: 'circleView',
      state: seedState({people: [personWith('p1', 'Mom')]}),
    });
    await page.locator('#circlePeopleSeeAll').click();
    await expect(page.locator('#managePeopleModal')).toHaveClass(/show/);
    await expect(page.locator('#managePeopleList')).toContainText('Mom');
  });

  test('My People avatar row scrolls horizontally without the page scrolling horizontally', async ({page}) => {
    const people = Array.from({length: 10}, (_, i) => personWith(`p${i}`, `Person${i}`));
    await boot(page, {view: 'circleView', state: seedState({people})});
    const overflowsPage = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflowsPage).toBe(false);
    const rowScrollable = await page.locator('#circlePeopleList').evaluate(el => el.scrollWidth > el.clientWidth);
    expect(rowScrollable).toBe(true);
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
    await page.evaluate(() => switchView('circleMomentsView'));
    await expect(page.locator('#circleMomentsList .circle-row')).toContainText('Quick catch-up');
    await page.evaluate(() => switchView('circleView'));

    const person = (await readState(page)).people[0];
    expect(person.interactions).toHaveLength(1);
    expect(person.interactions[0].date).toBe('2026-09-13');
    expect(person.lastContact).toBe('2026-09-13');

    await page.reload();
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
    await page.evaluate(() => switchView('circleMomentsView'));
    await expect(page.locator('#circleMomentsList .circle-row')).toContainText('Quick catch-up');
  });

  // Recent Moments (and its "View all" link) no longer exists on the landing page at all —
  // see the note above renderCircleMoments() in circle.js. The current equivalent of "no
  // dead controls in the empty state" is simply that the empty state renders its own
  // friendly copy with nothing else alongside it.
  test('the empty state offers no dead controls and no stray interaction list', async ({page}) => {
    await boot(page, {view: 'circleView'});
    await expect(page.locator('#circleHeroCard')).toContainText('Your Circle starts here');
    await expect(page.locator('#circleView .circle-row')).toHaveCount(0);
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
      // Robin is listed first and is equally overdue, so Robin takes the single landing
      // nudge slot and Sam — the one with the interactions — lands in the full check-in
      // queue, reached via the nudge card's ••• menu.
      state: seedState({people: [
        {id: 'p-2', name: 'Robin', icon: 'person', color: 'sage', relation: 'friend',
         frequency: 7, lastContact: '2026-08-20', interactions: [], notes: []},
        {id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend',
         frequency: 7, lastContact: '2026-09-03', interactions, notes: []},
      ]}),
    });

    await page.locator('#circleHeroCard .circle-hero-menu summary').click();
    await page.getByRole('button', {name: 'View all check-ins'}).click();
    await page.locator('#circleQueueList .circle-row', {hasText: 'Sam'}).click();
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

  // Trends' own inline activity feed (#reviewHistory, with its habit/circle/all type
  // filter) was removed from this screen entirely. The habit side moved to Habit Log
  // (More → Habit Log, its own per-habit filter — see habits.js's renderHabitLogFilter
  // comment: "reuses this same day-grouping/collapsible-list approach that used to render
  // Trends' 'Recent activity' — only WHERE it's shown moved"); the Circle side moved to
  // Circle Moments (see circle.js's renderCircleMoments comment). Trends itself now only
  // shows the rhythm grid and the "What matters" stat rollups.
  test('metrics match the stored logs, with no NaN/undefined leaking into the rendered stats', async ({page}) => {
    await boot(page, {view: 'weekView', state: loggedState});
    await expect(page.locator('#engagementMetric')).toHaveText('2');
    await expect(page.locator('#returnsMetric')).toHaveText('0');
    const trendsText = await page.locator('.trend-insight, .pattern-card').allInnerTexts();
    expect(trendsText.join(' ')).not.toMatch(/NaN|undefined/);
  });

  // Current equivalent of the old "each activity filter shows only its own kind of entry"
  // test: the habit and circle feeds are no longer one filterable list, they're two
  // separate, non-overlapping archives. This asserts the replacement behavior — Habit Log's
  // own per-habit filter dropdown actually filters, and Circle Moments never shows habit
  // entries (there's nothing in its markup that could).
  test('Habit Log\'s per-habit filter shows only that habit\'s entries; Circle Moments never mixes in habit entries', async ({page}) => {
    const otherHabit = {...twoVersionHabit, id: 'h-other', name: 'Morning pages'};
    const state = seedState({
      ...loggedState,
      habits: [twoVersionHabit, otherHabit],
      logs: {...loggedState.logs, '2026-09-13': {...loggedState.logs['2026-09-13'], 'h-other': 'done'}},
    });
    await boot(page, {view: 'habitLogView', state});

    await page.locator('#habitLogFilter').selectOption('h-stretch');
    await expect(page.locator('#habitLogHistory')).toContainText('Evening stretch');
    await expect(page.locator('#habitLogHistory')).not.toContainText('Morning pages');

    await page.locator('#habitLogFilter').selectOption('h-other');
    await expect(page.locator('#habitLogHistory')).toContainText('Morning pages');
    await expect(page.locator('#habitLogHistory')).not.toContainText('Evening stretch');

    await page.evaluate(() => switchView('circleMomentsView'));
    await expect(page.locator('#circleMomentsList')).not.toContainText('Evening stretch');
    await expect(page.locator('#circleMomentsList')).not.toContainText('Morning pages');
    await expect(page.locator('#circleMomentsList .circle-row')).toHaveCount(1);
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

  test('Weekly Detail "Worth noticing" ignores paused habits and stays hidden below the miss threshold', async ({page}) => {
    // A 3-miss streak on a habit the user already paused shouldn't nudge them about it —
    // pausing is a deliberate break, not a failure to be flagged. With no non-paused habit
    // reaching the 3-miss threshold, the section has nothing grounded to say, so it hides
    // entirely instead of showing a placeholder.
    const paused = {...twoVersionHabit, id: 'h-paused', paused: true};
    const logs = {};
    ['2026-09-11', '2026-09-12', '2026-09-13'].forEach(d => { logs[d] = {'h-paused': 'miss'}; });
    await boot(page, {view: 'practiceView', state: seedState({habits: [paused], logs})});
    await expect(page.locator('#practiceInsightSection')).toBeHidden();
  });

  test('Weekly Detail "Worth noticing" surfaces the top miss-streak habit in plain, non-streak language', async ({page}) => {
    const active = {...twoVersionHabit, id: 'h-active', paused: false};
    const logs = {};
    ['2026-09-11', '2026-09-12', '2026-09-13'].forEach(d => { logs[d] = {'h-active': 'miss'}; });
    await boot(page, {view: 'practiceView', state: seedState({habits: [active], logs})});
    await expect(page.locator('#practiceInsightSection')).toBeVisible();
    await expect(page.locator('#practiceSystemLock')).toContainText('Evening stretch keeps coming up');
    await expect(page.locator('#practiceSystemLock')).toContainText("harder to get to lately");
    await expect(page.locator('#practiceSystemLock')).toContainText('smaller version');
    const cardText = await page.locator('#practiceSystemLock').innerText();
    // Detection can use the miss streak internally, but the count/streak language must
    // never surface in the copy — see habitCurrentMissStreak() in src/js/practice.js.
    expect(cardText).not.toMatch(/\d+\s*days?\s*in a row/i);
    expect(cardText).not.toMatch(/missed\s*\d+/i);
    expect(cardText).not.toContain('/ 3');
    expect(cardText).not.toContain('%');
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

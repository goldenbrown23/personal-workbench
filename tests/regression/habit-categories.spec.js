// @ts-check
// Regression guard for habit categories: an optional, single-select "what area of life"
// tag (Wellbeing/Home/Growth/Relationships/Other), additive with (never a replacement for)
// the Morning/Afternoon/Evening daypart filter on the Habits tab. See HABIT_CATEGORIES/
// normalizeHabit/habitCategoryPillHTML in state.js and the category filter row in habits.js.
//
// Category is organizational metadata only — it must never influence habitAppliesToday,
// habitStillNeedsAttentionToday, weeklyProgress, or Do This Next selection.
import { test, expect, boot, seedState, readState } from './helpers.js';

const wellbeingHabit = {
  id: 'h-wellbeing', name: 'Morning Face Wash', icon: 'sun', color: 'peach', goalType: 'practice',
  timeBlock: 'morning', full: '', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false, category: 'wellbeing',
};
const weeklyWellbeingHabit = {
  id: 'h-weekly-wellbeing', name: 'Weekly Shower', icon: 'sparkles', color: 'blue', goalType: 'practice',
  timeBlock: 'morning', full: 'Shower', small: '', small2: '',
  scheduleType: 'weekly', weekdays: [], weeklyTarget: 2, paused: false, category: 'wellbeing',
};
const homeHabit = {
  id: 'h-home', name: 'Tidy kitchen', icon: 'home', color: 'sand', goalType: 'practice',
  timeBlock: 'morning', full: 'Full tidy', small: 'Wipe counters', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false, category: 'home',
};
// No `category` key at all — the legacy shape normalizeHabit() must backfill to "".
const legacyHabit = {
  id: 'h-legacy', name: 'Journal', icon: 'journal', color: 'gray', goalType: 'practice',
  timeBlock: 'morning', full: '', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const afternoonHomeHabit = {
  id: 'h-afternoon-home', name: 'Tidy desk', icon: 'home', color: 'sand', goalType: 'practice',
  timeBlock: 'afternoon', full: '', small: '', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false, category: 'home',
};

const MORNING = '2026-09-16T08:00:00';
const TODAY = '2026-09-16';
const MON = '2026-09-14';

const todayCount = page => page.locator('#habitsCountLabel').innerText();
const chip = (page, id) => page.locator(`#habitsCategoryFilter [data-category="${id}"]`);

test.describe('legacy and normalized data', () => {
  test('1. a legacy habit with no category field loads normally', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [legacyHabit]})});
    await expect(page.locator('#habitsChecklist')).toContainText('Journal');
    const stored = (await readState(page)).habits[0];
    expect(stored.category).toBe('');
  });

  test('14 & 15. an uncategorized habit appears under All but not under a named category', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [legacyHabit, wellbeingHabit]})});
    await expect(page.locator('#habitsChecklist')).toContainText('Journal');

    await chip(page, 'wellbeing').click();
    await expect(page.locator('#habitsChecklist')).not.toContainText('Journal');
    await expect(page.locator('#habitsChecklist')).toContainText('Morning Face Wash');
  });
});

test.describe('add / edit / remove category', () => {
  test('2. adding a habit with a Wellbeing category saves correctly', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: []})});
    await page.evaluate(() => openHabitModal());
    await page.locator('#habitName').fill('Stretch');
    await page.locator('#habitCategory').selectOption('wellbeing');
    await page.locator('#saveHabitBtn').click();

    const habit = (await readState(page)).habits.find(h => h.name === 'Stretch');
    expect(habit.category).toBe('wellbeing');
  });

  test('3. editing a category from Wellbeing to Home updates correctly', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [wellbeingHabit]})});
    await page.evaluate(() => openHabitModal('h-wellbeing'));
    await expect(page.locator('#habitCategory')).toHaveValue('wellbeing');
    await page.locator('#habitCategory').selectOption('home');
    await page.locator('#saveHabitBtn').click();

    expect((await readState(page)).habits[0].category).toBe('home');
  });

  test('4. removing a category (back to None) leaves the habit valid', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [wellbeingHabit]})});
    await page.evaluate(() => openHabitModal('h-wellbeing'));
    await page.locator('#habitCategory').selectOption('');
    await page.locator('#saveHabitBtn').click();

    const habit = (await readState(page)).habits[0];
    expect(habit.category).toBe('');
    await expect(page.locator('#habitsChecklist')).toContainText('Morning Face Wash');
    // No category badge rendered for an uncategorized habit — never "Uncategorized" text.
    await expect(page.locator('.checklist-row', {hasText: 'Morning Face Wash'})).not.toContainText('Uncategorized');
  });

  test('5. category persists across a reload', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [wellbeingHabit]})});
    await page.reload();
    expect((await readState(page)).habits[0].category).toBe('wellbeing');
    await expect(page.locator('.checklist-row', {hasText: 'Morning Face Wash'})).toContainText('Wellbeing');
  });
});

test.describe('backup / import round trip', () => {
  test('6 & 23. category survives export then import through the real file-input path', async ({page}) => {
    await boot(page, {view: 'settingsView', at: MORNING, state: seedState({habits: [wellbeingHabit, homeHabit]})});

    const exported = await page.evaluate(() => new Promise(resolve => {
      const originalCreate = URL.createObjectURL;
      URL.createObjectURL = blob => { blob.text().then(resolve); return originalCreate.call(URL, blob); };
      document.getElementById('exportDataBtn').click();
    }));

    await page.evaluate(() => { state = {habits: [], logs: {}, people: [], dayNotes: {}, settings: defaultState.settings}; saveState(); });
    await page.evaluate(json => {
      const file = new File([json], 'backup.json', {type: 'application/json'});
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.getElementById('importDataFile');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }, exported);
    await expect.poll(async () => (await readState(page)).habits.length).toBe(2);

    const after = await readState(page);
    expect(after.habits.find(h => h.id === 'h-wellbeing').category).toBe('wellbeing');
    expect(after.habits.find(h => h.id === 'h-home').category).toBe('home');
  });

  test('a malformed category value in an imported file is normalized away rather than breaking rendering', async ({page}) => {
    await boot(page, {view: 'settingsView', at: MORNING, state: seedState({habits: []})});
    const backup = {
      app: 'Personal Workbench', exportedAt: MORNING, version: 6,
      data: seedState({habits: [{...wellbeingHabit, category: 'not-a-real-category'}]}),
    };
    await page.evaluate(json => {
      const file = new File([json], 'backup.json', {type: 'application/json'});
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.getElementById('importDataFile');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }, JSON.stringify(backup));
    await expect.poll(async () => (await readState(page)).habits.length).toBe(1);

    const habit = (await readState(page)).habits[0];
    expect(habit.category).toBe('');
    await page.evaluate(() => switchView('todayView'));
    await expect(page.locator('#habitsChecklist')).toContainText('Morning Face Wash');
  });
});

test.describe('category + daypart filters are additive', () => {
  test('7. All + Morning shows every eligible Morning habit', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [wellbeingHabit, weeklyWellbeingHabit, homeHabit],
    })});
    await expect(todayCount(page)).resolves.toBe('Today · 3');
  });

  test('8. Wellbeing + Morning shows only Wellbeing Morning habits', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [wellbeingHabit, weeklyWellbeingHabit, homeHabit],
    })});
    await chip(page, 'wellbeing').click();
    await expect(todayCount(page)).resolves.toBe('Today · 2');
    await expect(page.locator('#habitsChecklist')).not.toContainText('Tidy kitchen');
  });

  test('9. Home + Morning shows only Home Morning habits', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [wellbeingHabit, weeklyWellbeingHabit, homeHabit],
    })});
    await chip(page, 'home').click();
    await expect(todayCount(page)).resolves.toBe('Today · 1');
    await expect(page.locator('#habitsChecklist')).toContainText('Tidy kitchen');
  });

  test('10. changing Morning to Afternoon while Wellbeing stays selected updates results and keeps the category active', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [wellbeingHabit, afternoonHomeHabit],
    })});
    await chip(page, 'wellbeing').click();
    await expect(todayCount(page)).resolves.toBe('Today · 1');

    await page.evaluate(() => setHabitsBlock('afternoon'));
    await expect(chip(page, 'wellbeing')).toHaveClass(/active/);
    await expect(todayCount(page)).resolves.toBe('Today · 0');
    await expect(page.locator('#habitsChecklist')).toContainText('No Wellbeing habits here yet.');
  });

  test('11. changing category while Afternoon stays selected keeps the daypart selected', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [wellbeingHabit, afternoonHomeHabit],
    })});
    await page.evaluate(() => setHabitsBlock('afternoon'));
    await chip(page, 'home').click();
    await expect(page.locator('#habitsPeriodSwitch [data-block="afternoon"]')).toHaveClass(/active/);
    await expect(todayCount(page)).resolves.toBe('Today · 1');
    await expect(page.locator('#habitsChecklist')).toContainText('Tidy desk');
  });

  test('12. Today count always reflects the currently filtered results', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [wellbeingHabit, weeklyWellbeingHabit, homeHabit],
    })});
    await expect(todayCount(page)).resolves.toBe('Today · 3');
    await chip(page, 'home').click();
    await expect(todayCount(page)).resolves.toBe('Today · 1');
    await chip(page, 'all').click();
    await expect(todayCount(page)).resolves.toBe('Today · 3');
  });

  test('16. an empty category/daypart combination renders an intentional, non-error empty state', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [wellbeingHabit]})});
    await page.evaluate(() => setHabitsBlock('afternoon'));
    await chip(page, 'growth').click();
    await expect(page.locator('#habitsChecklist')).toContainText('No Growth habits here yet.');
    await expect(page.locator('#habitsChecklist .empty-card')).not.toContainText('Add one now');
    // + Add habit stays available; nothing about the empty state disables it.
    await expect(page.locator('#addHabitBtn')).toBeVisible();
  });
});

test.describe('Logged today respects the category filter, Today/Logged today stay mutually exclusive', () => {
  test('13. Logged today only shows entries matching the selected category', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [wellbeingHabit, afternoonHomeHabit],
      logs: {[TODAY]: {'h-wellbeing': 'done', 'h-afternoon-home': 'done'}},
    })});
    await expect(page.locator('#habitsDoneCount')).toHaveText('2');

    await chip(page, 'wellbeing').click();
    await expect(page.locator('#habitsDoneCount')).toHaveText('1');
    await expect(page.locator('#habitsDoneList')).toContainText('Morning Face Wash');
    await expect(page.locator('#habitsDoneList')).not.toContainText('Tidy desk');
  });

  test('19. Not today still moves a habit from Today to Logged today under a category filter', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [wellbeingHabit]})});
    await chip(page, 'wellbeing').click();
    await expect(todayCount(page)).resolves.toBe('Today · 1');

    await page.evaluate(() => { openStatusModal('h-wellbeing'); document.getElementById('statusNotTodayBtn').click(); });

    await expect(todayCount(page)).resolves.toBe('Today · 0');
    await expect(page.locator('#habitsDoneList')).toContainText('Morning Face Wash');
    await expect(page.locator('#habitsDoneList')).toContainText('Not today');
  });

  test('20. Smaller Version still works normally under a category filter', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({habits: [homeHabit]})});
    await chip(page, 'home').click();
    await page.evaluate(() => openStatusModal('h-home'));
    await page.locator('#statusVersionList .version-option', {hasText: 'Wipe counters'}).click();
    await page.locator('#statusLogBtn').click();

    expect((await readState(page)).logs[TODAY]['h-home'].status).toBe('counted');
    await expect(todayCount(page)).resolves.toBe('Today · 0');
    await expect(page.locator('#habitsDoneList')).toContainText('Tidy kitchen');
  });
});

test.describe('category never influences eligibility, schedule, or Do This Next', () => {
  test('17. category has no effect on Do This Next eligibility or selection', async ({page}) => {
    // Two habits with identical priority-relevant fields (no smaller version, no missed
    // opportunity) so the only thing that could sway the pick is array order — never category.
    const plainA = {...wellbeingHabit, id: 'h-a', name: 'Habit A', small: '', small2: '', category: 'wellbeing'};
    const plainB = {...wellbeingHabit, id: 'h-b', name: 'Habit B', small: '', small2: '', category: 'home'};
    await boot(page, {view: 'homeView', at: MORNING, state: seedState({habits: [plainA, plainB]})});
    const pick = await page.evaluate(() => pickStartHereHabit(currentTimePeriod()));
    expect(pick.habit.id).toBe('h-a');

    // Swap which one has which category: the pick must be unchanged, since category never
    // enters the eligibility/priority calculation (only timeBlock/scheduleType/status do).
    await page.evaluate(() => { state.habits[0].category = 'home'; state.habits[1].category = 'wellbeing'; saveState(); });
    const pickAfter = await page.evaluate(() => pickStartHereHabit(currentTimePeriod()));
    expect(pickAfter.habit.id).toBe('h-a');
  });

  test('18. weekly habit category does not affect weeklyProgress()', async ({page}) => {
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [weeklyWellbeingHabit],
      logs: {[MON]: {'h-weekly-wellbeing': 'done'}},
    })});
    const progress = await page.evaluate(() => weeklyProgress(state.habits[0]));
    expect(progress).toBe(1);
    // Changing category after the fact must not change already-computed progress.
    await page.evaluate(() => { state.habits[0].category = 'other'; saveState(); });
    const progressAfter = await page.evaluate(() => weeklyProgress(state.habits[0]));
    expect(progressAfter).toBe(1);
  });
});

test.describe('mobile visual QA', () => {
  test('21 & 22. 390px: no page-level horizontal overflow, and Relationships remains reachable by scrolling the filter row', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await boot(page, {view: 'todayView', at: MORNING, state: seedState({
      habits: [wellbeingHabit, weeklyWellbeingHabit, homeHabit],
    })});

    const overflowsPage = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflowsPage).toBe(false);

    const relationshipsChip = chip(page, 'relationships');
    await relationshipsChip.scrollIntoViewIfNeeded();
    await expect(relationshipsChip).toBeVisible();
    await relationshipsChip.click();
    await expect(relationshipsChip).toHaveClass(/active/);

    // The filter row itself may scroll; the page must not.
    const rowOverflowsPage = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(rowOverflowsPage).toBe(false);
  });
});

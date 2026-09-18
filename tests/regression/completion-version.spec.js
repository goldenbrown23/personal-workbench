// @ts-check
// Regression guard for the Full/Smaller/Tiny completion-version refinement:
// 1. the "Easier" badge is gone from overview/list habit cards (src/js/habits.js
//    checklistRowHTML) — having an alternate version is completion-flow detail, not
//    overview noise.
// 2. "Minimum Version" is user-facing as "Tiny Version" (versionRowsForHabit's small2 row
//    label, the habit editor's habitSmall2 field, and the onboarding Guide copy) while the
//    internal habit fields stay full/small/small2 unchanged for backward compatibility.
// 3. the completion sheets (habitSheetModal's "Complete" flow, and statusModal's "Log"
//    flow) are genuinely single-select: Full/Smaller/Tiny share status "counted" for
//    Smaller and Tiny, so before this fix, both those rows rendered "active" simultaneously
//    the moment either was selected (comparing by status, not by the new `tier` field). See
//    versionRowsForHabit/renderStatusChoices/renderHabitSheetList in src/js/habits.js.
import { test, expect, boot, seedState, readState } from './helpers.js';

const AT = '2026-09-16T09:00:00';
const TODAY = '2026-09-16';

// The one fixture shape that actually exercises the bug: ALL THREE of full/small/small2
// configured, so Smaller and Tiny are two distinct rows that both carry status "counted".
const threeVersionHabit = {
  id: 'h-three', name: 'Night Face Wash', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Wash face + skincare', small: 'Wash face + moisturizer', small2: 'Use a cleansing wipe',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const twoVersionHabit = {
  id: 'h-two', name: 'Evening stretch', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Full 15-minute stretch', small: 'Two stretches, one minute', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};

test.describe('Habit overview: no "Easier" badge', () => {
  test('a habit with alternate versions shows no "Easier" badge or any replacement badge/icon on its checklist row', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    const row = page.locator('#habitsChecklist .checklist-row', {hasText: 'Night Face Wash'});
    await expect(row).toBeVisible();
    await expect(row).not.toContainText('Easier');
    await expect(row.locator('.checklist-easier-pill')).toHaveCount(0);
    // The alternate versions still exist — just not as overview noise. They must still
    // appear once the user actually opens the completion flow.
    await row.locator('.checklist-main').click();
    await expect(page.locator('#habitSheetList .version-option')).toHaveCount(3);
  });
});

test.describe('Completion sheet (Habit Sheet "Complete"): single-select', () => {
  test('Full/Smaller/Tiny all appear, and "Minimum Version" is no longer used anywhere', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    await page.locator('.checklist-row', {hasText: 'Night Face Wash'}).locator('.checklist-main').click();
    const options = page.locator('#habitSheetList .version-option');
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toContainText('Full version');
    await expect(options.nth(1)).toContainText('Smaller version');
    await expect(options.nth(2)).toContainText('Tiny version');
    await expect(page.locator('#habitSheetModal')).not.toContainText('Minimum');
  });

  test('exactly one row is selected at a time — selecting Smaller then Tiny never leaves two active', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    await page.locator('.checklist-row', {hasText: 'Night Face Wash'}).locator('.checklist-main').click();
    const options = page.locator('#habitSheetList .version-option');

    await options.nth(1).click(); // Smaller
    await expect(page.locator('#habitSheetList .version-option.active')).toHaveCount(1);
    await expect(options.nth(1)).toHaveClass(/active/);
    await expect(options.nth(2)).not.toHaveClass(/active/);

    await options.nth(2).click(); // Tiny — must replace, not add to, the selection
    await expect(page.locator('#habitSheetList .version-option.active')).toHaveCount(1);
    await expect(options.nth(2)).toHaveClass(/active/);
    await expect(options.nth(1)).not.toHaveClass(/active/);

    await options.nth(0).click(); // Full
    await expect(page.locator('#habitSheetList .version-option.active')).toHaveCount(1);
    await expect(options.nth(0)).toHaveClass(/active/);
  });

  test('Complete records the exact selected version — Full, Smaller, and Tiny are each unambiguous', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});

    await page.locator('.checklist-row', {hasText: 'Night Face Wash'}).locator('.checklist-main').click();
    await page.locator('#habitSheetList .version-option').nth(2).click(); // Tiny
    await page.locator('#habitSheetCompleteBtn').click();
    let entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('counted');
    expect(entry.tier).toBe('minimum');

    // The habit is now logged, so it's moved out of the Today checklist into Logged
    // today — reopen the same Habit Sheet directly rather than via that DOM location,
    // which is the point of this step (re-logging a different version), not navigation.
    await page.evaluate(id => openHabitSheet(id), 'h-three');
    await page.locator('#habitSheetList .version-option').nth(1).click(); // Smaller
    await page.locator('#habitSheetCompleteBtn').click();
    entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('counted');
    expect(entry.tier).toBe('smaller');
    // No entry can represent both simultaneously — a single tier value, not a set/array.
    expect(Array.isArray(entry.tier)).toBe(false);

    await page.evaluate(id => openHabitSheet(id), 'h-three');
    await page.locator('#habitSheetList .version-option').nth(0).click(); // Full
    await page.locator('#habitSheetCompleteBtn').click();
    entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('done');
    expect(entry.tier).toBe('full');
  });

  test('reopening the sheet for an already-logged Tiny completion pre-selects Tiny, not Smaller', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [threeVersionHabit],
      logs: {[TODAY]: {'h-three': {status: 'counted', tier: 'minimum', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}}},
    })});
    // Already logged, so it's in Logged today (not the Today checklist) — open the Habit
    // Sheet directly, same as its re-tap-to-change entry point (quickCompleteHabit).
    await page.evaluate(id => openHabitSheet(id), 'h-three');
    const options = page.locator('#habitSheetList .version-option');
    await expect(options.nth(2)).toHaveClass(/active/); // Tiny
    await expect(page.locator('#habitSheetList .version-option.active')).toHaveCount(1);
  });
});

test.describe('Completion sheet (Log habit / statusModal): single-select', () => {
  test('Full/Smaller/Tiny appear and exactly one is selected at a time', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    await page.evaluate(id => openStatusModal(id), 'h-three');
    const options = page.locator('#statusVersionList .version-option');
    await expect(options).toHaveCount(3);
    await expect(page.locator('#statusModal')).not.toContainText('Minimum');

    await options.nth(1).click();
    await expect(page.locator('#statusVersionList .version-option.active')).toHaveCount(1);
    await options.nth(2).click();
    await expect(page.locator('#statusVersionList .version-option.active')).toHaveCount(1);
    await expect(options.nth(2)).toHaveClass(/active/);
  });

  test('Log records the exact selected version for Smaller and Tiny unambiguously', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});

    await page.evaluate(id => openStatusModal(id), 'h-three');
    await page.locator('#statusVersionList .version-option').nth(2).click(); // Tiny
    await page.locator('#statusLogBtn').click();
    let entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('counted');
    expect(entry.tier).toBe('minimum');

    await page.evaluate(id => openStatusModal(id), 'h-three');
    await page.locator('#statusVersionList .version-option').nth(1).click(); // Smaller
    await page.locator('#statusLogBtn').click();
    entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('counted');
    expect(entry.tier).toBe('smaller');
  });
});

test.describe('Compatibility: legacy data and backup/restore', () => {
  test('an existing habit with a small2 (Tiny) value populates the Tiny version field when editing, and saving does not erase it', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    await page.evaluate(id => openHabitModal(id), 'h-three');
    await expect(page.locator('label[for="habitSmall2"]')).toHaveText(/Tiny version/);
    await expect(page.locator('#habitSmall2')).toHaveValue('Use a cleansing wipe');

    await page.locator('#saveHabitBtn').click();
    const after = await readState(page);
    expect(after.habits[0].small2).toBe('Use a cleansing wipe');
  });

  test('a pre-existing "counted" log entry with no tier still loads and displays generically in Habit Log history', async ({page}) => {
    await boot(page, {view: 'habitLogView', at: AT, state: seedState({
      habits: [threeVersionHabit],
      logs: {[TODAY]: {'h-three': {status: 'counted', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}}},
    })});
    const row = page.locator('#habitLogHistory .history-item', {hasText: 'Night Face Wash'});
    await expect(row).toBeVisible();
    // No tier on this legacy entry — falls back to the pre-existing generic label rather
    // than fabricating which of Smaller/Tiny it was.
    await expect(row).toContainText('Smaller version');
  });

  test('a new Tiny completion displays as "Tiny version" (not "Smaller version") in Habit Log history', async ({page}) => {
    await boot(page, {view: 'habitLogView', at: AT, state: seedState({
      habits: [threeVersionHabit],
      logs: {[TODAY]: {'h-three': {status: 'counted', tier: 'minimum', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}}},
    })});
    const row = page.locator('#habitLogHistory .history-item', {hasText: 'Night Face Wash'});
    await expect(row).toContainText('Tiny version');
    await expect(row).not.toContainText('Smaller version');
  });

  test('an old-format backup with no tier field imports successfully and the habit remains editable and completable', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    const oldBackup = JSON.stringify({
      app: 'Personal Workbench', exportedAt: 't', version: 6,
      data: {
        habits: [threeVersionHabit],
        logs: {[TODAY]: {'h-three': 'counted'}}, // oldest possible shape: a bare string
        people: [], dayNotes: {},
        settings: seedState().settings,
      },
    });
    await page.evaluate(json => {
      const file = new File([json], 'old-backup.json', {type: 'application/json'});
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.getElementById('importDataFile');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }, oldBackup);
    await expect.poll(async () => (await readState(page)).habits[0]?.name).toBe('Night Face Wash');
    expect((await readState(page)).logs[TODAY]['h-three']).toBe('counted');

    // Still editable — small2/Tiny value round-tripped.
    await page.evaluate(id => openHabitModal(id), 'h-three');
    await expect(page.locator('#habitSmall2')).toHaveValue('Use a cleansing wipe');
    await page.locator('#cancelHabitBtn').click();

    // Still completable — logging a fresh Tiny completion works normally. Already logged
    // (imported as 'counted'), so it's in Logged today, not the Today checklist — open the
    // Habit Sheet directly, same as its re-tap-to-change entry point.
    await page.evaluate(id => openHabitSheet(id), 'h-three');
    await page.locator('#habitSheetList .version-option').nth(2).click();
    await page.locator('#habitSheetCompleteBtn').click();
    const entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('counted');
    expect(entry.tier).toBe('minimum');
  });

  test('weekly progress still counts Full, Smaller, and Tiny completions equally as valid completion', async ({page}) => {
    const weeklyHabit = {...threeVersionHabit, id: 'h-weekly-three', scheduleType: 'weekly', weeklyTarget: 3};
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [weeklyHabit],
      logs: {
        '2026-09-14': {'h-weekly-three': {status: 'done', tier: 'full', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}},
        '2026-09-15': {'h-weekly-three': {status: 'counted', tier: 'smaller', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}},
        [TODAY]: {'h-weekly-three': {status: 'counted', tier: 'minimum', isReturn: false, timeBlock: 'evening', note: '', createdAt: 't', updatedAt: 't'}},
      },
    })});
    expect(await page.evaluate(() => weeklyProgress(state.habits[0]))).toBe(3);
  });
});

test.describe('Home completion paths: tier preserved only when genuinely knowable', () => {
  test('Home primary "Done" preserves the exact version it displays and confirms (Tiny, the smallest configured)', async ({page}) => {
    await boot(page, {view: 'homeView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    // homePrimaryTier() prioritizes Tiny (small2) and its exact text is what's shown as the
    // card detail — "✓ Done" confirms that specific version, not a generic check-in.
    await page.locator('#homeNow .do-next-btn.primary').click();
    const entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('counted');
    expect(entry.tier).toBe('minimum');
  });

  test('Easier version modal preserves the exact row tapped — Full, Smaller, and Tiny each unambiguous', async ({page}) => {
    await boot(page, {view: 'homeView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    await page.locator('#homeNow .do-next-btn.secondary').click();
    await page.locator('#easierVersionList .version-option').nth(1).click(); // Smaller
    const entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('counted');
    expect(entry.tier).toBe('smaller');
  });

  test('Habits tab quick-tap (checklist ✓) never fabricates a tier, even when all three versions exist', async ({page}) => {
    // quickCompleteHabit only knows "does some smaller version exist," never which one —
    // it must stay honestly unknown rather than guessing Tiny/Smaller. Gentle Day is what
    // makes it choose "counted" at all (see gentleDayOn()&&hasSmallerVersion() in
    // quickCompleteHabit); off, it just logs "done" — either way, no tier is ever attached.
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    await page.evaluate(() => setGentleDay(true));
    await page.reload();
    await page.evaluate(() => quickCompleteHabit('h-three'));
    const entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry).toBe('counted'); // plain-string legacy shape — no tier ever attached
  });
});

test.describe('History editing and batch writes: tier survives unrelated changes', () => {
  test('editing only the note on an already-logged entry does not erase its tier', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [threeVersionHabit],
      logs: {[TODAY]: {'h-three': {status: 'counted', tier: 'minimum', isReturn: false, timeBlock: 'morning', note: '', createdAt: 't', updatedAt: 't'}}},
    })});
    await page.evaluate(id => openStatusModal(id), 'h-three');
    // Leave the version selection untouched (it defaults to the entry's own tier) — only
    // change the note, then commit via the Log button.
    await page.locator('#statusNoteDetails > summary').click();
    await page.locator('#statusNote').fill('felt good');
    await page.locator('#statusLogBtn').click();
    const entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.note).toBe('felt good');
    expect(entry.tier).toBe('minimum');
  });

  test('explicitly changing the version while editing updates the tier', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [threeVersionHabit],
      logs: {[TODAY]: {'h-three': {status: 'counted', tier: 'minimum', isReturn: false, timeBlock: 'morning', note: '', createdAt: 't', updatedAt: 't'}}},
    })});
    await page.evaluate(id => openStatusModal(id), 'h-three');
    await page.locator('#statusVersionList .version-option').nth(0).click(); // Full
    await page.locator('#statusLogBtn').click();
    // Changing status (counted -> done) on an already-logged day surfaces the "replace?"
    // confirmation — confirm it to actually commit.
    await page.locator('#replaceLogBtn').click();
    const entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.status).toBe('done');
    expect(entry.tier).toBe('full');
  });

  test('editing a legacy tier:null entry\'s note does not fabricate a tier', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({
      habits: [threeVersionHabit],
      logs: {[TODAY]: {'h-three': {status: 'counted', isReturn: false, timeBlock: 'morning', note: '', createdAt: 't', updatedAt: 't'}}},
    })});
    await page.evaluate(id => openStatusModal(id), 'h-three');
    await page.locator('#statusNoteDetails > summary').click();
    await page.locator('#statusNote').fill('a note');
    await page.locator('#statusLogBtn').click();
    const entry = (await readState(page)).logs[TODAY]['h-three'];
    expect(entry.note).toBe('a note');
    expect(entry.tier).toBeFalsy();
  });

  test('batch-writing several dates preserves the same known tier on every date, never dropping or mixing it up', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [threeVersionHabit]})});
    await page.evaluate(id => {
      saveHabitLogEntriesBatch(id, ['2026-09-14', '2026-09-15'], {timeBlock: 'morning', status: 'counted', tier: 'smaller', note: ''});
    }, 'h-three');
    const logs = (await readState(page)).logs;
    expect(logs['2026-09-14']['h-three'].tier).toBe('smaller');
    expect(logs['2026-09-15']['h-three'].tier).toBe('smaller');
  });
});

test.describe('Two-version habit (no Tiny configured): unaffected', () => {
  test('a habit with only Full + Smaller configured still shows exactly two rows and logs correctly', async ({page}) => {
    await boot(page, {view: 'todayView', at: AT, state: seedState({habits: [twoVersionHabit]})});
    await page.locator('.checklist-row', {hasText: 'Evening stretch'}).locator('.checklist-main').click();
    await expect(page.locator('#habitSheetList .version-option')).toHaveCount(2);
    await page.locator('#habitSheetList .version-option').nth(1).click();
    await page.locator('#habitSheetCompleteBtn').click();
    const entry = (await readState(page)).logs[TODAY]['h-two'];
    expect(entry.status).toBe('counted');
    expect(entry.tier).toBe('smaller');
  });
});

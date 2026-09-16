// @ts-check
// Regression guard for export/import round-trip, plain reload persistence, and the one
// confirmed CSS bug found during the full QA pass (My Circle hero eyebrow overlapping the
// action icons below ~480px — see the @layer overrides block in styles.css).
import { test, expect, boot, seedState, readState } from './helpers.js';

const AT = '2026-09-16T10:00:00';

const habits = [
  {
    id: 'h-daily', name: 'Morning walk', icon: 'leaf', color: 'sage', goalType: 'practice',
    timeBlock: 'morning', full: 'Full walk', small: 'Short walk', small2: '',
    scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
  },
  {
    id: 'h-weekly', name: 'Call a friend', icon: 'phone', color: 'sage', goalType: 'practice',
    timeBlock: 'morning', full: '', small: '', small2: '',
    scheduleType: 'weekly', weekdays: [], weeklyTarget: 3, paused: false,
  },
];
const people = [{
  id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend', frequency: 7,
  lastContact: '2026-09-14',
  interactions: [{id: 'i-1', date: '2026-09-14', method: 'Text', note: 'Quick hello', countsAsSeen: false, createdAt: 't', updatedAt: 't'}],
  notes: [{id: 'n-1', text: 'Loves hiking', createdAt: 't', updatedAt: 't'}],
}];
const exportState = seedState({
  habits, people,
  logs: {
    '2026-09-14': {'h-daily': {status: 'done', isReturn: false, timeBlock: 'morning', note: 'felt great', createdAt: 't', updatedAt: 't'}, 'h-weekly': 'counted'},
    '2026-09-16': {'h-daily': {status: 'counted', isReturn: false, timeBlock: 'morning', note: '', createdAt: 't', updatedAt: 't'}},
  },
  dayNotes: {'2026-09-14': 'Good day'},
});

test('export/import round trip preserves habits, logs, people, and notes with no data loss', async ({page}) => {
  await boot(page, {view: 'settingsView', at: AT, state: exportState});

  // Capture the real exported Blob without triggering an actual browser download.
  const exported = await page.evaluate(() => new Promise(resolve => {
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = blob => {
      blob.text().then(resolve);
      return originalCreate.call(URL, blob);
    };
    document.getElementById('exportDataBtn').click();
  }));
  const backup = JSON.parse(exported);
  expect(backup.data.habits).toHaveLength(2);
  expect(backup.data.people).toHaveLength(1);

  // Reset to a clean state, then import the captured backup through the real file-input path.
  await page.evaluate(() => {
    state = {habits: [], logs: {}, people: [], dayNotes: {}, settings: defaultState.settings};
    saveState();
  });
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
  expect(after.habits.map(h => h.id).sort()).toEqual(['h-daily', 'h-weekly']);
  expect(after.habits.find(h => h.id === 'h-weekly').weeklyTarget).toBe(3);
  expect(after.habits.find(h => h.id === 'h-weekly').scheduleType).toBe('weekly');
  expect(after.logs['2026-09-14']['h-daily'].note).toBe('felt great');
  expect(after.logs['2026-09-14']['h-weekly']).toBe('counted');
  expect(after.people[0].name).toBe('Sam');
  expect(after.people[0].interactions).toHaveLength(1);
  expect(after.people[0].notes[0].text).toBe('Loves hiking');
  expect(after.dayNotes['2026-09-14']).toBe('Good day');
});

test('a malformed import file is rejected and leaves existing state untouched', async ({page}) => {
  await boot(page, {view: 'settingsView', at: AT, state: exportState});
  const before = await readState(page);

  await page.evaluate(() => {
    const file = new File(['{"not":"a backup"}'], 'bad.json', {type: 'application/json'});
    const dt = new DataTransfer();
    dt.items.add(file);
    const input = document.getElementById('importDataFile');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', {bubbles: true}));
  });
  await expect(page.locator('#toastMessage')).toContainText('not a valid Workbench backup');

  const after = await readState(page);
  expect(after).toEqual(before);
});

test('a backfilled entry survives a reload', async ({page}) => {
  await boot(page, {view: 'habitLogView', at: AT, state: seedState({habits: [habits[0]], logs: {}})});
  await page.evaluate(() => saveHabitLogEntry('h-daily', {date: '2026-09-15', timeBlock: 'morning', status: 'done', note: 'backfilled'}));
  await page.reload();
  const after = await readState(page);
  expect(after.logs['2026-09-15']['h-daily'].status).toBe('done');
  expect(after.logs['2026-09-15']['h-daily'].note).toBe('backfilled');
});

test.describe('My Circle hero overlap (regression: styles.css @layer overrides)', () => {
  test('the eyebrow copy never intersects the action icon row at 430px', async ({page}) => {
    await page.setViewportSize({width: 430, height: 932});
    await boot(page, {view: 'circleView', at: AT, state: seedState({people})});

    const {intersects, overflowsPage} = await page.evaluate(() => {
      // Measure the eyebrow TEXT itself, not the whole .tab-hero-copy box — that box's own
      // padding-top is what pushes the text clear of the icons, so measuring the box
      // (which includes that blank padding as part of its rect) gives a false positive.
      const eyebrow = document.querySelector('#circleView .tab-hero--circle .tab-hero-copy .eyebrow');
      const search = document.getElementById('circleSearchBtn');
      const e = eyebrow.getBoundingClientRect(), s = search.getBoundingClientRect();
      const intersects = !(e.right <= s.left || e.left >= s.right || e.bottom <= s.top || e.top >= s.bottom);
      return {intersects, overflowsPage: document.documentElement.scrollWidth > window.innerWidth};
    });
    expect(intersects).toBe(false);
    expect(overflowsPage).toBe(false);
  });
});

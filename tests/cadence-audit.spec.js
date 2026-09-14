// @ts-check
import { test, expect } from '@playwright/test';

// Audit: My Circle cadence calculation.
// Next Due Date = Last Interaction + Frequency. A person belongs in "People to check in
// with" iff today >= Next Due Date AND frequency isn't "No Schedule" (0).

const STORAGE_KEY = 'return_habit_tracker_v1';
const VIEW_KEY = 'personal_workbench_last_view';
const NOW = '2026-09-14T10:00:00'; // fixed "today" for every test

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

function isoDaysAgo(days) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function person(id, name, frequency, daysAgo) {
  const date = daysAgo === null ? null : isoDaysAgo(daysAgo);
  return {
    id, name, frequency, relation: '', color: 'rose', icon: 'person',
    lastContact: date,
    interactions: date ? [{ id: id + '-i1', date, method: 'Text', note: '', countsAsSeen: false, createdAt: date, updatedAt: date }] : [],
    notes: [],
  };
}

async function boot(page, { state = seedState(), view = 'circleView' } = {}) {
  await page.clock.setFixedTime(new Date(NOW));
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
  // Let it settle before any locator call that has no built-in retry across a navigation —
  // this is the source of this file's known "Execution context was destroyed" flake.
  await page.waitForTimeout(400);
  await expect(page.locator('.view.active')).toHaveAttribute('id', view);
}

test.describe('My Circle cadence calculation', () => {
  test('Weekly: due exactly today (7 days since last contact) appears as hero', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Alice', 7, 7)] }) });
    await expect(page.locator('.circle-hero-name')).toHaveText('Alice');
    await expect(page.locator('.circle-hero-meta')).toContainText('7 days ago');
  });

  test('Weekly: not yet due (5 days since last contact) does NOT appear anywhere in checkin', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Bob', 7, 5)] }) });
    // Nobody is due -> calm "everyone's caught up" hero state, no hero card for Bob.
    await expect(page.locator('.circle-hero-name')).toHaveCount(0);
    await expect(page.locator('.circle-hero-card')).toHaveCount(0);
    await expect(page.locator('#circleCheckinList .circle-row')).toHaveCount(0);
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
  });

  test('Weekly: overdue (10 days since last contact)', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Carol', 7, 10)] }) });
    await expect(page.locator('.circle-hero-name')).toHaveText('Carol');
    await expect(page.locator('.circle-hero-meta')).toContainText('10 days ago');
  });

  test('Every 2 Weeks: due today (14 days)', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Dana', 14, 14)] }) });
    await expect(page.locator('.circle-hero-name')).toHaveText('Dana');
  });

  test('Every 2 Weeks: not yet due (11 days of 14) excluded from checkin list', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Erin', 14, 11)] }) });
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
    await expect(page.locator('#circleCheckinList .circle-row')).toHaveCount(0);
  });

  test('Monthly: due today (30 days)', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Frank', 30, 30)] }) });
    await expect(page.locator('.circle-hero-name')).toHaveText('Frank');
  });

  test('Monthly: not due (10 days of 30) excluded', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Grace', 30, 10)] }) });
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
  });

  test('No Schedule (frequency=0): never appears even when long overdue', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Henry', 0, 400)] }) });
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
    await expect(page.locator('#circleCheckinList .circle-row')).toHaveCount(0);
  });

  test('Newly added person with no interactions ever (frequency enabled): counts as due', async ({ page }) => {
    const p = { id: 'p1', name: 'Iris', frequency: 7, relation: '', color: 'rose', icon: 'person', lastContact: null, interactions: [], notes: [] };
    await boot(page, { state: seedState({ people: [p] }) });
    await expect(page.locator('.circle-hero-name')).toHaveText('Iris');
    await expect(page.locator('.circle-hero-meta')).toContainText('Start anytime');
  });

  test('New person with No Schedule: never due, no nagging', async ({ page }) => {
    const p = { id: 'p1', name: 'Jack', frequency: 0, relation: '', color: 'rose', icon: 'person', lastContact: null, interactions: [], notes: [] };
    await boot(page, { state: seedState({ people: [p] }) });
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
  });

  test('Interaction logged today: never appears as due', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Kim', 7, 0)] }) });
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
  });

  test('Multiple overdue contacts: hero is most overdue, rest ranked correctly, none skipped', async ({ page }) => {
    const people = [
      person('p1', 'Overdue7', 7, 10),   // 3 days overdue
      person('p2', 'Overdue14', 14, 20), // 6 days overdue
      person('p3', 'NotDue', 14, 5),     // not due at all
      person('p4', 'DueToday', 30, 30),  // exactly due
    ];
    await boot(page, { state: seedState({ people }) });
    // Most overdue (Overdue14, 6 days over) should be hero.
    await expect(page.locator('.circle-hero-name')).toHaveText('Overdue14');
    const rows = await page.locator('#circleCheckinList .circle-row-name').allInnerTexts();
    // Exactly the other 2 due people appear, NotDue is excluded entirely.
    expect(rows.sort()).toEqual(['DueToday', 'Overdue7'].sort());
  });

  test('Logging a new interaction removes the person from the due list immediately (no reload)', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Liam', 7, 10)] }) });
    await expect(page.locator('.circle-hero-name')).toHaveText('Liam');

    // Log an interaction for today via the hero's primary action.
    await page.locator('.circle-hero-btn.primary').click();
    await expect(page.locator('#contactModal')).toHaveClass(/show/);
    await page.locator('#saveContactBtn').click();
    await expect(page.locator('#contactModal')).not.toHaveClass(/show/);

    // Liam should now be gone from both hero and checkin list, without a reload.
    await expect(page.locator('#circleHeroCard')).toContainText("caught up");
    await expect(page.locator('#circleCheckinList .circle-row')).toHaveCount(0);
  });

  test('Home "Do this next" nudge stays in sync with My Circle due status', async ({ page }) => {
    // A person not yet due should never trigger Home's person nudge.
    await boot(page, { state: seedState({ people: [person('p1', 'Maya', 14, 5)] }) }, );
    await page.goto('/index.html'); // re-nav is fine, seed only applies once
    await page.locator('.tabbar .tab[data-view="homeView"]').click();
    await expect(page.locator('#homeNow')).not.toContainText('Maya');
  });

  test('Home nudge appears once person becomes due, referencing the same person as Circle hero', async ({ page }) => {
    await boot(page, { state: seedState({ people: [person('p1', 'Noah', 7, 10)] }), view: 'homeView' });
    await expect(page.locator('#homeNow')).toContainText('Noah');
    await page.locator('.tabbar .tab[data-view="circleView"]').click();
    await expect(page.locator('.circle-hero-name')).toHaveText('Noah');
  });
});

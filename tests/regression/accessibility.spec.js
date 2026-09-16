// @ts-check
// Lightweight accessibility smoke checks on the primary screens — not a full a11y suite
// (see CLAUDE.md "Accessibility principles"), just the cheap invariants most likely to
// silently regress: icon-only buttons losing their aria-label, duplicate ids appearing
// from a copy-pasted template, and My People rail items losing their accessible text.
import { test, expect, boot, seedState, PRIMARY_TABS } from './helpers.js';

const habit = {
  id: 'h-1', name: 'Morning walk', icon: 'leaf', color: 'sage', goalType: 'practice',
  timeBlock: 'morning', full: 'Full walk', small: 'Short walk', small2: '',
  scheduleType: 'daily', weekdays: [], weeklyTarget: 1, paused: false,
};
const person = {id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend', frequency: 7, lastContact: null, interactions: [], notes: []};

test('icon-only buttons on every primary tab have an accessible name', async ({page}) => {
  await boot(page, {view: 'homeView', state: seedState({habits: [habit], people: [person]})});
  for (const view of PRIMARY_TABS) {
    await page.locator(`.tabbar .tab[data-view="${view}"]`).click();
    const unlabeled = await page.evaluate(() => {
      const icons = [...document.querySelectorAll('.view.active .icon-btn, .view.active .checklist-overflow, .view.active .do-next-overflow')];
      return icons
        .filter(el => el.offsetParent !== null)
        .filter(el => !el.getAttribute('aria-label')?.trim() && !el.textContent?.trim())
        .map(el => el.outerHTML.slice(0, 80));
    });
    expect(unlabeled, `${view} has icon-only buttons with no accessible name`).toEqual([]);
  }
});

test('no duplicate element ids on the primary tabs', async ({page}) => {
  await boot(page, {view: 'homeView', state: seedState({habits: [habit], people: [person]})});
  for (const view of PRIMARY_TABS) {
    await page.locator(`.tabbar .tab[data-view="${view}"]`).click();
    const dupes = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
      const seen = new Set(), dup = new Set();
      for (const id of ids) { if (seen.has(id)) dup.add(id); seen.add(id); }
      return [...dup];
    });
    expect(dupes, `${view} has duplicate ids`).toEqual([]);
  }
});

test('My People rail items expose the person\'s name as accessible text', async ({page}) => {
  await boot(page, {view: 'circleView', state: seedState({people: [person]})});
  const item = page.locator('.circle-people-item', {hasText: 'Sam'});
  await expect(item).toHaveAccessibleName(/Sam/);
});

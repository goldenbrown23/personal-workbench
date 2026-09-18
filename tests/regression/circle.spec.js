// @ts-check
// Regression guard for My Circle's last-talked / last-in-person derivation in the People
// rail — including the legacy interaction format (countsAsSeen===undefined, method
// lowercase-matched) that pre-dates the countsAsSeen field. See circle.js's inPersonInteractions
// filter and the circle-people-item template.
import { test, expect, boot, seedState, readState } from './helpers.js';

const AT = '2026-09-16T10:00:00';

function person(overrides = {}) {
  return {
    id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend',
    frequency: 7, lastContact: null, interactions: [], notes: [],
    ...overrides,
  };
}

test('People rail shows relationship, last talked, and last in-person from the latest qualifying interaction', async ({page}) => {
  const interactions = [
    {id: 'i-1', date: '2026-09-10', method: 'In person', note: '', countsAsSeen: true, createdAt: 't1', updatedAt: 't1'},
    {id: 'i-2', date: '2026-09-14', method: 'Text', note: '', countsAsSeen: false, createdAt: 't2', updatedAt: 't2'},
  ];
  await boot(page, {view: 'circleView', at: AT, state: seedState({
    people: [person({relation: 'friend', lastContact: '2026-09-14', interactions})],
  })});

  const item = page.locator('.circle-people-item', {hasText: 'Sam'});
  await expect(item.locator('.circle-people-name')).toHaveText('Sam');
  await expect(item.locator('.circle-people-relation')).toContainText('Friend');
  // Last talked reflects the newest interaction of any kind — 09-14 is 2 days before the
  // frozen clock (09-16), not the 09-10 in-person visit.
  const talkedTitle = await item.locator('.circle-people-meta-item').first().getAttribute('title');
  expect(talkedTitle).toMatch(/2 days ago/i);
  // Last in-person reflects the newest interaction that actually counts as seen (09-10).
  const seenTitle = await item.locator('.circle-people-meta-item').nth(1).getAttribute('title');
  expect(seenTitle).not.toMatch(/no in-person/i);
  expect(seenTitle).toMatch(/6 days ago/i);

  await page.evaluate(() => {
    const p = state.people[0];
    p.interactions.push({id: 'i-3', date: '2026-09-16', method: 'In person', note: '', countsAsSeen: true, createdAt: 't3', updatedAt: 't3'});
    syncLastContact(p);
    saveState();
    renderCircle();
  });

  const after = await readState(page);
  expect(after.people[0].lastContact).toBe('2026-09-16');
  const seenTitleAfter = await item.locator('.circle-people-meta-item').nth(1).getAttribute('title');
  expect(seenTitleAfter).toMatch(/today/i);
});

test('a legacy interaction with no countsAsSeen field is still detected as in-person', async ({page}) => {
  // Pre-dates the countsAsSeen split: circle.js falls back to method.toLowerCase()==="in person".
  const legacyInteraction = {id: 'i-legacy', date: '2026-09-12', method: 'In Person', note: '', createdAt: 't', updatedAt: 't'};
  await boot(page, {view: 'circleView', at: AT, state: seedState({
    people: [person({lastContact: '2026-09-12', interactions: [legacyInteraction]})],
  })});

  const seenMeta = page.locator('.circle-people-item', {hasText: 'Sam'}).locator('.circle-people-meta-item').nth(1);
  const title = await seenMeta.getAttribute('title');
  expect(title).not.toMatch(/no in-person/i);
});

// My People card hierarchy/recency refinement: last-talked is the primary (bolder) value
// with the message icon; last-in-person is plain "in person <time>" text, no icon to
// decode; either is simply omitted — never a "—" placeholder or a dangling "·" — when
// nothing's been logged yet.
test.describe('My People: contact-recency hierarchy', () => {
  test('last-talked renders as the primary value and last-in-person as plain "in person <time>" text', async ({page}) => {
    const interactions = [
      {id: 'i-1', date: '2026-09-10', method: 'In person', note: '', countsAsSeen: true, createdAt: 't1', updatedAt: 't1'},
      {id: 'i-2', date: '2026-09-14', method: 'Text', note: '', countsAsSeen: false, createdAt: 't2', updatedAt: 't2'},
    ];
    await boot(page, {view: 'circleView', at: AT, state: seedState({
      people: [person({relation: 'friend', lastContact: '2026-09-14', interactions})],
    })});

    const item = page.locator('.circle-people-item', {hasText: 'Sam'});
    const primary = item.locator('.circle-people-meta-primary .circle-people-meta-value');
    await expect(primary).toHaveText('2d');
    const secondary = item.locator('.circle-people-meta-secondary');
    await expect(secondary).toHaveText('in person 6d');
    // No second icon for the in-person segment — it's plain human-readable text, not
    // another icon to decode.
    await expect(secondary.locator('svg')).toHaveCount(0);
    // Relationship info is untouched by the metadata refinement.
    await expect(item.locator('.circle-people-relation')).toContainText('Friend');
  });

  test('missing last-in-person data is simply omitted, with no "—" placeholder and no dangling separator', async ({page}) => {
    const interactions = [
      {id: 'i-1', date: '2026-09-14', method: 'Text', note: '', countsAsSeen: false, createdAt: 't2', updatedAt: 't2'},
    ];
    await boot(page, {view: 'circleView', at: AT, state: seedState({
      people: [person({relation: 'friend', lastContact: '2026-09-14', interactions})],
    })});

    const item = page.locator('.circle-people-item', {hasText: 'Sam'});
    await expect(item.locator('.circle-people-meta-primary .circle-people-meta-value')).toHaveText('2d');
    await expect(item.locator('.circle-people-meta-secondary')).toHaveCount(0);
    await expect(item.locator('.circle-people-meta-sep')).toHaveCount(0);
    await expect(item.locator('.circle-people-meta')).not.toContainText('—');
  });

  test('a brand-new person with no logged contact shows no meta row at all (no placeholders)', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT, state: seedState({people: [person()]})});

    const item = page.locator('.circle-people-item', {hasText: 'Sam'});
    await expect(item.locator('.circle-people-name')).toHaveText('Sam');
    await expect(item.locator('.circle-people-meta')).toHaveCount(0);
    await expect(item).not.toContainText('—');
  });

  test('My People row stays readable at 390, 402, and 430px without awkward wrapping', async ({page}) => {
    const interactions = [
      {id: 'i-1', date: '2026-08-16', method: 'In person', note: '', countsAsSeen: true, createdAt: 't1', updatedAt: 't1'},
      {id: 'i-2', date: '2026-09-14', method: 'Text', note: '', countsAsSeen: false, createdAt: 't2', updatedAt: 't2'},
    ];
    await boot(page, {view: 'circleView', at: AT, state: seedState({
      people: [person({name: 'Alexandria', relation: 'close-friend', lastContact: '2026-09-14', interactions})],
    })});

    for (const width of [390, 402, 430]) {
      await page.setViewportSize({width, height: 900});
      const item = page.locator('.circle-people-item', {hasText: 'Alexandria'});
      await expect(item).toBeVisible();
      const rowBox = await page.locator('.circle-people-row').boundingBox();
      const itemBox = await item.boundingBox();
      // The card itself must not balloon to fit the longer "in person <time>" text — the
      // row keeps its usual fixed-width, horizontally-scrolling item shape.
      expect(itemBox.width).toBeLessThanOrEqual(100);
      // No horizontal overflow of the row's own container out past the viewport.
      expect(rowBox.x + rowBox.width).toBeLessThanOrEqual(width + 1);
    }
  });
});

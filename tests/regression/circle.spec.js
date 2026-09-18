// @ts-check
// Regression guard for My Circle's last-talked / last-in-person derivation in the People
// rail — including the legacy interaction format (countsAsSeen===undefined, method
// lowercase-matched) that pre-dates the countsAsSeen field. See circle.js's inPersonInteractions
// filter and the circle-people-item template.
import path from 'path';
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

// My People card redesign: each person is a small, bounded portrait card (avatar, name,
// relationship, then contact recency pinned toward the bottom) rather than a free-floating
// avatar with metadata underneath. Last-talked is the primary (bolder) value with the
// message icon; last-in-person is plain "seen <time>" text sharing the same line, no
// second icon to decode. Either segment is simply omitted — never a "—" placeholder or a
// dangling "·" — when nothing's been logged yet, and the card's fixed height keeps every
// person's card the same size regardless of how much recency data they have.
test.describe('My People: person-card redesign', () => {
  test('last-talked renders as the primary value and last-in-person as "seen <time>" on the same line', async ({page}) => {
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
    await expect(secondary).toHaveText('seen 6d');
    // No second icon for the in-person segment — it's plain human-readable text, not
    // another icon to decode.
    await expect(secondary.locator('svg')).toHaveCount(0);
    // Relationship info is untouched by the card redesign.
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

  test('a person with no recency data has the same card height as one with a full meta row', async ({page}) => {
    const interactions = [
      {id: 'i-1', date: '2026-08-16', method: 'In person', note: '', countsAsSeen: true, createdAt: 't1', updatedAt: 't1'},
      {id: 'i-2', date: '2026-09-14', method: 'Text', note: '', countsAsSeen: false, createdAt: 't2', updatedAt: 't2'},
    ];
    await boot(page, {view: 'circleView', at: AT, state: seedState({
      people: [
        person({id: 'p-1', name: 'Alexandria Park', relation: 'close-friend', lastContact: '2026-09-14', interactions}),
        person({id: 'p-2', name: 'Sam', relation: 'friend'}),
      ],
    })});

    const fullCard = page.locator('.circle-people-item', {hasText: 'Alexandria'});
    const bareCard = page.locator('.circle-people-item', {hasText: 'Sam'});
    const fullBox = await fullCard.boundingBox();
    const bareBox = await bareCard.boundingBox();
    expect(bareBox.height).toBeCloseTo(fullBox.height, 0);
  });

  test('long names wrap up to two lines without breaking the card layout', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT, state: seedState({
      people: [person({name: 'Alexandria Park-Whitmore', relation: 'friend'})],
    })});
    const item = page.locator('.circle-people-item', {hasText: 'Alexandria'});
    await expect(item).toBeVisible();
    const nameBox = await item.locator('.circle-people-name').boundingBox();
    // Roughly two lines of 14px/1.25 text, not one runaway line or an unbounded wrap.
    expect(nameBox.height).toBeLessThan(50);
  });

  test('photo and icon-fallback cards keep the same card and avatar dimensions', async ({page}) => {
    const TEST_PHOTO = path.join(process.cwd(), 'tests', 'regression', 'fixtures', 'test-photo.png');
    await boot(page, {view: 'circleView', at: AT, state: seedState({
      people: [person({id: 'p-1', name: 'Sam'})],
    })});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Riley');
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await page.locator('#personPhotoInput').setInputFiles(TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();
    await page.locator('#cropConfirmBtn').click();
    await page.locator('#applyVisualPicker').click();
    await page.locator('#savePersonBtn').click();
    await expect(page.locator('#personModal')).not.toHaveClass(/show/);

    const iconCard = page.locator('.circle-people-item', {hasText: 'Sam'});
    const photoCard = page.locator('.circle-people-item', {hasText: 'Riley'});
    const iconBox = await iconCard.boundingBox();
    const photoBox = await photoCard.boundingBox();
    expect(photoBox.width).toBeCloseTo(iconBox.width, 0);
    expect(photoBox.height).toBeCloseTo(iconBox.height, 0);
    const iconAvatarBox = await iconCard.locator('.circle-people-avatar').boundingBox();
    const photoAvatarBox = await photoCard.locator('.circle-people-avatar').boundingBox();
    expect(photoAvatarBox.width).toBeCloseTo(iconAvatarBox.width, 0);
    expect(photoAvatarBox.height).toBeCloseTo(iconAvatarBox.height, 0);
  });

  test('the carousel scrolls horizontally without the page itself overflowing, at 390/402/430px', async ({page}) => {
    const people = Array.from({length: 8}, (_, i) => person({
      id: `p-${i}`, name: `Person ${i}`, relation: 'friend',
    }));
    await boot(page, {view: 'circleView', at: AT, state: seedState({people})});

    for (const width of [390, 402, 430]) {
      await page.setViewportSize({width, height: 900});
      // No page-level horizontal overflow — only the row itself scrolls.
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width + 1);

      const row = page.locator('.circle-people-row');
      const before = await row.evaluate(el => el.scrollLeft);
      await row.evaluate(el => { el.scrollLeft += 200; });
      const after = await row.evaluate(el => el.scrollLeft);
      expect(after).toBeGreaterThan(before);
    }
  });
});

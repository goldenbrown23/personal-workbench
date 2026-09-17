// @ts-check
// Regression guard for optional My Circle profile photos (src/js/photos.js, and the
// photo-aware parts of state.js/circle.js/settings.js). The feature layers a photo on top
// of the existing icon+color system rather than replacing it: icon+color always stays the
// fallback, and a photo is stored in IndexedDB (never inline in the localStorage state
// blob) with only a photoId reference on the person record.
import path from 'path';
import { test, expect, boot, seedState, readState } from './helpers.js';

const TEST_PHOTO = path.join(process.cwd(), 'tests', 'regression', 'fixtures', 'test-photo.png');
const AT = '2026-09-17T10:00:00';

const iconOnlyPerson = {
  id: 'p-1', name: 'Sam', icon: 'person', color: 'rose', relation: 'friend', frequency: 7,
  lastContact: null, interactions: [], notes: [],
};

// Picking a file opens the crop stage (drag-to-reposition + zoom, src/js/state.js) rather
// than staging the photo directly — "Use photo" there is what actually crops/compresses it
// and returns to the normal preview.
async function pickAndCropPhoto(page, file = TEST_PHOTO) {
  await page.locator('#personPhotoInput').setInputFiles(file);
  await expect(page.locator('#cropStage')).toBeVisible();
  await page.locator('#cropConfirmBtn').click();
  await expect(page.locator('#cropStage')).toBeHidden();
  await expect(page.locator('#visualPhotoPreviewImg')).toHaveClass(/loaded/);
}

async function addPersonWithPhoto(page, name) {
  await page.locator('#addPersonBtn').click();
  await page.locator('#personName').fill(name);
  await page.locator('#choosePersonVisual').click();
  await page.locator('#visualModePhoto').click();
  await pickAndCropPhoto(page);
  await page.locator('#applyVisualPicker').click();
  await page.locator('#savePersonBtn').click();
  // savePersonBtn's handler awaits the IndexedDB write before closing the modal — wait for
  // that instead of reading state immediately after the click.
  await expect(page.locator('#personModal')).not.toHaveClass(/show/);
}

test.describe('My Circle: photo cropping', () => {
  test('choosing a photo opens a crop stage with zoom, and confirming produces a usable photo', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Blake');
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await page.locator('#personPhotoInput').setInputFiles(TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();
    await expect(page.locator('#visualPhotoPreviewRow')).toBeHidden();
    await expect(page.locator('#visualPickerMainActions')).toBeHidden();

    // Drag to reposition, then zoom in — the crop must still produce a valid image.
    const frame = page.locator('#cropFrame');
    const box = await frame.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10, {steps: 5});
    await page.mouse.up();
    await page.locator('#cropZoom').fill('2');

    await page.locator('#cropConfirmBtn').click();
    await expect(page.locator('#cropStage')).toBeHidden();
    await expect(page.locator('#visualPhotoPreviewRow')).toBeVisible();
    await expect(page.locator('#visualPickerMainActions')).toBeVisible();
    await expect(page.locator('#visualPhotoPreviewImg')).toHaveClass(/loaded/);

    await page.locator('#applyVisualPicker').click();
    await page.locator('#savePersonBtn').click();
    await expect(page.locator('#personModal')).not.toHaveClass(/show/);
    const after = await readState(page);
    expect(after.people[0].photoId).toBeTruthy();
    await expect(page.locator('#circlePeopleList .circle-people-avatar img.avatar-photo-img')).toHaveClass(/loaded/);
  });

  test('cancelling the crop stage discards the pick and leaves the previous photo/state untouched', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await addPersonWithPhoto(page, 'Drew');
    const before = await readState(page);

    await page.locator('#circlePeopleList .circle-people-item').click();
    await page.locator('#editFromDetailBtn').click();
    await page.locator('#choosePersonVisual').click();
    await page.locator('#personPhotoInput').setInputFiles(TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();
    await page.locator('#cropCancelBtn').click();
    await expect(page.locator('#cropStage')).toBeHidden();
    // The existing photo (from before this crop attempt) is still what's shown.
    await expect(page.locator('#visualPhotoPreviewImg')).toHaveClass(/loaded/);

    await page.locator('#applyVisualPicker').click();
    await page.locator('#savePersonBtn').click();
    await expect(page.locator('#personModal')).not.toHaveClass(/show/);
    const after = await readState(page);
    expect(after.people[0].photoId).toBe(before.people[0].photoId);
  });
});

test.describe('My Circle: optional profile photos', () => {
  test('1. adding a person with icon only never sets a photoId', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Jordan');
    await page.locator('#savePersonBtn').click();
    const after = await readState(page);
    expect(after.people[0].photoId).toBeNull();
    expect(after.people[0].icon).toBe('person');
  });

  test('2&6&7. adding a person with a photo persists it through reload', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await addPersonWithPhoto(page, 'Riley');
    const after = await readState(page);
    expect(after.people[0].photoId).toBeTruthy();

    const avatarImg = page.locator('#circlePeopleList .circle-people-avatar img.avatar-photo-img');
    await expect(avatarImg).toHaveClass(/loaded/);
    await expect(avatarImg).toHaveAttribute('src', /^blob:/);

    await page.reload();
    await expect(page.locator('#circlePeopleList .circle-people-avatar img.avatar-photo-img')).toHaveClass(/loaded/);
  });

  test('3&4. editing an existing person to add, then change, a photo works and the fallback icon/color survive underneath', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT, state: seedState({people: [iconOnlyPerson]})});
    await page.locator('#circlePeopleList .circle-people-item').click();
    await page.locator('#editFromDetailBtn').click();
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await pickAndCropPhoto(page);
    await page.locator('#applyVisualPicker').click();
    await page.locator('#savePersonBtn').click();
    await expect(page.locator('#personModal')).not.toHaveClass(/show/);
    let after = await readState(page);
    const firstPhotoId = after.people[0].photoId;
    expect(firstPhotoId).toBeTruthy();
    expect(after.people[0].icon).toBe('person'); // fallback config untouched by adding a photo

    // Change the photo again — same person, must not accumulate orphaned IndexedDB blobs.
    await page.locator('#circlePeopleList .circle-people-item').click();
    await page.locator('#editFromDetailBtn').click();
    await page.locator('#choosePersonVisual').click();
    await pickAndCropPhoto(page);
    await page.locator('#applyVisualPicker').click();
    await page.locator('#savePersonBtn').click();
    await expect(page.locator('#personModal')).not.toHaveClass(/show/);
    after = await readState(page);
    expect(after.people[0].photoId).toBeTruthy();
  });

  test('5. removing a photo immediately falls back to icon + color', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await addPersonWithPhoto(page, 'Avery');
    const before = await readState(page);
    expect(before.people[0].photoId).toBeTruthy();

    await page.locator('#circlePeopleList .circle-people-item').click();
    await page.locator('#editFromDetailBtn').click();
    await page.locator('#choosePersonVisual').click();
    await page.locator('#removePhotoBtn').click();
    await page.locator('#applyVisualPicker').click();
    await page.locator('#savePersonBtn').click();
    await expect(page.locator('#personModal')).not.toHaveClass(/show/);

    const after = await readState(page);
    expect(after.people[0].photoId).toBeNull();
    await expect(page.locator('#circlePeopleList .circle-people-avatar')).not.toHaveClass(/has-photo/);
    // The deleted photo must actually be gone from IndexedDB, not just unreferenced.
    const stillInDB = await page.evaluate(id => getPhoto(id), before.people[0].photoId);
    expect(stillInDB).toBeNull();
  });

  test('8. deleting a person deletes their photo from IndexedDB', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await addPersonWithPhoto(page, 'Casey');
    const before = await readState(page);
    const photoId = before.people[0].photoId;
    expect(photoId).toBeTruthy();

    await page.locator('#circlePeopleList .circle-people-item').click();
    await page.locator('#editFromDetailBtn').click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#deletePersonBtn').click();

    const after = await readState(page);
    expect(after.people).toHaveLength(0);
    const stillInDB = await page.evaluate(id => getPhoto(id), photoId);
    expect(stillInDB).toBeNull();
  });

  test('9&12. a person with no photoId (pre-feature data) renders the icon fallback with no crash', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT, state: seedState({people: [iconOnlyPerson]})});
    const avatar = page.locator('#circlePeopleList .circle-people-avatar');
    await expect(avatar).toBeVisible();
    await expect(avatar).not.toHaveClass(/has-photo/);
  });

  test('12. a photoId pointing at a missing/corrupt IndexedDB entry falls back to icon gracefully', async ({page}) => {
    await boot(page, {
      view: 'circleView', at: AT,
      state: seedState({people: [{...iconOnlyPerson, photoId: 'ph-missing'}]}),
    });
    const avatar = page.locator('#circlePeopleList .circle-people-avatar');
    await expect(avatar).toBeVisible();
    // No img.loaded ever appears since getPhoto() resolves null for a missing id.
    await expect(avatar.locator('img.avatar-photo-img.loaded')).toHaveCount(0);
  });

  test('13. multiple people can have different photos at once', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await addPersonWithPhoto(page, 'Morgan');
    // Advance the fixed clock so the second person's Date.now()-based id/photoId can't
    // collide with the first's — this test is about two DISTINCT photos coexisting.
    await page.clock.setFixedTime(new Date('2026-09-17T10:00:01'));
    await addPersonWithPhoto(page, 'Taylor');
    const after = await readState(page);
    expect(after.people).toHaveLength(2);
    expect(after.people[0].photoId).toBeTruthy();
    expect(after.people[1].photoId).toBeTruthy();
    expect(after.people[0].photoId).not.toBe(after.people[1].photoId);
    await expect(page.locator('#circlePeopleList .circle-people-avatar.has-photo')).toHaveCount(2);
  });

  test('14. changing icon/color while a photo exists does not remove the photo', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await addPersonWithPhoto(page, 'Jamie');
    const before = await readState(page);
    expect(before.people[0].photoId).toBeTruthy();

    await page.locator('#circlePeopleList .circle-people-item').click();
    await page.locator('#editFromDetailBtn').click();
    await page.locator('#choosePersonVisual').click();
    // Still in Photo mode (default when a photo exists) — just re-pick a tone.
    await page.locator('#visualToneRow [data-tone-choice="blue"]').click();
    await page.locator('#applyVisualPicker').click();
    await page.locator('#savePersonBtn').click();
    await expect(page.locator('#personModal')).not.toHaveClass(/show/);

    const after = await readState(page);
    expect(after.people[0].photoId).toBe(before.people[0].photoId);
    expect(after.people[0].color).toBe('blue');
  });

  test('10&11. backup export/import round trip preserves a photo, and an old backup with no photos object still imports', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await addPersonWithPhoto(page, 'Quinn');
    const seeded = await readState(page);
    const photoId = seeded.people[0].photoId;

    const exported = await page.evaluate(() => new Promise(resolve => {
      const originalCreate = URL.createObjectURL;
      URL.createObjectURL = blob => { blob.text().then(resolve); return originalCreate.call(URL, blob); };
      document.getElementById('exportDataBtn').click();
    }));
    const backup = JSON.parse(exported);
    expect(backup.photos[photoId]).toMatch(/^data:image\//);

    await page.evaluate(() => { state = {habits: [], logs: {}, people: [], dayNotes: {}, settings: defaultState.settings}; saveState(); });
    await page.evaluate(json => {
      const file = new File([json], 'backup.json', {type: 'application/json'});
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.getElementById('importDataFile');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }, exported);
    await expect.poll(async () => (await readState(page)).people.length).toBe(1);

    await page.reload();
    const avatarImg = page.locator('#circlePeopleList .circle-people-avatar img.avatar-photo-img');
    await expect(avatarImg).toHaveClass(/loaded/);

    // Old-format backup: no top-level `photos` key at all.
    const oldBackup = JSON.stringify({app: 'Personal Workbench', exportedAt: 't', version: 6, data: seededOldPeopleState()});
    function seededOldPeopleState() {
      return {habits: [], logs: {}, people: [iconOnlyPerson], dayNotes: {}, settings: seedState().settings};
    }
    await page.evaluate(json => {
      const file = new File([json], 'old-backup.json', {type: 'application/json'});
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.getElementById('importDataFile');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }, oldBackup);
    await expect.poll(async () => (await readState(page)).people[0]?.name).toBe('Sam');
    expect((await readState(page)).people[0].photoId).toBeNull();
  });
});

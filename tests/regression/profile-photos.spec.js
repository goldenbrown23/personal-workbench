// @ts-check
// Regression guard for optional My Circle profile photos (src/js/photos.js, and the
// photo-aware parts of state.js/circle.js/settings.js). The feature layers a photo on top
// of the existing icon+color system rather than replacing it: icon+color always stays the
// fallback, and a photo is stored in IndexedDB (never inline in the localStorage state
// blob) with only a photoId reference on the person record.
import path from 'path';
import { test, expect, boot, seedState, readState } from './helpers.js';

const TEST_PHOTO = path.join(process.cwd(), 'tests', 'regression', 'fixtures', 'test-photo.png');
// A real (non-1x1) fixture, needed for crop tests that check the image can actually be
// dragged/pinched within its bounds — a 1x1 source has zero slack in either axis at the
// minimum fill scale, so any translate/zoom test against it would trivially clamp to a
// no-op regardless of whether the drag/pinch math is correct.
const WIDE_TEST_PHOTO = path.join(process.cwd(), 'tests', 'regression', 'fixtures', 'test-photo-wide.png');
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

// Dispatches a synthetic two-pointer pinch on the crop frame, mirroring how helpers.js's
// swipe() builds raw touch events for the tab-swipe gesture — Playwright's built-in touch
// API has no pinch primitive, so this drives real PointerEvents (pointerType:'touch')
// directly, which is what src/js/state.js's crop-frame listeners actually consume.
async function pinchOnFrame(page, {startDist, endDist, steps = 6} = {}) {
  await page.evaluate(({startDist, endDist, steps}) => {
    const frame = document.getElementById('cropFrame');
    const rect = frame.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const mk = (type, id, x, y) => new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: id, clientX: x, clientY: y, pointerType: 'touch',
    });
    frame.dispatchEvent(mk('pointerdown', 1, cx - startDist / 2, cy));
    frame.dispatchEvent(mk('pointerdown', 2, cx + startDist / 2, cy));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const d = startDist + (endDist - startDist) * t;
      frame.dispatchEvent(mk('pointermove', 1, cx - d / 2, cy));
      frame.dispatchEvent(mk('pointermove', 2, cx + d / 2, cy));
    }
    frame.dispatchEvent(mk('pointerup', 1, cx - endDist / 2, cy));
    frame.dispatchEvent(mk('pointerup', 2, cx + endDist / 2, cy));
  }, {startDist, endDist, steps});
}

// Crop internals (cropZoom/cropLeft/cropTop/cropBaseScale/cropNaturalW/H) are plain
// top-level `let` bindings in src/js/state.js's classic (non-module) script — visible to
// page.evaluate() the same way getPhoto()/state are elsewhere in this suite.
const readCrop = page => page.evaluate(() => ({
  zoom: cropZoom, left: cropLeft, top: cropTop,
  baseScale: cropBaseScale, natW: cropNaturalW, natH: cropNaturalH,
}));

function assertNoBlankSpace(crop) {
  const scale = crop.baseScale * crop.zoom;
  const dispW = crop.natW * scale, dispH = crop.natH * scale;
  expect(crop.left).toBeLessThanOrEqual(0.01);
  expect(crop.top).toBeLessThanOrEqual(0.01);
  expect(crop.left + dispW).toBeGreaterThanOrEqual(220 - 0.01);
  expect(crop.top + dispH).toBeGreaterThanOrEqual(220 - 0.01);
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

    // Drag to reposition, then zoom in with the wheel — the crop must still produce a valid image.
    const frame = page.locator('#cropFrame');
    const box = await frame.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10, {steps: 5});
    await page.mouse.up();
    await frame.hover();
    await page.mouse.wheel(0, -400);

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

  test('a freshly picked photo is auto-centered and scaled to fully fill the crop circle', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Sasha');
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await page.locator('#personPhotoInput').setInputFiles(TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();

    const crop = await readCrop(page);
    expect(crop.zoom).toBe(1);
    expect(crop.left).toBeCloseTo((220 - crop.natW * crop.baseScale) / 2, 1);
    expect(crop.top).toBeCloseTo((220 - crop.natH * crop.baseScale) / 2, 1);
    assertNoBlankSpace(crop);
  });

  test('dragging the photo repositions it, clamped so no blank space is exposed', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Rowan');
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await page.locator('#personPhotoInput').setInputFiles(WIDE_TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();
    const start = await readCrop(page);

    const frame = page.locator('#cropFrame');
    const box = await frame.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2 + 8, {steps: 5});
    await page.mouse.up();
    const dragged = await readCrop(page);
    expect(dragged.left === start.left && dragged.top === start.top).toBe(false);
    assertNoBlankSpace(dragged);

    // Drag far past any legal bound — the crop must clamp back to fully covering the circle
    // rather than exposing blank space at an edge.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 5000, box.y + box.height / 2 + 5000, {steps: 5});
    await page.mouse.up();
    assertNoBlankSpace(await readCrop(page));
  });

  test('zoom clamps at the minimum fill scale and a sensible maximum, both directions blank-space-safe', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Nico');
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await page.locator('#personPhotoInput').setInputFiles(TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();

    const frame = page.locator('#cropFrame');
    await frame.hover();
    // Scrolling to zoom OUT past the minimum must not go below the fill scale (zoom===1).
    await page.mouse.wheel(0, 800);
    let crop = await readCrop(page);
    expect(crop.zoom).toBe(1);
    assertNoBlankSpace(crop);

    // Scrolling to zoom IN a lot must clamp at a bounded maximum, not grow unbounded.
    await page.mouse.wheel(0, -100000);
    crop = await readCrop(page);
    expect(crop.zoom).toBeLessThanOrEqual(4);
    assertNoBlankSpace(crop);
  });

  test('pinching zooms the photo, clamped and blank-space-safe', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Iris');
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await page.locator('#personPhotoInput').setInputFiles(TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();
    const start = await readCrop(page);

    await pinchOnFrame(page, {startDist: 40, endDist: 160});
    const zoomedIn = await readCrop(page);
    expect(zoomedIn.zoom).toBeGreaterThan(start.zoom);
    assertNoBlankSpace(zoomedIn);

    await pinchOnFrame(page, {startDist: 160, endDist: 20});
    const zoomedOut = await readCrop(page);
    expect(zoomedOut.zoom).toBeLessThan(zoomedIn.zoom);
    expect(zoomedOut.zoom).toBeGreaterThanOrEqual(1);
    assertNoBlankSpace(zoomedOut);
  });

  test('Reset restores the centered, minimum-fill state after dragging and zooming', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Wren');
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await page.locator('#personPhotoInput').setInputFiles(TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();
    const initial = await readCrop(page);

    const frame = page.locator('#cropFrame');
    const box = await frame.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20, {steps: 5});
    await page.mouse.up();
    await frame.hover();
    await page.mouse.wheel(0, -600);
    const moved = await readCrop(page);
    expect(moved.zoom).not.toBe(initial.zoom);

    await page.locator('#cropResetBtn').click();
    const reset = await readCrop(page);
    expect(reset.zoom).toBe(1);
    expect(reset.left).toBeCloseTo(initial.left, 1);
    expect(reset.top).toBeCloseTo(initial.top, 1);
  });

  test('the saved avatar reflects the crop state shown, not just any pick', async ({page}) => {
    await boot(page, {view: 'circleView', at: AT});
    await page.locator('#addPersonBtn').click();
    await page.locator('#personName').fill('Devon');
    await page.locator('#choosePersonVisual').click();
    await page.locator('#visualModePhoto').click();
    await page.locator('#personPhotoInput').setInputFiles(TEST_PHOTO);
    await expect(page.locator('#cropStage')).toBeVisible();

    const frame = page.locator('#cropFrame');
    await frame.hover();
    await page.mouse.wheel(0, -400); // zoom in before confirming
    const crop = await readCrop(page);
    expect(crop.zoom).toBeGreaterThan(1);

    await page.locator('#cropConfirmBtn').click();
    await expect(page.locator('#cropStage')).toBeHidden();
    // The confirmed blob is drawn from exactly this crop's sx/sy/sSize (see cropConfirmBtn's
    // handler in state.js) — a non-default zoom producing a usable, loaded preview is the
    // externally observable signal that the shown crop (not some fixed default) was used.
    await expect(page.locator('#visualPhotoPreviewImg')).toHaveClass(/loaded/);
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

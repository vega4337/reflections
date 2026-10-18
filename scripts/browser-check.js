async page => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (value, message) => { if (!value) throw new Error(message); };
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:4173/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const left = page.getByRole('button', { name: 'Rotate selected mirror counterclockwise 5 degrees', exact: true });
  for (let i = 0; i < 6; i++) await left.click();
  check(await page.getByRole('dialog', { name: 'Beautifully connected.' }).isVisible(), 'Six actual 5-degree turns should solve level 1');
  await page.getByRole('button', { name: 'Stay and admire' }).click();
  check(await page.getByRole('slider').isDisabled(), 'Completed puzzle should not show editable controls');
  await page.getByRole('button', { name: 'Reset', exact: false }).click();
  check(await page.getByRole('slider').inputValue() === '165', 'Reset restores initial angle');
  const initialPath = await page.locator('.beam-core').getAttribute('d');
  await page.setViewportSize({ width: 390, height: 844 });
  check(await page.locator('.beam-core').getAttribute('d') === initialPath, 'Resize must preserve exact geometry');
  check(await page.getByRole('slider').inputValue() === '165', 'Resize preserves angles');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout must not overflow horizontally');
  await page.setViewportSize({ width: 1440, height: 1000 });
  // Drag through the correct angle and then away before release: no stale win.
  await page.locator('#board').scrollIntoViewIfNeeded();
  const box = await page.locator('#board').boundingBox();
  const point = angle => ({ x: box.x + (400 + Math.cos(angle * Math.PI / 180) * 32) * box.width / 960, y: box.y + (420 + Math.sin(angle * Math.PI / 180) * 32) * box.height / 600 });
  const start = point(165), solution = point(135), away = point(115);
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  await page.mouse.move(solution.x, solution.y);
  check(await page.locator('#boardState').textContent() === 'CONNECTION ESTABLISHED', 'Dragging reaches correct reflection');
  check(!(await page.locator('#resultDialog').isVisible()), 'Drag should not complete before release');
  await page.mouse.move(away.x, away.y); await page.mouse.up();
  check(!(await page.locator('#resultDialog').isVisible()), 'Passing through solution must not latch');
  await page.getByRole('button', { name: 'Reset', exact: false }).click();
  // Keyboard control changes the selected SVG mirror itself.
  await page.locator('[data-mirror="0"]').focus();
  await page.keyboard.press('ArrowLeft');
  check(await page.getByRole('slider').inputValue() === '164', 'Keyboard fine rotation is 1 degree');
  await page.keyboard.press('Shift+ArrowLeft');
  check(await page.getByRole('slider').inputValue() === '159', 'Shift keyboard rotation is 5 degrees');
  // Solve every experiment through the visible selection and slider controls.
  const catalog = await page.evaluate(async () => { const { levels, chapters } = await import('./levels.js'); return { solutions: levels.map(level => level.mirrors.map(m => m.solution)), chapters }; });
  const solutions = catalog.solutions;
  const selectLevel = async index => {
    const chapter = catalog.chapters.findIndex(c => index >= c.start && index < c.end);
    await page.getByRole('combobox', { name: 'Choose a chapter' }).selectOption(String(chapter));
    await page.locator(`[data-level="${index}"]`).click();
  };
  check(solutions.length === 38, 'Thirty new levels are available');
  check(await page.locator('#mirrors text').count() === 0, 'Mirrors have no visible numbers');
  for (let index = 0; index < solutions.length; index++) {
    await selectLevel(index);
    for (let mirror = 0; mirror < solutions[index].length; mirror++) {
      await page.getByRole('button', { name: `Select mirror ${mirror + 1}`, exact: true }).click();
      await page.getByRole('slider').evaluate((slider, angle) => { slider.value = angle; slider.dispatchEvent(new Event('input', { bubbles: true })); slider.dispatchEvent(new Event('change', { bubbles: true })); }, solutions[index][mirror]);
    }
    check(await page.locator('#resultDialog').isVisible(), `Experiment ${index + 1} completes through the controls`);
    check(await page.locator('.receiver-awake').count() === 1, 'Receiver visibly lights up');
    await page.getByRole('button', { name: 'Stay and admire' }).click();
  }
  check(await page.locator('#progressText').textContent() === '38 of 38 connected', 'All completion states recorded');
  check((await page.locator('#resultDescription').textContent()).startsWith('38 experiments.'), 'Final completion text uses the expanded catalog');
  await page.setViewportSize({ width: 390, height: 844 });
  await selectLevel(37);
  check(await page.getByRole('button', { name: 'Select mirror 10', exact: true }).isVisible(), 'Mobile supports ten-mirror controls');
  await page.getByRole('button', { name: 'Select mirror 10', exact: true }).click();
  const beforeAngle = Number(await page.getByRole('slider').inputValue());
  await page.getByRole('button', { name: 'Rotate selected mirror clockwise 5 degrees', exact: true }).click();
  check(Number(await page.getByRole('slider').inputValue()) === (beforeAngle + 5) % 180, 'Mobile last mirror rotates');
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Late levels fit the phone width');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.reload();
  check(await page.locator('#progressText').textContent() === '38 of 38 connected', 'Progress persists after reload');
  await selectLevel(7);
  await page.getByRole('button', { name: 'A little help', exact: false }).click();
  check(await page.getByRole('slider').inputValue() === '135', 'Hint aligns first mirror');
  check(!(await page.locator('#resultDialog').isVisible()), 'One hint does not auto-solve multi-mirror level');
  // Browser clock exercises timeout, retry, and pause without a 90-second wait.
  await page.getByRole('combobox', { name: 'YOUR PACE' }).selectOption('challenge');
  await page.clock.fastForward(10000);
  await page.getByRole('button', { name: 'How to play' }).click();
  const paused = await page.locator('#timer').textContent();
  await page.clock.fastForward(100000);
  check(await page.locator('#timer').textContent() === paused, 'Instructions pause the timer');
  await page.getByRole('button', { name: 'Let there be light', exact: false }).click();
  await page.waitForFunction(() => !document.getElementById('timer').textContent.startsWith('Paused'));
  await page.clock.fastForward(81000);
  check(await page.getByRole('heading', { name: 'Another angle awaits.' }).isVisible(), 'Timer expires');
  await page.keyboard.press('Escape');
  check(await page.locator('#resultDialog').isVisible(), 'Timeout cannot be bypassed with Escape');
  await page.getByRole('button', { name: 'Try this experiment again', exact: false }).click();
  check(await page.locator('#levelTitle').textContent() === 'Everything connects', 'Retry stays on same level');
  check((await page.locator('#timer').textContent()).includes('90s'), 'Retry creates fresh timer');
  await page.clock.fastForward(91000);
  await page.getByRole('button', { name: 'Switch to Calm mode' }).click();
  check(await page.getByRole('combobox', { name: 'YOUR PACE' }).inputValue() === 'calm', 'Timeout supports Calm mode');
  check(await page.locator('#timer').textContent() === 'Take your time.', 'Calm mode stops timer');
  check(errors.length === 0, `Browser exceptions: ${errors.join(', ')}`);
  console.log('PASS: desktop, mobile resize, real mouse drag, no stale win, keyboard, all 38 solutions, persistence, hints, timer pause, timeout, retry, Calm mode, and no browser errors.');
}

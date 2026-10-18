import { levels } from './levels.js';
import { traceBeam, mirrorEnds, normalizeAngle } from './optics.js';

const $ = id => document.getElementById(id);
const number = value => String(value + 1).padStart(2, '0');
const STORAGE_KEY = 'reflections-progress-v2';
let completed = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(saved)) completed = new Set(saved.filter(i => Number.isInteger(i) && i >= 0 && i < levels.length));
} catch { /* Private browsing and damaged saves must not prevent play. */ }

let levelIndex = 0, level, selected = 0, status = 'playing', trace;
let drag = null, deadline = null, pauseStarted = null, hintCount = 0;
const board = $('board');

function saveProgress() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed])); } catch { /* Persistence is optional. */ }
}

function renderJourney() {
  $('progressText').textContent = `${completed.size} of ${levels.length} connected`;
  $('levelList').innerHTML = levels.map((item, i) => `<button class="level-card" data-level="${i}" ${i === levelIndex ? 'aria-current="step"' : ''} aria-label="Experiment ${i + 1}: ${item.title}${completed.has(i) ? ', completed' : ''}"><span class="level-card-number">${number(i)}</span><span class="level-card-title">${item.title}</span>${completed.has(i) ? '<span class="completed-mark" aria-hidden="true">✓</span>' : ''}</button>`).join('');
}

function renderMirrors() {
  $('mirrors').innerHTML = level.mirrors.map((m, i) => `<g class="mirror-object" data-mirror="${i}" tabindex="0" role="button"><circle class="mirror-orbit" cx="${m.x}" cy="${m.y}" r="44"/><line class="mirror-surface"/><circle class="mirror-handle handle-a" r="6"/><circle class="mirror-handle handle-b" r="6"/><circle class="mirror-center" cx="${m.x}" cy="${m.y}" r="5"/><text class="mirror-label" x="${m.x}" y="${m.y + 66}">${number(i)}</text></g>`).join('');
  $('mirrorPicker').innerHTML = level.mirrors.map((_, i) => `<button data-select="${i}" aria-label="Select mirror ${i + 1}">${number(i)}</button>`).join('');
}

function updateMirrors() {
  for (const id of ['angle', 'rotateLeft', 'rotateRight']) $(id).disabled = status !== 'playing';
  [...$('mirrors').children].forEach((node, i) => {
    const m = level.mirrors[i], [a, b] = mirrorEnds(m);
    const line = node.querySelector('line');
    for (const [key, value] of Object.entries({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })) line.setAttribute(key, value);
    for (const [selector, p] of [['.handle-a', a], ['.handle-b', b]]) {
      node.querySelector(selector).setAttribute('cx', p.x);
      node.querySelector(selector).setAttribute('cy', p.y);
    }
    node.classList.toggle('selected', i === selected);
    node.setAttribute('aria-label', `Mirror ${i + 1}, ${Math.round(m.angle)} degrees. Arrow keys rotate.`);
    node.setAttribute('aria-pressed', i === selected);
    $('mirrorPicker').children[i].setAttribute('aria-pressed', i === selected);
  });
  $('selectedNumber').textContent = number(selected);
  $('angleValue').textContent = `${Math.round(level.mirrors[selected].angle)}°`;
  $('angle').value = level.mirrors[selected].angle;
}

function renderBeam() {
  trace = traceBeam(level);
  const path = trace.segments.map(s => `M${s.from.x},${s.from.y}L${s.to.x},${s.to.y}`).join(' ');
  const last = trace.segments.at(-1)?.to;
  $('beam').innerHTML = `<path class="beam-aura" d="${path}"/><path class="beam-core" d="${path}"/>${trace.end === 'obstacle' && last ? `<circle cx="${last.x}" cy="${last.y}" r="5" fill="#f8da8b"/>` : ''}`;
  const source = level.source, target = level.target;
  $('endpoints').innerHTML = `<circle cx="${source.x}" cy="${source.y}" r="22" fill="#f8da8b0a" stroke="#a48e59"/><circle cx="${source.x}" cy="${source.y}" r="8" fill="#f8da8b"/><path d="M${source.x - 4} ${source.y - 4}l8 4-8 4" fill="none" stroke="#423b24" stroke-width="1.5"/><text class="endpoint-label" x="${source.x}" y="${source.y + 44}">SOURCE</text><circle class="receiver-ring" cx="${target.x}" cy="${target.y}" r="27" stroke-dasharray="3 5"/><circle class="receiver-ring ${trace.solved ? 'receiver-awake' : ''}" cx="${target.x}" cy="${target.y}" r="18"/><circle cx="${target.x}" cy="${target.y}" r="5" fill="${trace.solved ? '#152b27' : '#c4f39b'}"/><text class="endpoint-label" x="${target.x}" y="${target.y - 41}">RECEIVER</text>`;
  $('boardState').textContent = trace.solved ? 'CONNECTION ESTABLISHED' : trace.end === 'obstacle' ? 'PATH BLOCKED' : 'LIGHT IN MOTION';
  $('boardMessage').textContent = trace.solved ? 'A little light found its way.' : trace.end === 'obstacle' ? 'The barrier stops the beam. Look for a way around.' : 'Select a mirror. Explore a different angle.';
}

function selectMirror(index) { selected = index; updateMirrors(); }

function setAngle(angle, commit = true) {
  if (status !== 'playing') return;
  if (deadline !== null && pauseStarted === null && Date.now() >= deadline) { expire(); return; }
  level.mirrors[selected].angle = normalizeAngle(angle);
  updateMirrors();
  renderBeam();
  if (commit) checkCompletion();
}

function checkCompletion() {
  if (status !== 'playing') return;
  if (deadline !== null && Date.now() >= deadline) { expire(); return; }
  // Re-evaluate on release: passing through the solution during a drag is not a win.
  trace = traceBeam(level);
  if (!trace.solved) return;
  status = 'solved'; deadline = null;
  completed.add(levelIndex); saveProgress(); renderJourney(); updateMirrors(); updateTimer();
  $('resultEyebrow').textContent = 'CONNECTION ESTABLISHED';
  $('resultTitle').textContent = completed.size === levels.length ? 'Everything connects.' : 'Beautifully connected.';
  $('resultDescription').textContent = completed.size === levels.length ? 'Eight experiments. A whole new way of seeing the light. Revisit any experiment or try Challenge mode.' : `${level.title} is complete.${hintCount ? ' A little help, a little discovery.' : ' You found your way through.'}`;
  $('nextButton').innerHTML = levelIndex === levels.length - 1 ? 'Explore again <span>↺</span>' : 'Next experiment <span>→</span>';
  $('reviewButton').textContent = 'Stay and admire';
  $('resultDialog').showModal();
}

function loadLevel(index) {
  cancelDrag(true);
  $('resultDialog').close();
  levelIndex = index; level = structuredClone(levels[index]); selected = 0; status = 'playing'; hintCount = 0;
  deadline = $('mode').value === 'challenge' ? Date.now() + 90000 : null;
  pauseStarted = null;
  $('levelNumber').textContent = `EXPERIMENT ${number(index)}`;
  $('boardCounter').textContent = `EXPERIMENT ${number(index)} / ${String(levels.length).padStart(2, '0')}`;
  $('levelTitle').textContent = level.title;
  $('levelDescription').textContent = level.description;
  $('difficulty').textContent = level.difficulty;
  $('mirrorCount').textContent = `${level.mirrors.length} mirror${level.mirrors.length === 1 ? '' : 's'}`;
  $('hint').textContent = 'Start at the source. Follow the light.';
  $('obstacles').innerHTML = level.obstacles.map(o => `<rect x="${o.x}" y="${o.y}" width="${o.width}" height="${o.height}" fill="#1e3035" stroke="#5b7379"/><rect x="${o.x + 5}" y="${o.y + 5}" width="${o.width - 10}" height="${o.height - 10}" fill="url(#hatch)" opacity=".65"/>`).join('');
  renderMirrors(); updateMirrors(); renderBeam(); renderJourney(); updateTimer();
}

function pointerPosition(event) {
  return new DOMPoint(event.clientX, event.clientY).matrixTransform(board.getScreenCTM().inverse());
}
board.addEventListener('pointerdown', event => {
  const node = event.target.closest('[data-mirror]');
  if (!node || status !== 'playing' || drag || (event.pointerType === 'mouse' && event.button !== 0)) return;
  event.preventDefault(); selectMirror(Number(node.dataset.mirror)); node.focus({ preventScroll: true });
  const p = pointerPosition(event), m = level.mirrors[selected];
  if (Math.hypot(p.x - m.x, p.y - m.y) < 12) return;
  drag = { pointerId: event.pointerId, index: selected, startAngle: m.angle, pointerAngle: Math.atan2(p.y - m.y, p.x - m.x) * 180 / Math.PI };
  board.setPointerCapture(event.pointerId);
});
board.addEventListener('pointermove', event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const p = pointerPosition(event), m = level.mirrors[drag.index];
  if (Math.hypot(p.x - m.x, p.y - m.y) < 12) return;
  const angle = Math.atan2(p.y - m.y, p.x - m.x) * 180 / Math.PI;
  const step = event.shiftKey ? 1 : 5;
  setAngle(Math.round((drag.startAngle + angle - drag.pointerAngle) / step) * step, false);
});
function cancelDrag(restore = false) {
  if (!drag) return;
  const previous = drag; drag = null;
  if (restore && level) level.mirrors[previous.index].angle = previous.startAngle;
  if (board.hasPointerCapture(previous.pointerId)) board.releasePointerCapture(previous.pointerId);
  if (level) { updateMirrors(); renderBeam(); }
}
board.addEventListener('pointerup', event => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  cancelDrag(); checkCompletion();
});
board.addEventListener('pointercancel', () => cancelDrag(true));
board.addEventListener('lostpointercapture', () => cancelDrag(true));
board.addEventListener('keydown', event => {
  const node = event.target.closest('[data-mirror]');
  if (!node) return;
  if (['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    event.preventDefault(); selectMirror(Number(node.dataset.mirror));
    if (event.key.startsWith('Arrow')) setAngle(level.mirrors[selected].angle + (['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : -1) * (event.shiftKey ? 5 : 1));
  }
});
$('mirrorPicker').addEventListener('click', event => {
  const button = event.target.closest('[data-select]');
  if (button) selectMirror(Number(button.dataset.select));
});
$('angle').addEventListener('input', event => setAngle(Number(event.target.value), false));
$('angle').addEventListener('change', checkCompletion);
$('rotateLeft').addEventListener('click', () => setAngle(level.mirrors[selected].angle - 5));
$('rotateRight').addEventListener('click', () => setAngle(level.mirrors[selected].angle + 5));
$('resetButton').addEventListener('click', () => loadLevel(levelIndex));
$('hintButton').addEventListener('click', () => {
  if (status !== 'playing') { $('hint').textContent = 'Choose another experiment or reset this one to explore again.'; return; }
  const index = level.mirrors.findIndex(m => Math.abs(m.angle - m.solution) > .01);
  if (index < 0) return;
  selectMirror(index); hintCount++;
  $('hint').textContent = `Mirror ${number(index)} is aligned. Follow its outgoing beam to the ${index === level.mirrors.length - 1 ? 'receiver' : 'next mirror'}.`;
  setAngle(level.mirrors[index].solution);
});
$('levelList').addEventListener('click', event => {
  const button = event.target.closest('[data-level]');
  if (button) loadLevel(Number(button.dataset.level));
});
$('mode').addEventListener('change', () => loadLevel(levelIndex));
$('nextButton').addEventListener('click', () => loadLevel(status === 'timeout' ? levelIndex : (levelIndex + 1) % levels.length));
$('reviewButton').addEventListener('click', () => {
  if (status === 'timeout') { $('mode').value = 'calm'; loadLevel(levelIndex); }
  else $('resultDialog').close();
});
$('resultDialog').addEventListener('cancel', event => {
  if (status === 'timeout') event.preventDefault();
});

function updatePause() {
  const shouldPause = document.hidden || $('helpDialog').open;
  if (deadline === null) return;
  if (shouldPause && pauseStarted === null) pauseStarted = Date.now();
  else if (!shouldPause && pauseStarted !== null) { deadline += Date.now() - pauseStarted; pauseStarted = null; }
  updateTimer();
}
$('helpButton').addEventListener('click', () => { cancelDrag(true); $('helpDialog').showModal(); updatePause(); });
$('closeHelp').addEventListener('click', () => $('helpDialog').close());
$('startPlaying').addEventListener('click', () => $('helpDialog').close());
$('helpDialog').addEventListener('close', updatePause);
document.addEventListener('visibilitychange', () => { cancelDrag(true); updatePause(); });

function expire() {
  if (status !== 'playing') return;
  cancelDrag(true); status = 'timeout'; deadline = null; updateMirrors();
  $('timer').textContent = 'Time’s up';
  $('resultEyebrow').textContent = 'A MOMENT TO RESET';
  $('resultTitle').textContent = 'Another angle awaits.';
  $('resultDescription').textContent = 'Time ran out. Try this experiment again, or take your time in Calm mode.';
  $('nextButton').innerHTML = 'Try this experiment again <span>↺</span>';
  $('reviewButton').textContent = 'Switch to Calm mode';
  $('resultDialog').showModal();
}
function updateTimer() {
  $('timer').classList.remove('urgent');
  if (deadline === null) { $('timer').textContent = status === 'solved' ? 'Connected ✓' : status === 'timeout' ? 'Time’s up' : 'Take your time.'; return; }
  const remaining = Math.max(0, Math.ceil((deadline - (pauseStarted ?? Date.now())) / 1000));
  $('timer').textContent = pauseStarted !== null ? `Paused · ${remaining}s` : `${remaining}s remaining`;
  $('timer').classList.toggle('urgent', remaining <= 15);
  if (remaining === 0 && pauseStarted === null) expire();
}
setInterval(updateTimer, 250);
loadLevel(0);

import test from 'node:test';
import assert from 'node:assert/strict';
import { levels } from '../levels.js';
import { BOARD, MIRROR_HALF_LENGTH, traceBeam, raySegment, reflect } from '../optics.js';
const solvedLevel = level => ({ ...structuredClone(level), mirrors: level.mirrors.map(m => ({ ...m, angle: m.solution })) });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

for (const [index, level] of levels.entries()) {
  test(`experiment ${index + 1}: intended route solves in mirror order`, () => {
    const result = traceBeam(solvedLevel(level));
    assert.equal(result.solved, true);
    assert.deepEqual(result.hits, level.mirrors.map((_, i) => i));
    assert.equal(result.segments.length, level.mirrors.length + 1);
    result.segments.slice(0, -1).forEach((segment, i) => {
      close(segment.to.x, level.mirrors[i].x);
      close(segment.to.y, level.mirrors[i].y);
    });
  });
  test(`experiment ${index + 1}: starts unsolved and first mirror is reachable`, () => {
    const result = traceBeam(level);
    assert.equal(result.solved, false);
    assert.equal(result.hits[0], 0);
    assert.equal(traceBeam({ ...level, mirrors: [] }).solved, false);
  });
  test(`experiment ${index + 1}: no redundant mirrors on the intended route`, () => {
    for (let i = 0; i < level.mirrors.length; i++) {
      const candidate = solvedLevel(level);
      candidate.mirrors.splice(i, 1);
      assert.equal(traceBeam(candidate).solved, false, `Mirror ${i + 1} must be necessary`);
    }
  });
  test(`experiment ${index + 1}: rotating mirrors cannot overlap barriers or board edges`, () => {
    for (const mirror of level.mirrors) {
      assert.ok(mirror.x >= 44 && mirror.x <= BOARD.width - 44);
      assert.ok(mirror.y >= 44 && mirror.y <= BOARD.height - 70);
      for (const obstacle of level.obstacles) {
        const x = Math.max(obstacle.x, Math.min(mirror.x, obstacle.x + obstacle.width));
        const y = Math.max(obstacle.y, Math.min(mirror.y, obstacle.y + obstacle.height));
        assert.ok(Math.hypot(mirror.x - x, mirror.y - y) > MIRROR_HALF_LENGTH + 12);
      }
    }
    // Every wall also serves a purpose: it blocks a direct source-to-target ray.
    if (level.obstacles.length === 1) {
      const direct = { ...level, mirrors: [], source: { ...level.source, angle: Math.atan2(level.target.y - level.source.y, level.target.x - level.source.x) * 180 / Math.PI } };
      assert.equal(traceBeam(direct).end, 'obstacle');
    }
  });
}

test('reflection preserves energy and equal incidence/reflection angles', () => {
  for (let angle = 0; angle < 180; angle++) {
    const incoming = { x: .6, y: .8 }, reflected = reflect(incoming, angle);
    close(Math.hypot(reflected.x, reflected.y), 1);
    const restored = reflect(reflected, angle);
    close(restored.x, incoming.x); close(restored.y, incoming.y);
    const tangent = { x: Math.cos(angle * Math.PI / 180), y: Math.sin(angle * Math.PI / 180) };
    close(incoming.x * tangent.x + incoming.y * tangent.y, reflected.x * tangent.x + reflected.y * tangent.y);
  }
});
test('45 degree mirror turns a horizontal ray downward; 135 turns upward', () => {
  close(reflect({ x: 1, y: 0 }, 45).y, 1);
  close(reflect({ x: 1, y: 0 }, 135).y, -1);
});
test('parallel and reverse-parallel segments do not produce invalid intersections', () => {
  for (const direction of [{ x: 1, y: 0 }, { x: -1, y: 0 }]) assert.equal(raySegment({ x: 0, y: 0 }, direction, { x: 5, y: 0 }, { x: 10, y: 0 }), null);
  assert.equal(raySegment({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -5, y: -10 }, { x: -5, y: 10 }), null);
  close(raySegment({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 10 }), 5);
});
test('nearest obstacle occludes mirrors and receiver exactly at its visible edge', () => {
  const level = { source: { x: 100, y: 300, angle: 0 }, target: { x: 800, y: 300, radius: 18 }, mirrors: [{ x: 600, y: 300, angle: 90 }], obstacles: [{ x: 300, y: 250, width: 60, height: 100 }] };
  const result = traceBeam(level);
  assert.equal(result.end, 'obstacle'); assert.equal(result.solved, false);
  close(result.segments[0].to.x, 300); close(result.segments[0].to.y, 300);
  assert.equal(result.hits.length, 0);
});
test('target at the same distance as a barrier cannot win the collision tie', () => {
  const level = { source: { x: 100, y: 300, angle: 0 }, target: { x: 318, y: 300, radius: 18 }, mirrors: [], obstacles: [{ x: 300, y: 250, width: 60, height: 100 }] };
  assert.equal(traceBeam(level).end, 'obstacle');
});
test('a solved trace never latches after a mirror moves away', () => {
  const level = solvedLevel(levels[0]);
  assert.equal(traceBeam(level).solved, true);
  level.mirrors[0].angle += 20;
  assert.equal(traceBeam(level).solved, false);
});
test('facing mirrors terminate a repeated loop', () => {
  const level = { source: { x: 400, y: 300, angle: 0 }, target: { x: 800, y: 100, radius: 18 }, mirrors: [{ x: 300, y: 300, angle: 90 }, { x: 500, y: 300, angle: 90 }], obstacles: [] };
  const result = traceBeam(level);
  assert.equal(result.end, 'loop'); assert.equal(result.solved, false);
  assert.ok(result.segments.length < 10);
});
test('arbitrary angles always terminate with finite geometry inside the board', () => {
  let seed = 2026;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const template of levels) for (let run = 0; run < 300; run++) {
    const level = structuredClone(template);
    level.mirrors.forEach(m => { m.angle = random() * 180; });
    const result = traceBeam(level);
    assert.ok(result.segments.length <= 65);
    for (const { to } of result.segments) {
      assert.ok(Number.isFinite(to.x) && Number.isFinite(to.y));
      assert.ok(to.x >= -1e-6 && to.x <= BOARD.width + 1e-6);
      assert.ok(to.y >= -1e-6 && to.y <= BOARD.height + 1e-6);
    }
  }
});

// All geometry lives in one fixed coordinate system. Resizing only scales the view.
export const BOARD = Object.freeze({ width: 960, height: 600 });
export const MIRROR_HALF_LENGTH = 32;
const EPSILON = 1e-7;
export const radians = degrees => degrees * Math.PI / 180;
export const normalizeAngle = degrees => ((degrees % 180) + 180) % 180;

export function raySegment(origin, direction, a, b) {
  const sx = b.x - a.x, sy = b.y - a.y;
  const denominator = direction.x * sy - direction.y * sx;
  if (Math.abs(denominator) < EPSILON) return null;
  const ox = a.x - origin.x, oy = a.y - origin.y;
  const distance = (ox * sy - oy * sx) / denominator;
  const along = (ox * direction.y - oy * direction.x) / denominator;
  return distance > EPSILON && along >= -EPSILON && along <= 1 + EPSILON ? distance : null;
}
export function mirrorEnds(mirror) {
  const x = Math.cos(radians(mirror.angle)) * MIRROR_HALF_LENGTH;
  const y = Math.sin(radians(mirror.angle)) * MIRROR_HALF_LENGTH;
  return [{ x: mirror.x - x, y: mirror.y - y }, { x: mirror.x + x, y: mirror.y + y }];
}
function rectangleEdges({ x, y, width, height }) {
  const corners = [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }];
  return corners.map((corner, index) => [corner, corners[(index + 1) % 4]]);
}
function rayCircle(origin, direction, circle) {
  const x = origin.x - circle.x, y = origin.y - circle.y;
  const projection = x * direction.x + y * direction.y;
  const discriminant = projection ** 2 - (x * x + y * y - circle.radius ** 2);
  if (discriminant < 0) return null;
  const near = -projection - Math.sqrt(discriminant), far = -projection + Math.sqrt(discriminant);
  return near > EPSILON ? near : far > EPSILON ? far : null;
}
export function reflect(direction, angle) {
  const normal = { x: -Math.sin(radians(angle)), y: Math.cos(radians(angle)) };
  const dot = direction.x * normal.x + direction.y * normal.y;
  return { x: direction.x - 2 * dot * normal.x, y: direction.y - 2 * dot * normal.y };
}
// Pure tracing: a previous target hit can never latch a later, incorrect solution.
export function traceBeam(level, maxBounces = 64) {
  let origin = { x: level.source.x, y: level.source.y };
  let direction = { x: Math.cos(radians(level.source.angle)), y: Math.sin(radians(level.source.angle)) };
  let previousMirror = -1;
  const segments = [], hits = [], seen = new Set();
  const walls = level.obstacles.flatMap((obstacle, index) => rectangleEdges(obstacle).map(edge => ({ edge, index })));
  const bounds = rectangleEdges({ x: 0, y: 0, ...BOARD });
  for (let bounce = 0; bounce <= maxBounces; bounce++) {
    let closest = { distance: Infinity, type: 'boundary', index: -1 };
    const consider = (distance, type, index = -1) => {
      if (distance !== null && distance < closest.distance - EPSILON) closest = { distance, type, index };
    };
    bounds.forEach(edge => consider(raySegment(origin, direction, ...edge), 'boundary'));
    walls.forEach(({ edge, index }) => consider(raySegment(origin, direction, ...edge), 'obstacle', index));
    level.mirrors.forEach((mirror, index) => {
      if (index !== previousMirror) consider(raySegment(origin, direction, ...mirrorEnds(mirror)), 'mirror', index);
    });
    consider(rayCircle(origin, direction, level.target), 'target');
    if (!Number.isFinite(closest.distance)) return { segments, hits, solved: false, end: 'boundary' };
    const end = { x: origin.x + direction.x * closest.distance, y: origin.y + direction.y * closest.distance };
    segments.push({ from: origin, to: end, type: closest.type });
    if (closest.type !== 'mirror') return { segments, hits, solved: closest.type === 'target', end: closest.type };
    hits.push(closest.index);
    direction = reflect(direction, level.mirrors[closest.index].angle);
    const key = [closest.index, end.x.toFixed(5), end.y.toFixed(5), direction.x.toFixed(5), direction.y.toFixed(5)].join(':');
    if (seen.has(key)) return { segments, hits, solved: false, end: 'loop' };
    seen.add(key);
    previousMirror = closest.index;
    origin = end;
  }
  return { segments, hits, solved: false, end: 'limit' };
}
// Derive mirror angles from a designed, unobstructed source-to-receiver route.
export function buildLevel({ route, obstacles = [], ...metadata }) {
  const points = route.map(([x, y]) => ({ x, y }));
  const heading = (a, b) => Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
  const mirrors = points.slice(1, -1).map((point, index) => {
    const solution = normalizeAngle((heading(points[index], point) + heading(point, points[index + 2])) / 2);
    return { ...point, solution, angle: normalizeAngle(solution + [30, -30, 60, -45, 30][index]) };
  });
  return { ...metadata, route: points, source: { ...points[0], angle: heading(points[0], points[1]) }, target: { ...points.at(-1), radius: 18 }, mirrors, obstacles };
}

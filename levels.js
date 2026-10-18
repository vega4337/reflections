import { buildLevel } from './optics.js';
import { advancedLevels } from './advanced-levels.js';
export const levels = [
  { title: 'A new angle', difficulty: 'First light', description: 'One mirror. One small turn. Send the light upward to wake the receiver.', route: [[100, 420], [400, 420], [400, 140]] },
  { title: 'The way around', difficulty: 'Finding a path', description: 'A barrier interrupts the direct path. Take the light above it with two reflections.', route: [[100, 440], [280, 440], [280, 160], [820, 160]], obstacles: [{ x: 450, y: 260, width: 100, height: 220 }] },
  { title: 'Under the surface', difficulty: 'Finding a path', description: 'Look below the barrier. The open space is part of the solution.', route: [[100, 160], [340, 160], [340, 440], [820, 440]], obstacles: [{ x: 500, y: 90, width: 100, height: 240 }] },
  { title: 'A wider view', difficulty: 'In the flow', description: 'Up, across, and down. Connect three mirrors around a wall of shadow.', route: [[100, 440], [260, 440], [260, 160], [740, 160], [740, 440]], obstacles: [{ x: 400, y: 280, width: 200, height: 240 }] },
  { title: 'The return', difficulty: 'In the flow', description: 'The receiver is almost within reach. A detour below brings the light back home.', route: [[100, 160], [280, 160], [280, 460], [680, 460], [680, 180]], obstacles: [{ x: 430, y: 80, width: 100, height: 270 }] },
  { title: 'Between shadows', difficulty: 'Deep focus', description: 'Thread the gap between two barriers. Build the connection one reflection at a time.', route: [[100, 440], [240, 440], [240, 160], [480, 160], [480, 400], [840, 400]], obstacles: [{ x: 340, y: 280, width: 60, height: 230 }, { x: 620, y: 80, width: 80, height: 220 }] },
  { title: 'Full circle', difficulty: 'Deep focus', description: 'Sometimes the way forward leads back. Wrap around the barriers to reach the center.', route: [[100, 140], [260, 140], [260, 440], [680, 440], [680, 240], [440, 240]], obstacles: [{ x: 350, y: 60, width: 60, height: 250 }, { x: 500, y: 290, width: 90, height: 70 }] },
  { title: 'Everything connects', difficulty: 'Deep focus', description: 'Five mirrors, one continuous thought. Bring everything you have learned into the light.', route: [[100, 460], [240, 460], [240, 140], [720, 140], [720, 440], [480, 440], [480, 280]], obstacles: [{ x: 340, y: 220, width: 60, height: 300 }, { x: 540, y: 220, width: 80, height: 120 }] },
  ...advancedLevels,
].map(buildLevel);

export const chapters = [
  { title: 'First light', start: 0, end: 5 },
  { title: 'Deep focus', start: 5, end: 8 },
  { title: 'Oblique thinking', start: 8, end: 13 },
  { title: 'Interwoven', start: 13, end: 18 },
  { title: 'Labyrinth', start: 18, end: 23 },
  { title: 'Precision', start: 23, end: 28 },
  { title: 'Mastery', start: 28, end: 33 },
  { title: 'The final light', start: 33, end: 38 },
];

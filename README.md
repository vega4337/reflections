# Reflections

A quiet optical puzzle: turn fixed mirrors to carry a beam around barriers and into a receiver. 38 verified experiments progress from one mirror to ten, organized into eight chapters.

## Run

Requires Node.js 20+ for the local preview and tests. No packages or build step are needed.

```sh
npm start
# Open http://127.0.0.1:4173
npm test
```

Production is static: serve `index.html`, `styles.css`, `game.js`, `levels.js`, `advanced-levels.js`, and `optics.js` together. This works on GitHub Pages, including repository subpaths. Use an HTTP server rather than opening the HTML as a `file:` URL because the game uses JavaScript modules.

## Play

- Tap a mirror or select it in the control panel. Mirrors have no numbers on the board; the selection ring connects the panel to the mirror.
- Drag either handle to rotate in 5° increments (hold Shift for 1°). Pointer capture keeps the interaction working outside the mirror.
- Use the slider for 1° precision, or the turn buttons for 5° steps. Focus a mirror and use arrow keys for 1°; Shift + arrow turns 5°.
- Barriers absorb the beam. Mirrors reflect at equal incoming/outgoing angles. The receiver lights up on contact; a drag or slider movement must be released while connected to complete the experiment.
- Hints align the next mirror along the intended route. Reset restores the experiment. All experiments can be selected freely.
- Calm mode is untimed. Challenge is an explicit choice, with 90 seconds per experiment. Switching modes resets the current experiment. The clock pauses while instructions are open or the page is hidden.
- Completed experiments are saved locally when browser storage is available. No account, analytics, or network assets are used.

## Geometry and level design

`optics.js` is a pure ray tracer. `levels.js` defines each source-to-receiver route and derives the correct mirror surface angles from successive headings. Barriers sit outside those routes and outside each mirror's rotation envelope. The SVG viewBox stays at 960 × 600; resizing uniformly scales the entire scene and never changes game state or collision geometry.

The rendered mirror endpoints, obstacle rectangles, and receiver radius use exactly the same geometry as collision detection. The receiver's outer dashed ring is decorative; its solid inner ring is the hit area. The nearest forward hit wins, barriers occlude objects behind them, and repeated ray states terminate loops. Completion checks the current trace, never a latched hit from an earlier frame.

`npm test` verifies every level's intended solution and necessary mirrors, first-mirror reachability, clear rotation space, reflection laws, collision ordering, finite boundaries, loop termination, and 11,400 deterministic randomized configurations.

For the browser smoke check, start the preview server, then run:

```sh
npx --yes --package @playwright/cli playwright-cli -s=reflections open http://127.0.0.1:4173
npx --yes --package @playwright/cli playwright-cli -s=reflections run-code --filename=scripts/browser-check.js
```

This uses an isolated browser session and clears only that session's local game progress. It checks real mouse and keyboard input, every solution through the controls, mobile resizing, persistence, hints, and accelerated timer/pause/retry behavior. A failed assertion produces an error.

## Difficulty progression

The first five experiments introduce the controls. Levels 6–8 introduce longer routes. Thirty additional static layouts then progress through diagonal reflections (9–13), interwoven paths (14–18), labyrinths (19–23), tighter passages (24–28), nine-mirror puzzles (29–33), and ten-mirror finales (34–38). All intended solutions use exact 5-degree control steps; the receiver stays the same size.

`advanced-levels.js` contains the committed layouts. `node scripts/design-levels.js` reproduces them with a seeded offline authoring search; there is no random generation during play. Candidates are rejected unless they have a valid complete solution, clear mirror rotation space, a reachable first mirror, necessary mirrors on the intended route, and increasingly constrained center-to-center shortcut paths. `minimumReflections` is a layout-screening metric for routes between mirror centers, not a claim that every possible off-center solution uses that many mirrors.

Existing saved completion for experiments 1–8 is preserved. Chapter browsing does not reset the active puzzle; selecting an experiment does.

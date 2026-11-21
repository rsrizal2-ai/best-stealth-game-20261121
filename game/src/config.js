// config.js — tuning constants and the three museum levels of Night Gallery.
// Map legend: '#' wall, '.' floor, ',' shadow (dark, hides the thief),
// 'S' statue, 'C' crate, 'D' display case (all three are cover: they block
// movement and a guard's line of sight), 'P' player start, '*' the Star
// Sapphire, 'E' exit, 'o' small loot gem. Every map is 30 tiles wide and
// 19 tiles tall; guard waypoints are tile coordinates in open lanes.

export const TILE = 32;
export const MAP_COLS = 30;
export const MAP_ROWS = 19;
export const HUD_HEIGHT = 40;
export const CANVAS_WIDTH = MAP_COLS * TILE;
export const CANVAS_HEIGHT = MAP_ROWS * TILE + HUD_HEIGHT;

export const TUNING = {
  playerWalkSpeed: 132, // pixels per second
  playerSneakSpeed: 72,
  guardPatrolSpeed: 58,
  guardInvestigateSpeed: 92,
  guardChaseSpeed: 148,
  guardVisionRange: 235,
  guardVisionHalfAngle: 0.62, // radians, about 35 degrees each side
  guardWaypointPause: 0.9, // seconds a guard waits at each waypoint
  suspicionGainPerSecond: 62, // at point blank, full view, walking
  suspicionDecayPerSecond: 14,
  suspicionShadowDecayPerSecond: 26,
  suspicionInvestigateAt: 55, // guard walks over to look
  suspicionAlarmAt: 100, // guard chases and the alarm sounds
  chaseGiveUpSeconds: 5, // seconds out of sight before the chase ends
  catchDistance: 26, // guard this close to the thief: caught
  coinCount: 3,
  coinThrowRange: 300,
  coinHearingRadius: 270,
  guardInvestigateSeconds: 3.2,
};

export const LEVELS = [
  {
    name: 'The Marble Hall',
    briefing: 'Lift the Star Sapphire and slip out the east door.',
    map: [
      '##############################',
      '#P....,,,,,.....D......S....E#',
      '#............................#',
      '#..S......C.........D........#',
      '#............................#',
      '#......,,,,,,,,..............#',
      '#......,,,,,,,,....S.........#',
      '#............................#',
      '#..D...........C........,,,..#',
      '#.......................,,,..#',
      '#....S.........D..........,,,#',
      '#............................#',
      '#.......C.............S......#',
      '#............................#',
      '#.....,,,,,......D...........#',
      '#.....,,,,,............C.....#',
      '#............................#',
      '#..........*.................#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 2], [27, 2]], pause: 0.9 },
      { waypoints: [[24, 4], [24, 16]], pause: 1.2 },
    ],
    loot: [[20, 4], [5, 12], [24, 16]],
  },
  {
    name: 'The Sculpture Wing',
    briefing: 'Three guards now. Shadows are your friends.',
    map: [
      '##############################',
      '#P..........#.......,,,,....E#',
      '#...........#................#',
      '#..S....C...#....D.....S.....#',
      '#...........#................#',
      '#....,,,,...#.....,,,,,......#',
      '#....,,,,.........,,,,,..C...#',
      '#...........#................#',
      '######.########.#########.####',
      '#............................#',
      '#..D........S........D....,,,#',
      '#.........................,,,#',
      '#....C..........,,,,.........#',
      '#................,,,,........#',
      '#..S........D................#',
      '#............................#',
      '#.......,,,,.....C......S....#',
      '#.......,,,,........*........#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 2], [11, 2]], pause: 0.8 },
      { waypoints: [[16, 2], [28, 2]], pause: 0.8 },
      { waypoints: [[2, 15], [27, 15]], pause: 1.0 },
    ],
    loot: [[10, 5], [22, 10], [6, 16], [26, 6]],
  },
  {
    name: 'The Sapphire Vault',
    briefing: 'Four guards, tight halls. Patience wins.',
    map: [
      '##############################',
      '#P.....#........#......,,,,.E#',
      '#......#........#............#',
      '#..S...#...D....#....S.......#',
      '#......#........#............#',
      '#......#........#.....,,,....#',
      '#..,,,,#........#.....,,,....#',
      '#..,,,,#........#............#',
      '###.####...D....###.####.#####',
      '#............................#',
      '#..D......S..........C....,,,#',
      '#.........................,,,#',
      '#....C.......,,,,............#',
      '#.............,,,............#',
      '#..S......D..................#',
      '#............................#',
      '#.......,,,,.....C......S....#',
      '#.......,,,,........*........#',
      '##############################',
    ],
    guards: [
      { waypoints: [[2, 2], [6, 2]], pause: 0.7 },
      { waypoints: [[9, 2], [15, 2]], pause: 0.7 },
      { waypoints: [[19, 2], [27, 2]], pause: 0.7 },
      { waypoints: [[2, 15], [27, 15]], pause: 0.9 },
    ],
    loot: [[13, 8], [20, 10], [6, 16], [25, 5], [14, 17]],
  },
];

// shots.js — deterministic scenes for screenshots: ?shot=start shows the
// title over the first level, ?shot=play drops the thief mid-heist with a
// guard's cone sweeping past, ?shot=end shows the win screen. Every scene
// is built from the game's own code, with fixed positions and a fixed seed,
// so the same shot always renders the same frame.

export function applyShot(game, name) {
  const player = game.player;
  const guards = game.guards;
  if (name === 'start') {
    game.state = 'title';
    return;
  }
  if (name === 'play') {
    game.state = 'playing';
    // The thief crouches behind a statue near the centre of the hall while
    // the first guard's cone sweeps past; suspicion is halfway up.
    player.x = 9 * 32 + 16;
    player.y = 10 * 32 + 16;
    player.sneaking = true;
    player.facing = Math.PI / 2;
    player.coins = 2;
    player.lootTaken = 1;
    const guard = guards[0];
    guard.x = 14 * 32 + 16;
    guard.y = 8 * 32 + 16;
    guard.facing = Math.PI / 2;
    guard.suspicion = 46;
    guard.state = 'patrol';
    const guard2 = guards[1];
    guard2.x = 24 * 32 + 16;
    guard2.y = 9 * 32 + 16;
    guard2.facing = -Math.PI / 2;
    guard2.suspicion = 12;
    game.elapsed = 87;
    game.addToast('A guard is getting curious...', '#ffb020');
    return;
  }
  if (name === 'end') {
    game.state = 'won';
    game.elapsed = 214;
    player.hasSapphire = true;
    player.lootTaken = 2;
    player.coins = 1;
    player.coinsThrown = 2;
    player.x = 28 * 32 + 16;
    player.y = 1 * 32 + 16;
    return;
  }
  // Unknown shot name: fall back to the title.
  game.state = 'title';
}

export function shotFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

export function seedFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const seed = Number.parseInt(params.get('seed') || '1', 10);
  return Number.isFinite(seed) ? seed : 1;
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shell = read('dist/table/pool-shell.js');
const KEY = '&g=20261116-gridhold1';

/* Run the REAL tail of updateResult(): the preview/hold declarations plus the
   reveal() requestAnimationFrame loop. Only the surrounding module state and
   DOM probes are mocked, so the 900ms budget itself is exercised. */
function harness({grid, connectFour, kind, isPool = false, game, animationEnds = 0}) {
  const begin = shell.indexOf('  if(resultShown||resultFrame)return;');
  const end = shell.indexOf('  resultFrame=requestAnimationFrame(reveal);', begin);
  assert.ok(begin >= 0 && end > begin, 'updateResult reveal tail is extractable');
  const source = shell.slice(begin, end + '  resultFrame=requestAnimationFrame(reveal);'.length);

  const frames = [];
  const calls = {open: [], celebrate: 0, appends: 0};
  let now = 0;
  const boardNode = {
    _fourDropAnimating: false, _animating: false, _striking: false,
    querySelectorAll: () => [{getAnimations: () => [{playState: now < animationEnds ? 'running' : 'finished'}]}],
    querySelector: () => null
  };
  const document = {
    hidden: false,
    body: {
      dataset: {screen: 'play'},
      classList: {contains: c => c === 'connect-four-game' ? connectFour : c === game+'-game'},
      append: () => { calls.appends++; }
    },
    querySelector: () => null
  };
  const ctx = vm.createContext({
    document, console,
    $: () => boardNode,
    gridResult: grid, isPool, archived: false,
    details: {kind, winner: kind === 'draw' ? 0 : 1},
    resultShown: false, resultFrame: 0, resultKey: 'k', key: 'k',
    current: {board: {over: true}},
    shell: {resultReopen: {hidden: true}, confetti: {}, resultDialog: {}},
    openResult: () => calls.open.push(now),
    celebrateResult: () => { calls.celebrate++; },
    requestAnimationFrame: cb => { frames.push(cb); return frames.length; }
  });
  /* The excerpt is a function tail, so wrap it: a bare top-level `return` is
     illegal in a vm Script. All module state above lives in the context. */
  vm.runInContext('(function(){\n' + source + '\n})()', ctx);

  const drive = timestamps => {
    for (const t of timestamps) {
      now = t;
      const cb = frames.pop();
      frames.length = 0;
      if (!cb) break;
      cb(t);
      if (calls.open.length) break;
    }
    return {openedAt: calls.open[0] ?? null, calls};
  };
  return {drive, calls};
}

test('a grid win/loss holds the finished board for 900ms before the dialog', () => {
  for (const kind of ['win', 'loss']) {
    const h = harness({grid: true, connectFour: false, kind});
    const out = h.drive([0, 100, 400, 880, 899, 900]);
    assert.equal(out.openedAt, 900, kind + ': dialog opens at 900ms');
    assert.equal(out.calls.celebrate, 0, kind + ': no pool-style confetti preview');
    assert.equal(out.calls.appends, 0, kind + ': the board is not covered by a confetti layer');
  }
});

test('a draw still opens immediately and pool/connect-four keep their own previews', () => {
  const draw = harness({grid: true, connectFour: false, kind: 'draw'});
  assert.equal(draw.drive([16]).openedAt, 16, 'draw is instant');

  const pool = harness({grid: false, connectFour: false, kind: 'win', isPool: true});
  const poolOut = pool.drive([0, 500, 1500, 2999, 3000]);
  assert.equal(poolOut.openedAt, 3000, 'pool keeps its 3000ms preview');
  assert.equal(poolOut.calls.celebrate, 1, 'pool still starts the board confetti');

  const four = harness({grid: false, connectFour: true, kind: 'win'});
  assert.equal(four.drive([0, 800, 1599, 1600]).openedAt, 1600,
    'connect four keeps its 1600ms drop preview');
});

test('the hold only starts after the animation guards clear, and never leaks into non-grid games', () => {
  assert.match(shell,
    /const gridHoldMs=gridResult&&!connectFour&&details\.kind!=='draw'\?900:0;/,
    'the 900ms budget is scoped to grid games, non-connect-four, non-draw');
  assert.match(shell, /const previewDuration=connectFour\?1600:3000;/,
    'existing preview durations are untouched');
  const tail = shell.slice(shell.indexOf('const reveal=now=>{'));
  const guardEnd = tail.indexOf('{resultFrame=requestAnimationFrame(reveal);return;}');
  const holdStart = tail.indexOf('if(gridHoldMs){');
  assert.ok(guardEnd >= 0 && holdStart > guardEnd,
    'the hold timer starts only after the board animation guards pass');
  assert.match(tail, /if\(now-holdStartedAt<gridHoldMs\)\{resultFrame=requestAnimationFrame\(reveal\);return;\}/);
});

test('both table hosts and both pool-shell imports pull the rebuilt scripts', () => {
  const hosts = [
    ['dist/table/table.js', /pool-shell\.js\?v=20261115-joincoin1[^"']*/],
    ['dist/pool-result-preview.html', /pool-shell\.js\?v=20261115-joincoin1[^"']*/],
    ['dist/table/index.html', /table\.js\?v=20261115-joincoin1[^"']*/],
    ['dist/portal/native-table.html', /table\.js\?v=20261115-joincoin1[^"']*/]
  ];
  for (const [file, re] of hosts) {
    const text = read(file);
    const url = text.match(re)?.[0] || '';
    assert.ok(url.includes(KEY), file + ': missing ' + KEY + ' -> ' + url);
    assert.ok(url.includes('v=20261115-joincoin1'), file + ': frozen v= chain preserved');
  }
  assert.match(read('dist/table/index.html'), /&b=20261116-prefetch1/,
    'the leaderboard-prefetch key is still present');
  assert.match(read('dist/table/table.js'), /&c=20261116-fastcount1/,
    'the fast-count key is still present');
});

test('Gomoku and XO wait for their win animation before holding the board', () => {
  const gomoku = harness({grid:true, kind:'win', game:'gomoku', animationEnds:500});
  assert.equal(gomoku.drive([0,499,500,1399,1400]).openedAt,1400);
  const xo = harness({grid:false, kind:'loss', game:'xo', animationEnds:850});
  assert.equal(xo.drive([0,849,850,1299,1300]).openedAt,1300);
});

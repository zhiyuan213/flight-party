(() => {
  const title = document.getElementById('hero-title');
  const rules = document.querySelector('.intro-bottom > .rules');
  if (!title || !rules) return;

  const help = document.createElement('div');
  help.className = 'game-rules-help';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = '?';
  button.setAttribute('aria-label', '怎么玩 / How to play');
  button.setAttribute('aria-controls', 'game-rules-panel');
  button.setAttribute('aria-expanded', 'false');
  rules.closest('.intro-bottom').classList.add('rules-moved');
  rules.id = 'game-rules-panel';
  rules.hidden = true;
  const description = document.getElementById('hero-description');
  if (description) description.hidden = true;
  help.append(button, rules);
  const row = document.createElement('div');
  row.className = 'game-rules-title';
  title.before(row);
  row.append(title, help);

  if (document.documentElement.dataset.nativeGame === 'flight') {
    title.innerHTML = '<span class="native-en">Flight Party</span><span class="native-zh">飞行棋</span>';
    const cover = document.createElement('img');
    cover.className = 'flight-detail-cover';
    cover.src = '/assets/covers/flight-3d-20261123.jpg';
    cover.alt = '';
    cover.width = cover.height = 200;
    row.before(cover);
  }

  let pinned = false;
  function show(open) {
    rules.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  }
  help.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') show(true);
  });
  help.addEventListener('pointerleave', () => { if (!pinned) show(false); });
  button.addEventListener('click', () => { pinned = !pinned; show(pinned); });
  document.addEventListener('click', event => {
    if (!help.contains(event.target)) { pinned = false; show(false); }
  });
  help.addEventListener('keydown', event => {
    if (event.key === 'Escape') { pinned = false; show(false); button.focus(); }
  });
})();

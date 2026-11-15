/* In-page language picker.

   Chrome renders a native <select> dropdown as an OS-level popup, whose item
   labels cannot be centred with CSS. This wraps the existing #portal-language
   in a DOM menu so both the closed label and the two options are centred.

   The native <select> stays in the DOM as the single source of truth: picking
   an item sets its value and dispatches a bubbling `change` event, so the
   existing handlers in legal-language.js and portal/portal.js (locale,
   localStorage, iframe postMessage, document title) keep working untouched.

   Progressive enhancement: the native select is hidden only after this script
   has successfully mounted the menu. If the script never runs, the original
   control is still visible and usable. */
(function () {
  var select = document.getElementById('portal-language');
  if (!select || select.getAttribute('data-lang-picker') === '1') return;
  select.setAttribute('data-lang-picker', '1');

  var LABELS = {en: 'English', zh: '中文'};
  var wrap = document.createElement('div');
  wrap.className = 'lang-picker';
  select.parentNode.insertBefore(wrap, select);
  wrap.appendChild(select);

  var trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'lang-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  /* No dropdown chevron: the trigger is a plain centred language label.
     The whole button still opens the menu on click / keyboard. */
  trigger.innerHTML = '<span class="lang-trigger-label"></span>';

  var menu = document.createElement('div');
  menu.className = 'lang-menu';
  menu.setAttribute('role', 'listbox');
  menu.hidden = true;
  ['en', 'zh'].forEach(function (lang) {
    var option = document.createElement('button');
    option.type = 'button';
    option.className = 'lang-option';
    option.setAttribute('role', 'option');
    option.setAttribute('data-lang', lang);
    option.textContent = LABELS[lang];
    menu.appendChild(option);
  });
  wrap.appendChild(trigger);
  wrap.appendChild(menu);

  var label = trigger.querySelector('.lang-trigger-label');
  var options = Array.prototype.slice.call(menu.querySelectorAll('[data-lang]'));

  function current() { return select.value === 'zh' ? 'zh' : 'en'; }
  function sync() {
    var lang = current();
    label.textContent = LABELS[lang];
    trigger.setAttribute('aria-label', lang === 'zh' ? '语言：中文' : 'Language: English');
    options.forEach(function (option) {
      var on = option.getAttribute('data-lang') === lang;
      option.setAttribute('aria-selected', String(on));
      option.classList.toggle('is-selected', on);
    });
  }
  function open() {
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
  }
  function close() {
    menu.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('is-open');
  }

  trigger.addEventListener('click', function (event) {
    event.stopPropagation();
    if (menu.hidden) open(); else close();
  });
  trigger.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
      options[0].focus();
    }
  });
  menu.addEventListener('click', function (event) {
    var option = event.target.closest ? event.target.closest('[data-lang]') : null;
    if (!option || !menu.contains(option)) return;
    var next = option.getAttribute('data-lang');
    if (select.value !== next) {
      select.value = next;
      select.dispatchEvent(new Event('change', {bubbles: true}));
    }
    sync();
    close();
    trigger.focus();
  });
  menu.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { close(); trigger.focus(); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    var index = options.indexOf(document.activeElement);
    var step = event.key === 'ArrowDown' ? 1 : -1;
    options[(index + step + options.length) % options.length].focus();
  });
  document.addEventListener('click', function (event) {
    if (!wrap.contains(event.target)) close();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !menu.hidden) { close(); trigger.focus(); }
  });
  /* Other code (iframe locale messages, first-frame bootstrap) can set
     data-locale / lang without dispatching change. Mirror those updates. */
  new MutationObserver(sync).observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-locale', 'lang']
  });
  select.addEventListener('change', sync);
  select.classList.add('portal-language-native');
  select.setAttribute('aria-hidden', 'true');
  select.tabIndex = -1;
  sync();
})();

// Page interactions: preloader, scroll reveal, scroll-spy, theme toggle, mobile menu, typed role,
// project carousel, project filters, stage tabs and diagrams.
// Every effect degrades to a usable static page: no JS, touch input and reduced motion all work.

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initInteractions(): void {
  setIndexVars();
  initTheme();
  initMenu();
  initReveal();
  initScrollSpy();
  initTyped();
  initFilters();
  initOperate();
  initDiagrams();
  initCarousels();
  initPreloader();
}

// ---------- preloader ----------
function initPreloader(): void {
  const el = document.getElementById('preloader');
  if (!el) return;
  const done = () => {
    el.classList.add('is-done');
    window.setTimeout(() => el.remove(), 600);
  };
  if (reduceMotion() || document.readyState === 'complete') done();
  else {
    window.addEventListener('load', done, { once: true });
    window.setTimeout(done, 1500); // never hold the page longer than this
  }
}

// ---------- project carousel ----------
function initCarousels(): void {
  document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((root) => {
    const track = root.querySelector<HTMLElement>('[data-track]');
    const prev = root.querySelector<HTMLButtonElement>('[data-prev]');
    const next = root.querySelector<HTMLButtonElement>('[data-next]');
    const dotsWrap = root.querySelector<HTMLElement>('[data-dots]');
    if (!track) return;
    const slides = [...track.children] as HTMLElement[];
    const step = () => (slides[0]?.getBoundingClientRect().width ?? 300) + parseFloat(getComputedStyle(track).columnGap || '0');

    const dots = slides.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carousel-dot';
      b.setAttribute('aria-label', `Go to project ${i + 1} of ${slides.length}`);
      b.addEventListener('click', () => track.scrollTo({ left: i * step(), behavior: reduceMotion() ? 'auto' : 'smooth' }));
      dotsWrap?.append(b);
      return b;
    });

    const sync = () => {
      const max = track.scrollWidth - track.clientWidth;
      const i = Math.round(track.scrollLeft / step());
      dots.forEach((d, j) => d.setAttribute('aria-current', String(i === j)));
      if (prev) prev.disabled = track.scrollLeft <= 8;
      if (next) next.disabled = track.scrollLeft >= max - 8;
    };
    const go = (dir: number) => track.scrollBy({ left: dir * step(), behavior: reduceMotion() ? 'auto' : 'smooth' });
    prev?.addEventListener('click', () => go(-1));
    next?.addEventListener('click', () => go(1));
    track.addEventListener('scroll', () => requestAnimationFrame(sync), { passive: true });
    window.addEventListener('resize', sync);

    // Mouse drag to scroll; touch already scrolls natively.
    let startX = 0;
    let startLeft = 0;
    let dragging = false;
    let moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true;
      moved = false;
      startX = e.clientX;
      startLeft = track.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4 && !moved) {
        moved = true;
        track.classList.add('is-dragging');
      }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (moved) {
        track.classList.remove('is-dragging');
        const snap = Math.round(track.scrollLeft / step()) * step();
        track.scrollTo({ left: snap, behavior: reduceMotion() ? 'auto' : 'smooth' });
        // The click that follows this pointerup is swallowed below; reset afterwards.
        window.setTimeout(() => (moved = false), 0);
      }
    });
    // A drag must not also follow the card link.
    track.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    sync();
  });
}

/** Stagger index for reveal animations, set through CSSOM so the CSP needs no inline styles. */
function setIndexVars(): void {
  document.querySelectorAll<HTMLElement>('[data-i]').forEach((el) => el.style.setProperty('--i', el.dataset.i ?? '0'));
}

// ---------- theme ----------
function initTheme(): void {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const root = document.documentElement;
  const sync = () => {
    const dark = root.dataset.theme !== 'light';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0d10' : '#f4f5f7');
  };
  btn.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try {
      localStorage.setItem('theme', root.dataset.theme);
    } catch {
      /* storage blocked */
    }
    sync();
    window.dispatchEvent(new Event('themechange'));
  });
  sync();
}

// ---------- mobile menu ----------
function initMenu(): void {
  const btn = document.getElementById('menu-btn');
  const nav = document.getElementById('primary-nav');
  if (!btn || !nav) return;
  const set = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
  };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) set(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      set(false);
      btn.focus();
    }
  });
}

// ---------- reveal on scroll ----------
function initReveal(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (reduceMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

// ---------- scroll spy + progress ----------
function initScrollSpy(): void {
  const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav]')];
  const indicator = document.querySelector<HTMLElement>('.nav-indicator');
  const bar = document.getElementById('scroll-progress-bar');
  const header = document.getElementById('site-header');
  const stages = [...document.querySelectorAll<HTMLElement>('section[data-stage]')];

  const moveIndicator = (a: HTMLAnchorElement | undefined) => {
    if (!indicator) return;
    if (!a || !a.offsetParent) {
      indicator.classList.remove('is-visible');
      return;
    }
    indicator.classList.add('is-visible');
    indicator.style.setProperty('--x', `${a.offsetLeft}px`);
    indicator.style.setProperty('--w', `${a.offsetWidth}px`);
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    bar?.style.setProperty('--p', String(max > 0 ? window.scrollY / max : 0));
    header?.classList.toggle('is-scrolled', window.scrollY > 40);

    const probe = window.innerHeight * 0.35;
    let current: string | undefined;
    for (const s of stages) {
      const r = s.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) current = s.dataset.stage;
    }
    let active: HTMLAnchorElement | undefined;
    links.forEach((a) => {
      const on = a.dataset.nav === current;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'location');
        active = a;
      } else a.removeAttribute('aria-current');
    });
    if (!active && location.pathname.startsWith('/projects')) {
      active = links.find((a) => a.dataset.nav === 'projects');
      active?.classList.add('is-active');
    }
    moveIndicator(active);
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// ---------- typed role ----------
function initTyped(): void {
  const el = document.getElementById('typed');
  if (!el || reduceMotion()) return;
  let roles: string[] = [];
  try {
    roles = JSON.parse(el.dataset.roles ?? '[]');
  } catch {
    return;
  }
  if (roles.length < 2) return;
  let r = 0;
  let c = roles[0].length;
  let deleting = true;
  const step = () => {
    const word = roles[r];
    c += deleting ? -1 : 1;
    el.textContent = word.slice(0, c);
    let delay = deleting ? 35 : 70;
    if (!deleting && c === word.length) {
      deleting = true;
      delay = 2200;
    } else if (deleting && c === 0) {
      deleting = false;
      r = (r + 1) % roles.length;
      delay = 300;
    }
    window.setTimeout(step, delay);
  };
  window.setTimeout(step, 2600);
}

// ---------- project filters ----------
function initFilters(): void {
  const chips = [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  if (!chips.length) return;
  const cards = [...document.querySelectorAll<HTMLElement>('.project-card[data-domains]')];
  const groups = [...document.querySelectorAll<HTMLElement>('[data-group]')];
  const count = document.getElementById('filter-count');
  const empty = document.getElementById('filter-empty');
  const apply = (f: string) => {
    chips.forEach((c) => {
      const on = c.dataset.filter === f;
      c.classList.toggle('is-active', on);
      c.setAttribute('aria-pressed', String(on));
    });
    let shown = 0;
    cards.forEach((card) => {
      const match = f === 'all' || (card.dataset.domains ?? '').split(' ').includes(f);
      card.hidden = !match;
      if (match) {
        shown++;
        card.classList.add('is-in');
      }
    });
    groups.forEach((g) => (g.hidden = !g.querySelector('.project-card:not([hidden])')));
    if (count) count.textContent = `${shown} project${shown === 1 ? '' : 's'} shown`;
    if (empty) empty.hidden = shown > 0;
  };
  chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.filter ?? 'all')));
}

// ---------- "how I work" stage tabs ----------
function initOperate(): void {
  document.querySelectorAll<HTMLElement>('[data-operate]').forEach((root) => {
    const tabs = [...root.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const select = (i: number, focus = false) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        t.classList.toggle('is-past', j < i);
        const panel = document.getElementById(t.getAttribute('aria-controls') ?? '');
        if (panel) panel.hidden = !on;
      });
      root.style.setProperty('--progress', String(tabs.length > 1 ? i / (tabs.length - 1) : 0));
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown') select((i + 1) % tabs.length, true);
        else if (k === 'ArrowLeft' || k === 'ArrowUp') select((i - 1 + tabs.length) % tabs.length, true);
        else if (k === 'Home') select(0, true);
        else if (k === 'End') select(tabs.length - 1, true);
        else return;
        e.preventDefault();
      });
    });
    select(0);
  });
}

// ---------- architecture diagrams ----------
function initDiagrams(): void {
  document.querySelectorAll<HTMLElement>('[data-arch]').forEach((fig) => {
    const nodes = [...fig.querySelectorAll<SVGGElement>('[data-node]')];
    const edges = [...fig.querySelectorAll<SVGGElement>('.arch-edge')];
    const title = fig.querySelector<HTMLElement>('[data-arch-title]');
    const text = fig.querySelector<HTMLElement>('[data-arch-text]');
    let pinned: string | null = null;

    const highlight = (id: string | null) => {
      fig.classList.toggle('has-focus', id !== null);
      const linked = new Set<string>();
      edges.forEach((e) => {
        const on = id !== null && (e.dataset.from === id || e.dataset.to === id);
        e.classList.toggle('is-on', on);
        if (on) {
          linked.add(e.dataset.from!);
          linked.add(e.dataset.to!);
        }
      });
      nodes.forEach((n) => {
        n.classList.toggle('is-on', n.dataset.node === id);
        n.classList.toggle('is-linked', linked.has(n.dataset.node!) && n.dataset.node !== id);
      });
      const node = nodes.find((n) => n.dataset.node === id);
      if (title && text) {
        title.textContent = node ? node.dataset.label ?? '' : 'Select a component';
        text.textContent = node ? node.dataset.note ?? '' : 'to see what it does.';
      }
    };

    nodes.forEach((n) => {
      const id = n.dataset.node!;
      n.addEventListener('mouseenter', () => highlight(id));
      n.addEventListener('mouseleave', () => highlight(pinned));
      n.addEventListener('focus', () => highlight(id));
      n.addEventListener('blur', () => highlight(pinned));
      const toggle = () => {
        pinned = pinned === id ? null : id;
        highlight(pinned ?? id);
      };
      n.addEventListener('click', toggle);
      n.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    });
  });
}

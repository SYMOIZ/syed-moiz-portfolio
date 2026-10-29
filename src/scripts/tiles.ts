// Page-wide tile grid. An invisible, tilted grid lies under the page; tiles light up in signal
// colours as the cursor passes and fade back out, leaving a short trail. The hero is skipped
// because it has its own ripple. Fine pointers only; nothing runs for touch or reduced motion.

interface Lit {
  col: number;
  row: number;
  born: number;
  color: string;
}

const TILE = 52; // tile edge in px before the tilt
const ANGLE = (-24 * Math.PI) / 180; // grid rotation
const SQUASH = 0.62; // vertical foreshortening to suggest a floor plane
const LIFE = 1100; // ms a tile stays lit

export function initTileField(): void {
  const canvas = document.getElementById('tile-field') as HTMLCanvasElement | null;
  const ctx = canvas?.getContext('2d');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!canvas || !ctx || !fine || reduce) return;

  // Affine grid basis: u along one tile edge, v along the other.
  const cos = Math.cos(ANGLE);
  const sin = Math.sin(ANGLE);
  const ux = TILE * cos;
  const uy = TILE * sin * SQUASH;
  const vx = -TILE * sin;
  const vy = TILE * cos * SQUASH;
  const det = ux * vy - uy * vx;

  const lit = new Map<string, Lit>();
  let palette = readPalette();
  let colorIndex = 0;
  let raf = 0;
  let w = 0;
  let h = 0;

  function readPalette(): string[] {
    const cs = getComputedStyle(document.documentElement);
    return ['--ok', '--info', '--warn', '--accent-2'].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas!.width = Math.floor(w * dpr);
    canvas!.height = Math.floor(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Grid is anchored to the document, so tiles scroll with the page.
  const toCell = (px: number, py: number) => {
    const x = px;
    const y = py + window.scrollY;
    return {
      col: Math.floor((x * vy - y * vx) / det),
      row: Math.floor((ux * y - uy * x) / det),
    };
  };

  const corner = (c: number, r: number) => ({ x: c * ux + r * vx, y: c * uy + r * vy - window.scrollY });

  function light(px: number, py: number) {
    const { col, row } = toCell(px, py);
    const key = `${col}:${row}`;
    const now = performance.now();
    const existing = lit.get(key);
    if (existing && now - existing.born < LIFE * 0.4) return;
    lit.set(key, { col, row, born: now, color: palette[colorIndex++ % palette.length] });
    if (!raf) raf = requestAnimationFrame(draw);
  }

  function draw(now: number) {
    ctx!.clearRect(0, 0, w, h);
    for (const [key, t] of lit) {
      const age = (now - t.born) / LIFE;
      if (age >= 1) {
        lit.delete(key);
        continue;
      }
      const a = corner(t.col, t.row);
      const b = corner(t.col + 1, t.row);
      const c = corner(t.col + 1, t.row + 1);
      const d = corner(t.col, t.row + 1);
      const ease = 1 - age;
      const lift = Math.sin(Math.min(1, age * 3) * Math.PI) * 5; // brief pop upward
      ctx!.globalAlpha = 0.85 * ease * ease;
      ctx!.fillStyle = t.color;
      ctx!.beginPath();
      ctx!.moveTo(a.x, a.y - lift);
      ctx!.lineTo(b.x, b.y - lift);
      ctx!.lineTo(c.x, c.y - lift);
      ctx!.lineTo(d.x, d.y - lift);
      ctx!.closePath();
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
    raf = lit.size ? requestAnimationFrame(draw) : 0;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('themechange', () => (palette = readPalette()));
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if ((e.target as Element | null)?.closest?.('.hero, .chaos-console')) return;
      light(e.clientX, e.clientY);
    },
    { passive: true },
  );
  window.addEventListener('scroll', () => {
    if (lit.size && !raf) raf = requestAnimationFrame(draw);
  }, { passive: true });
}

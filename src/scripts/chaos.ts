// Chaos Mode: a simulated production incident the visitor resolves from an on-call console.
// Everything here is cosmetic. Sections are visually "degraded" but stay readable,
// links and navigation keep working, and Esc or the close button always recovers the page.

type ScenarioId = 'bad-deploy' | 'traffic-spike' | 'security-alert';
type Metric = 'errors' | 'latency' | 'cpu';

interface MetricSet {
  errors: number;
  latency: number;
  cpu: number;
}

interface Scenario {
  id: ScenarioId;
  title: string;
  sev: string;
  alarm: string;
  target: string; // data-section to degrade
  chartMetric: Metric;
  threshold: number;
  incident: MetricSet;
  logs: string[];
  deploys: string[];
  top: string[];
  hint: string;
  fix: RegExp;
  fixCommand: string;
  fixOutput: string[];
  wrong: Record<string, string[]>;
  rootCause: string;
  remediation: string;
  aboutMe: string;
}

const BASELINE: MetricSet = { errors: 0.2, latency: 120, cpu: 22 };
const ATTACKER_IP = '203.0.113.42'; // documentation-only TEST-NET-3 address
const AUTO_HEAL_MS = 3 * 60 * 1000;
const STORAGE_KEY = 'chaos-resolved';

const SCENARIOS: Scenario[] = [
  {
    id: 'bad-deploy',
    title: 'Bad deploy',
    sev: 'SEV-2',
    alarm: 'ALARM 5xxErrorRate > 5% for 3 datapoints on portfolio-web',
    target: 'projects',
    chartMetric: 'errors',
    threshold: 5,
    incident: { errors: 38, latency: 340, cpu: 41 },
    logs: [
      'ERROR  GET /#projects 500  TypeError: cannot read properties of undefined (reading "projects")',
      'ERROR  render failed in ProjectsGrid  build=v2.4.1',
      'WARN   health check /healthz degraded: 3/5 targets failing',
      'INFO   deployment v2.4.1 completed 3m ago',
    ],
    deploys: [
      'v2.4.1   3 min ago   status=SUCCEEDED   author=ci-pipeline   <- current',
      'v2.4.0   2 days ago  status=SUCCEEDED   author=ci-pipeline',
    ],
    top: ['instances: 3/3 running   cpu: 41%   mem: 48%', 'capacity looks healthy, the errors are not load-related'],
    hint: 'The errors started right after a release. Check `deploys` and think about undoing it.',
    fix: /^(rollback|roll back|rollback v2\.4\.0|deploy v2\.4\.0)$/,
    fixCommand: 'rollback',
    fixOutput: [
      'Rolling back portfolio-web to v2.4.0 ...',
      'Traffic shifted 10% → 50% → 100% to v2.4.0',
      'Health checks passing 5/5. Error rate returning to baseline.',
    ],
    wrong: {
      restart: ['Restarting 3 tasks ...', 'Errors dipped for a few seconds and climbed back. The broken build is still the one running.'],
      'scale out': ['Added 2 instances running v2.4.1.', 'More copies of the same broken build. Error rate unchanged.'],
    },
    rootCause: 'Release v2.4.1 shipped a rendering bug in the Projects section.',
    remediation: 'Rolled back to the last known-good release (v2.4.0), then verified health checks.',
    aboutMe:
      'Deployment pipelines are home turf for me. As a Cloud Data Engineer at SEBKO Solution I built and maintained deployment pipelines and automated infrastructure and deployments, which improved processing and deployment time.',
  },
  {
    id: 'traffic-spike',
    title: 'Traffic spike',
    sev: 'SEV-2',
    alarm: 'ALARM p99Latency > 1000 ms for 5 datapoints on portfolio-web',
    target: 'skills',
    chartMetric: 'latency',
    threshold: 1000,
    incident: { errors: 4, latency: 2400, cpu: 97 },
    logs: [
      'WARN   request queue depth 1,842 (limit 500)',
      'WARN   upstream timeout after 2,000 ms  GET /#skills',
      'INFO   requests/min 48,000 (7-day avg 1,200). Someone shared the link',
      'INFO   no deployments in the last 48h',
    ],
    deploys: ['v2.4.0   2 days ago  status=SUCCEEDED   author=ci-pipeline   <- current', 'No recent changes. This is not a code problem.'],
    top: ['instances: 3/3 running   cpu: 97%   mem: 88%', 'all instances saturated, requests are queueing'],
    hint: 'Nothing was deployed recently and every instance is pegged at ~97% CPU. Add capacity.',
    fix: /^(scale out|scale-out|scale|scale up|scale out \d+)$/,
    fixCommand: 'scale out',
    fixOutput: [
      'Desired capacity 3 → 8 ...',
      'New instances passed health checks and joined the target group.',
      'Queue draining. p99 latency falling.',
    ],
    wrong: {
      rollback: ['Rolling back to v2.3.9 ...', 'No change. The last deploy was 2 days ago. The load is the problem, not the code.'],
      restart: ['Restarting under load ...', 'Capacity dropped while tasks restarted. p99 got worse for 20 seconds.'],
    },
    rootCause: 'A sudden traffic spike (40× normal) saturated a fixed-size fleet.',
    remediation: 'Scaled out horizontally, then confirmed latency and queue depth recovered.',
    aboutMe:
      'High-volume data is something I have built for. My AWS IoT Data Pipeline project streams data through Kafka into Snowflake, provisioned with Terraform and monitored with CloudWatch.',
  },
  {
    id: 'security-alert',
    title: 'Security alert',
    sev: 'SEV-1',
    alarm: `ALARM FailedLogins > 200/min from a single source on bastion-host`,
    target: 'about',
    chartMetric: 'errors',
    threshold: 5,
    incident: { errors: 12, latency: 260, cpu: 64 },
    logs: [
      `AUTH   Failed password for root from ${ATTACKER_IP} port 52114 ssh2`,
      `AUTH   Failed password for admin from ${ATTACKER_IP} port 52119 ssh2`,
      `AUTH   Failed password for ubuntu from ${ATTACKER_IP} port 52131 ssh2`,
      `IDS    rule 5712 fired: brute-force attempt, 1,204 failures in 5 min, source ${ATTACKER_IP}`,
    ],
    deploys: ['v2.4.0   2 days ago  status=SUCCEEDED   author=ci-pipeline   <- current', 'No recent changes.'],
    top: ['bastion-host cpu: 64%   sshd processes: 312', `top talker: ${ATTACKER_IP} (98% of auth traffic)`],
    hint: `One IP is behind almost every failed login. Try \`block ${ATTACKER_IP}\`.`,
    fix: new RegExp(`^(block|block ip|deny|deny ip)\\s+${ATTACKER_IP.replace(/\./g, '\\.')}$`),
    fixCommand: `block ${ATTACKER_IP}`,
    fixOutput: [
      `Adding deny rule for ${ATTACKER_IP}/32 to the network ACL ...`,
      'Rule applied. Failed logins dropping to zero.',
      'Next steps: rotate keys, review IAM access, keep SSH closed to the internet.',
    ],
    wrong: {
      restart: ['Restarting sshd ...', 'The attacker reconnected within seconds. Failed logins continue.'],
      rollback: ['Rolling back ...', 'No change. This is an attack, not a bad release.'],
      'scale out': ['Added capacity.', 'You are now absorbing the brute-force attempts on more hosts. Not a fix.'],
    },
    rootCause: `A brute-force SSH attack from ${ATTACKER_IP} against an internet-facing host.`,
    remediation: 'Blocked the source at the network layer, then planned hardening: key rotation and least-privilege access.',
    aboutMe:
      'Threat detection is research territory for me. I co-authored "Security and Threat Detection through Cloud-Based Wazuh Deployment", published by IEEE in April 2024.',
  },
];

const HISTORY = 60;

export function initChaos(): void {
  const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

  const consoleEl = $('chaos-console');
  const trigger = $<HTMLButtonElement>('chaos-trigger');
  if (!consoleEl || !trigger) return;

  const badge = $('status-badge');
  const statusText = $('status-text');
  const views = { pick: $('cc-pick'), incident: $('cc-incident'), postmortem: $('cc-postmortem') };
  const scenarioList = $('cc-scenarios');
  const alertEl = $('cc-alert');
  const logEl = $('cc-log');
  const form = $<HTMLFormElement>('cc-form');
  const input = $<HTMLInputElement>('cc-cmd');
  const line = document.getElementById('cc-line') as unknown as SVGPolylineElement;
  const threshold = document.getElementById('cc-threshold') as unknown as SVGLineElement;
  const chartLabel = $('cc-chart-label');
  const scoreEl = $('cc-score');
  const pmEl = $('cc-pm');
  const metricEls = { errors: $('m-errors'), latency: $('m-latency'), cpu: $('m-cpu'), clock: $('m-clock') };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let active: Scenario | null = null;
  let resolving = false;
  let healedBy: 'visitor' | 'auto' = 'visitor';
  let values: MetricSet = { ...BASELINE };
  let series: number[] = [];
  let startedAt = 0;
  let commandsRun = 0;
  let tickTimer: number | undefined;
  let logTimer: number | undefined;
  let healTimer: number | undefined;
  let logCursor = 0;
  let lastFocus: HTMLElement | null = null;
  const resolved = new Set<ScenarioId>(loadResolved());

  // ---------- persistence (best-effort only) ----------
  function loadResolved(): ScenarioId[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((id) => SCENARIOS.some((s) => s.id === id)) : [];
    } catch {
      return [];
    }
  }
  function saveResolved(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...resolved]));
    } catch {
      /* storage blocked: progress just won't persist */
    }
  }

  // ---------- view helpers ----------
  function show(view: keyof typeof views): void {
    for (const [name, el] of Object.entries(views)) el.hidden = name !== view;
  }

  function renderScore(): void {
    scoreEl.textContent = `${resolved.size}/${SCENARIOS.length} resolved`;
  }

  function renderScenarioList(): void {
    scenarioList.replaceChildren(
      ...SCENARIOS.map((s) => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scenario-btn';
        btn.dataset.scenario = s.id;
        const done = resolved.has(s.id);
        btn.innerHTML = `<span class="sev sev-${s.sev === 'SEV-1' ? '1' : '2'}">${s.sev}</span>
          <span class="scenario-title">${s.title}</span>
          <span class="scenario-state mono">${done ? '✓ resolved' : 'inject →'}</span>`;
        btn.addEventListener('click', () => startIncident(s));
        li.append(btn);
        return li;
      }),
    );
  }

  function print(text: string, kind: 'out' | 'cmd' | 'err' | 'ok' | 'sys' = 'out'): void {
    const li = document.createElement('li');
    li.className = `log-${kind}`;
    li.textContent = text;
    logEl.append(li);
    while (logEl.children.length > 120) logEl.firstElementChild?.remove();
    logEl.scrollTop = logEl.scrollHeight;
  }

  function fmtClock(ms: number): string {
    const s = Math.floor(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // ---------- page-level incident effects ----------
  function setStatus(state: 'ok' | 'down' | 'recovering', text: string): void {
    badge.dataset.state = state;
    statusText.textContent = text;
  }

  function degrade(target: string | null): void {
    document.querySelectorAll<HTMLElement>('[data-section]').forEach((sec) => {
      const on = sec.dataset.section === target;
      sec.classList.toggle('is-degraded', on);
      const banner = sec.querySelector<HTMLElement>('.degraded-banner');
      if (banner) banner.hidden = !on;
    });
    document.body.classList.toggle('incident-active', target !== null);
  }

  // ---------- metrics simulation ----------
  function chartMax(s: Scenario): number {
    return Math.max(s.incident[s.chartMetric], s.threshold) * 1.25;
  }

  function drawChart(): void {
    if (!active) return;
    const max = chartMax(active);
    const step = 300 / (HISTORY - 1);
    const offset = HISTORY - series.length;
    line.setAttribute(
      'points',
      series.map((v, i) => `${((i + offset) * step).toFixed(1)},${(80 - (v / max) * 76).toFixed(1)}`).join(' '),
    );
    const ty = (80 - (active.threshold / max) * 76).toFixed(1);
    threshold.setAttribute('y1', ty);
    threshold.setAttribute('y2', ty);
    line.classList.toggle('is-alarm', series[series.length - 1] > active.threshold);
  }

  function renderMetrics(): void {
    metricEls.errors.textContent = `${values.errors.toFixed(1)}%`;
    metricEls.latency.textContent = `${Math.round(values.latency)} ms`;
    metricEls.cpu.textContent = `${Math.round(values.cpu)}%`;
    metricEls.errors.classList.toggle('bad', values.errors > 5);
    metricEls.latency.classList.toggle('bad', values.latency > 1000);
    metricEls.cpu.classList.toggle('bad', values.cpu > 85);
  }

  function tick(): void {
    if (!active) return;
    const goal = resolving ? BASELINE : active.incident;
    const ease = resolving ? 0.35 : 0.5;
    (Object.keys(values) as Metric[]).forEach((k) => {
      const noise = goal[k] * (Math.random() - 0.5) * 0.12;
      values[k] = Math.max(0, values[k] + (goal[k] + noise - values[k]) * ease);
    });
    series.push(values[active.chartMetric]);
    if (series.length > HISTORY) series.shift();
    renderMetrics();
    drawChart();
    if (!resolving) metricEls.clock.textContent = fmtClock(Date.now() - startedAt);

    if (resolving && Math.abs(values[active.chartMetric] - BASELINE[active.chartMetric]) < BASELINE[active.chartMetric] * 0.6) {
      finishIncident(healedBy);
    }
  }

  function bump(metric: Metric, factor: number): void {
    values[metric] *= factor;
  }

  // ---------- incident lifecycle ----------
  function startIncident(s: Scenario): void {
    stopTimers();
    active = s;
    resolving = false;
    values = { ...BASELINE };
    series = Array.from({ length: 20 }, () => BASELINE[s.chartMetric] * (0.9 + Math.random() * 0.2));
    commandsRun = 0;
    logCursor = 0;
    startedAt = Date.now();

    show('incident');
    logEl.replaceChildren();
    alertEl.innerHTML = `<span class="sev sev-${s.sev === 'SEV-1' ? '1' : '2'}">${s.sev}</span>
      <div><strong>${s.title}</strong><p class="mono">${s.alarm}</p></div>`;
    chartLabel.textContent =
      s.chartMetric === 'latency' ? 'p99 latency (ms) · last 60s · dashed = alarm threshold' : 'error rate (%) · last 60s · dashed = alarm threshold';

    setStatus('down', `${s.sev}: ${s.title}`);
    degrade(s.target);
    print(`Page received: ${s.alarm}`, 'err');
    print('You are on call. Type `help` to see what you can do.', 'sys');

    tickTimer = window.setInterval(tick, 1000);
    logTimer = window.setInterval(() => {
      if (!active || resolving) return;
      print(active.logs[logCursor % active.logs.length], logCursor % active.logs.length < 2 ? 'err' : 'out');
      logCursor++;
    }, reducedMotion ? 6000 : 3500);
    healTimer = window.setTimeout(() => {
      if (active && !resolving) {
        print('Auto-remediation runbook kicked in after 3 minutes.', 'sys');
        beginRecovery('auto');
      }
    }, AUTO_HEAL_MS);

    tick();
    input.value = '';
    input.focus();
  }

  function beginRecovery(by: 'visitor' | 'auto' = 'visitor'): void {
    if (!active || resolving) return;
    resolving = true;
    healedBy = by;
    setStatus('recovering', 'Recovering…');
  }

  function finishIncident(by: 'visitor' | 'auto'): void {
    if (!active) return;
    const s = active;
    const elapsed = Date.now() - startedAt;
    stopTimers();
    active = null;
    resolving = false;
    degrade(null);
    setStatus('ok', 'All systems operational');

    if (by === 'visitor') {
      resolved.add(s.id);
      saveResolved();
    }
    renderScore();
    renderScenarioList();

    pmEl.innerHTML = `
      <p class="mono pm-kicker">postmortem · blameless</p>
      <h3>${s.title} resolved in ${fmtClock(elapsed)}</h3>
      <dl class="pm-grid">
        <dt>Root cause</dt><dd>${s.rootCause}</dd>
        <dt>Remediation</dt><dd>${s.remediation}</dd>
        <dt>Commands run</dt><dd>${commandsRun}</dd>
      </dl>
      <div class="pm-reveal">
        <p class="mono pm-kicker">what this says about me</p>
        <p>${s.aboutMe}</p>
      </div>`;
    const next = SCENARIOS.find((x) => !resolved.has(x.id));
    const nextBtn = $<HTMLButtonElement>('cc-next');
    nextBtn.textContent = next ? `Next incident: ${next.title}` : 'Replay an incident';
    nextBtn.dataset.next = next?.id ?? '';
    show('postmortem');
    nextBtn.focus();
  }

  function stopTimers(): void {
    window.clearInterval(tickTimer);
    window.clearInterval(logTimer);
    window.clearTimeout(healTimer);
  }

  // ---------- terminal ----------
  const HELP = [
    'help                 show this list',
    'status               current incident summary',
    'logs                 recent application / auth logs',
    'deploys              recent releases',
    'top                  fleet CPU and memory',
    'rollback             roll back to the previous release',
    'restart              restart the service',
    'scale out            add capacity',
    'block <ip>           deny traffic from an IP',
    'hint                 a nudge in the right direction',
    'clear                clear the terminal',
    'exit                 close Chaos Mode',
  ];

  function run(raw: string): void {
    const cmd = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!cmd) return;
    print(`$ ${raw.trim()}`, 'cmd');
    if (!active) return;
    commandsRun++;

    if (resolving) {
      print('Recovery in progress. Watch the metrics settle.', 'sys');
      return;
    }

    if (active.fix.test(cmd)) {
      active.fixOutput.forEach((l) => print(l, 'ok'));
      beginRecovery();
      return;
    }

    const wrongKey = Object.keys(active.wrong).find((k) => cmd === k || cmd.startsWith(`${k} `));
    if (wrongKey) {
      active.wrong[wrongKey].forEach((l, i) => print(l, i === 0 ? 'out' : 'err'));
      bump(active.chartMetric, 1.15);
      return;
    }

    switch (cmd) {
      case 'help':
        HELP.forEach((l) => print(l));
        break;
      case 'status':
        print(`${active.sev} ${active.title}: ${active.alarm}`);
        print(`error=${values.errors.toFixed(1)}%  p99=${Math.round(values.latency)}ms  cpu=${Math.round(values.cpu)}%`);
        break;
      case 'logs':
        active.logs.forEach((l, i) => print(l, i < 2 ? 'err' : 'out'));
        break;
      case 'deploys':
      case 'history':
        active.deploys.forEach((l) => print(l));
        break;
      case 'top':
      case 'metrics':
        active.top.forEach((l) => print(l));
        break;
      case 'hint':
        print(active.hint, 'sys');
        break;
      case 'clear':
        logEl.replaceChildren();
        break;
      case 'exit':
      case 'quit':
        close();
        break;
      case 'sudo rm -rf /':
        print('Nice try. This console has least-privilege IAM. 😉', 'sys');
        break;
      default:
        if (cmd.startsWith('block') || cmd.startsWith('deny')) {
          print('Blocked that address, but failed logins continue. Check `logs` for the real source.', 'err');
        } else {
          print(`command not found: ${raw.trim()}. Type \`help\`.`, 'err');
        }
    }
  }

  // ---------- open / close ----------
  function open(): void {
    if (!consoleEl.hidden) return;
    lastFocus = document.activeElement as HTMLElement | null;
    consoleEl.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('chaos-open');
    renderScenarioList();
    renderScore();
    show('pick');
    scenarioList.querySelector<HTMLButtonElement>('button')?.focus();
  }

  function close(): void {
    if (consoleEl.hidden) return;
    stopTimers();
    active = null;
    resolving = false;
    degrade(null);
    setStatus('ok', 'All systems operational');
    consoleEl.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('chaos-open');
    (lastFocus && document.contains(lastFocus) ? lastFocus : trigger).focus();
  }

  // ---------- wiring ----------
  trigger.addEventListener('click', () => (consoleEl.hidden ? open() : close()));
  document.querySelectorAll<HTMLElement>('[data-chaos-open]').forEach((el) => el.addEventListener('click', open));
  $('cc-close').addEventListener('click', close);
  $('cc-done').addEventListener('click', close);
  $('cc-next').addEventListener('click', (e) => {
    const id = (e.currentTarget as HTMLElement).dataset.next;
    const s = SCENARIOS.find((x) => x.id === id);
    if (s) startIncident(s);
    else show('pick');
  });
  $('cc-reveal').addEventListener('click', () => {
    if (!active) return;
    print(`Runbook says: \`${active.fixCommand}\``, 'sys');
    input.value = active.fixCommand;
    input.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });
  consoleEl.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((b) =>
    b.addEventListener('click', () => {
      run(b.dataset.cmd ?? '');
      input.focus();
    }),
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !consoleEl.hidden) close();
  });

  renderScore();
}

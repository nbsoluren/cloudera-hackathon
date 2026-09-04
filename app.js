(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const tpl = $("#car-template");
  $$(".car-mount").forEach((mount) => {
    mount.appendChild(tpl.content.cloneNode(true));
  });

  const slides = $$(".slide");
  const state = {
    i: 0,
    started: false,
    starting: false,
    shifting: false,
    muted: true,
    engine: 0,
    audio: null,
  };

  const FLAGS = slides.map((s) => s.dataset.flag || "GREEN FLAG");

  const EVIDENCE = [
    "3 Sev-1 incidents on payments-api in 90 days",
    "12% coverage on checkout / capture path",
    "Hotspot: PaymentOrchestrator cyclomatic 34",
    "Last similar change → P1 gateway timeout",
  ];

  const TASKS = [
    { code: "PAY-Q1", title: "Contract tests: timeout + retry on gateway", gap: "+0.000" },
    { code: "PAY-Q2", title: "Circuit breaker on legacy SOAP adapter", gap: "+0.214" },
    { code: "PAY-Q3", title: "Chaos: partial capture / duplicate charge", gap: "+0.508" },
    { code: "PAY-Q4", title: "Coverage gate: checkout path ≥ 70%", gap: "+0.771" },
  ];

  function initCircuit() {
    const el = $("#circuit");
    el.innerHTML = slides.map((_, n) => `<div class="sector" data-i="${n}"></div>`).join("");
    el.addEventListener("click", (e) => {
      const sec = e.target.closest(".sector");
      if (sec && state.started) go(+sec.dataset.i);
    });
  }

  function paintCircuit() {
    $$(".circuit .sector").forEach((el, n) => {
      el.classList.toggle("done", n < state.i);
      el.classList.toggle("now", n === state.i);
    });
    const bar = $(".trackbar");
    const car = $("#track-car");
    if (!bar || !car) return;
    const pad = 70;
    const usable = bar.clientWidth - pad * 2 - 90;
    const t = slides.length <= 1 ? 0 : state.i / (slides.length - 1);
    car.style.left = `${pad + usable * t}px`;
  }

  function setHud() {
    $("#hud-flag").textContent = FLAGS[state.i] || "GREEN FLAG";
    $("#hud-sector").textContent = String(state.i + 1).padStart(2, "0");
    $(".pos-box").textContent = String(state.i + 1).padStart(2, "0");
  }

  let speed = 118;
  let rpm = 4200;
  let gear = 3;
  function tickTelemetry() {
    const target = state.shifting ? 310 : state.started ? 186 : 72;
    speed += (target - speed) * 0.08;
    const wobble = Math.sin(Date.now() / 180) * (state.shifting ? 8 : 2);
    const shown = Math.max(0, Math.round(speed + wobble));
    $("#hud-speed").textContent = String(shown).padStart(3, "0");
    gear = shown < 40 ? "N" : shown < 90 ? 2 : shown < 160 ? 4 : shown < 240 ? 6 : 8;
    $("#hud-gear").textContent = gear;
    const rpmTarget = 3500 + shown * 18;
    rpm += (rpmTarget - rpm) * 0.1;
    $("#hud-rpm").textContent = String(Math.round(rpm)).padStart(4, "0");
    requestAnimationFrame(tickTelemetry);
  }

  function whoosh() {
    if (state.muted) return;
    const ctx = state.audio || new (window.AudioContext || window.webkitAudioContext)();
    state.audio = ctx;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(46, ctx.currentTime + 0.28);
    filter.type = "lowpass";
    filter.frequency.value = 900;
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
  }

  function go(n) {
    if (!state.started || state.shifting) return;
    const next = Math.max(0, Math.min(slides.length - 1, n));
    if (next === state.i) return;
    state.shifting = true;
    document.body.classList.add("shifting");
    whoosh();
    const prev = slides[state.i];
    const incoming = slides[next];
    prev.classList.add("exit-left");
    prev.classList.remove("active");
    incoming.classList.add("active");
    state.i = next;
    setHud();
    paintCircuit();
    onEnter(next);
    burst();
    setTimeout(() => {
      prev.classList.remove("exit-left");
      state.shifting = false;
      document.body.classList.remove("shifting");
    }, 480);
  }

  function next() { go(state.i + 1); }
  function prev() { go(state.i - 1); }

  function onEnter(i) {
    if (i === 5) startEngine();
    else stopEngine();
    if (i === 6) playPit();
    if (i === 8) playCounts();
  }

  let engineTimer = 0;
  function startEngine() {
    stopEngine();
    state.engine = 0;
    const paint = () => {
      const items = $$(".stages li");
      items.forEach((el, n) => el.classList.toggle("on", n === state.engine));
      const car = $("#engine-car");
      const engine = $("#engine");
      const stage = items[state.engine];
      if (!car || !engine || !stage) return;
      const root = engine.getBoundingClientRect();
      const r = stage.getBoundingClientRect();
      car.style.left = `${r.left - root.left + r.width / 2 - car.offsetWidth / 2}px`;
    };
    paint();
    engineTimer = setInterval(() => {
      state.engine = (state.engine + 1) % 5;
      paint();
    }, 1100);
  }
  function stopEngine() {
    clearInterval(engineTimer);
  }

  let pitTimers = [];
  function playPit() {
    pitTimers.forEach(clearTimeout);
    pitTimers = [];
    const list = $("#evidence-list");
    const rows = $("#tower-rows");
    const fill = $("#risk-fill");
    const val = $("#risk-val");
    list.innerHTML = "";
    rows.innerHTML = "";
    fill.style.width = "0";
    val.textContent = "00";

    EVIDENCE.forEach((text, i) => {
      const li = document.createElement("li");
      li.textContent = text;
      list.appendChild(li);
      pitTimers.push(setTimeout(() => li.classList.add("show"), 400 + i * 280));
    });

    pitTimers.push(setTimeout(() => {
      fill.style.width = "91%";
      let n = 0;
      const t = setInterval(() => {
        n += 3;
        if (n >= 91) { n = 91; clearInterval(t); }
        val.textContent = String(n);
      }, 20);
      pitTimers.push(t);
    }, 200));

    TASKS.forEach((task, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="pos">${i + 1}</span><span class="code">${task.code}</span><span>${task.title}</span><span class="gap">${task.gap}</span>`;
      rows.appendChild(li);
      pitTimers.push(setTimeout(() => li.classList.add("show"), 1400 + i * 220));
    });
  }

  function playCounts() {
    $$(".count").forEach((el) => {
      const target = +el.dataset.count;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / 900);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  async function lightsOut() {
    if (state.started || state.starting) return;
    state.starting = true;
    const btn = $("#btn-go");
    btn.disabled = true;
    btn.textContent = "ARMING";
    const bulbs = $$("#start-lights span");
    for (let i = 0; i < bulbs.length; i++) {
      await wait(520);
      bulbs[i].classList.add("on");
      blip(220 + i * 20);
    }
    await wait(700);
    $("#start-lights").classList.add("out");
    bulbs.forEach((b) => b.classList.remove("on"));
    blip(80, 0.08);
    await wait(180);
    $("#boot-overlay").classList.add("off");
    $("#boot-overlay").hidden = true;
    document.body.classList.remove("boot");
    state.started = true;
    slides[0].classList.add("active");
    setHud();
    paintCircuit();
    onEnter(0);
    whoosh();
  }

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function blip(freq, vol = 0.04) {
    if (state.muted) return;
    const ctx = state.audio || new (window.AudioContext || window.webkitAudioContext)();
    state.audio = ctx;
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.13);
  }

  function restart() {
    location.reload();
  }

  /* canvas sparks / light streaks */
  const canvas = $("#fx");
  const ctx = canvas.getContext("2d");
  let parts = [];
  function resize() {
    canvas.width = innerWidth * devicePixelRatio;
    canvas.height = innerHeight * devicePixelRatio;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  function burst() {
    for (let i = 0; i < 42; i++) {
      parts.push({
        x: innerWidth * (0.7 + Math.random() * 0.3),
        y: innerHeight * (0.35 + Math.random() * 0.35),
        vx: -8 - Math.random() * 18,
        vy: (Math.random() - 0.5) * 4,
        life: 1,
        w: 18 + Math.random() * 50,
        c: Math.random() > 0.5 ? "#e10600" : "#f68b1f",
      });
    }
  }
  function drawFx() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      ctx.globalAlpha = p.life * 0.7;
      ctx.fillStyle = p.c;
      ctx.fillRect(p.x, p.y, p.w, 2);
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.025;
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(drawFx);
  }

  function toggleSound() {
    state.muted = !state.muted;
    $("#btn-sound").textContent = state.muted ? "MUTED" : "ENGINE";
    if (!state.muted) {
      state.audio = state.audio || new (window.AudioContext || window.webkitAudioContext)();
      state.audio.resume();
      whoosh();
    }
  }

  function toggleFs() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }

  function onKey(e) {
    const help = $("#help");
    if (e.key === "?" || e.key === "h" || e.key === "H") {
      help.hidden = !help.hidden;
      return;
    }
    if (!state.started && (e.key === "Enter" || e.key === " " || e.key === "ArrowRight")) {
      e.preventDefault();
      lightsOut();
      return;
    }
    if (!state.started) return;
    if (["ArrowRight", " ", "PageDown"].includes(e.key)) { e.preventDefault(); next(); }
    if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); prev(); }
    if (e.key === "Home") go(0);
    if (e.key === "End") go(slides.length - 1);
    if (e.key === "f" || e.key === "F") toggleFs();
    if (e.key === "m" || e.key === "M") toggleSound();
    if (e.key === "r" || e.key === "R") restart();
    if (e.key >= "1" && e.key <= "9") go(+e.key - 1);
    if (e.key === "0") go(9);
  }

  initCircuit();
  paintCircuit();
  setHud();
  resize();
  drawFx();
  tickTelemetry();

  const params = new URLSearchParams(location.search);
  if (params.has("start")) {
    const n = Math.max(0, Math.min(slides.length - 1, Number(params.get("slide") || 0)));
    $("#boot-overlay").classList.add("off");
    $("#boot-overlay").hidden = true;
    document.body.classList.remove("boot");
    state.started = true;
    state.i = n;
    slides.forEach((s, i) => s.classList.toggle("active", i === n));
    setHud();
    paintCircuit();
    onEnter(n);
  }
  addEventListener("resize", () => { resize(); paintCircuit(); });
  addEventListener("keydown", onKey);

  $("#btn-go").addEventListener("click", lightsOut);
  $("#boot-overlay").addEventListener("click", (e) => {
    if (e.target.closest(".hud-btn")) return;
    lightsOut();
  });
  $("#btn-next").addEventListener("click", () => (state.started ? next() : lightsOut()));
  $("#btn-prev").addEventListener("click", () => (state.started ? prev() : null));
  $("#btn-sound").addEventListener("click", toggleSound);
  $("#btn-fs").addEventListener("click", toggleFs);

  $("#deck").addEventListener("click", (e) => {
    if (!state.started) return;
    if (e.target.closest("button, a, .circuit")) return;
    if (e.clientX > innerWidth * 0.28) next();
    else prev();
  });

  let touchX = 0;
  addEventListener("touchstart", (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
  addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) < 50) return;
    if (!state.started) { lightsOut(); return; }
    if (dx < 0) next(); else prev();
  }, { passive: true });
})();

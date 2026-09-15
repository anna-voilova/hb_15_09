/**
 * Birthday Quest — интерактивная система доставки подарка
 * Измени имя получателя ниже при необходимости.
 */
const RECIPIENT_NAME = "Санёчек";
const BIRTHDAY_AGE = 27;

const LEVELS = {
  identity: 1,
  bonus: 2,
  cakes: 3,
  spot: 3,
  maze: 3,
  candles: 3,
  delivery: 4,
  finale: 4,
};

const CAKE_TARGET = 10;
const CAKE_TIME = 30;
const FOOD_ENEMIES = [
  "🍕", "🍔", "🍟", "🌭", "🍿",
  "🌮", "🌯", "🍣", "🍜", "🍝",
  "🥪", "🥨", "🧀", "🥗", "🍪",
  "🍩", "🍫", "🍦", "🍤", "🥓",
];

const state = {
  level: 1,
  bonusLocked: false,
  cakes: {
    running: false,
    caught: 0,
    timeLeft: CAKE_TIME,
    timerId: null,
    moveId: null,
  },
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const progressEl = $("#progress");
const progressLabel = $("#progress-label");
const progressFill = $("#progress-fill");
const fxLayer = $("#fx-layer");

function setProgress(level) {
  state.level = level;
  progressEl.hidden = false;
  progressLabel.textContent = `Уровень ${level} / 4`;
  progressFill.style.width = `${(level / 4) * 100}%`;
}

function showScreen(name) {
  $$(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (LEVELS[name]) setProgress(LEVELS[name]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ---------- Screen 1: identity ---------- */
function setupIdentity() {
  const feedback = $("#identity-feedback");
  const nextBtn = $("#identity-next");
  const options = $$("#identity-options .option");

  options.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!nextBtn.hidden) return;

      const correct = btn.dataset.correct === "true";
      if (!correct) {
        btn.classList.remove("wrong");
        void btn.offsetWidth;
        btn.classList.add("wrong");
        feedback.textContent = "❌ Система не согласна.\nПопробуйте ещё раз.";
        return;
      }

      options.forEach((o) => {
        o.disabled = true;
        o.classList.toggle("correct", o === btn);
      });
      feedback.textContent =
        "✅ Личность подтверждена.\nУровень интеллекта: достаточно высокий, чтобы получить подарок.";
      nextBtn.hidden = false;
    });
  });
}

/* ---------- Screen 2: bonus ---------- */
function spawnBonusRain(emoji) {
  const count = window.matchMedia("(max-width: 600px)").matches ? 28 : 42;
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement("span");
    el.className = "fx-emoji";
    el.textContent = emoji;
    const size = rand(1.1, 2.8);
    el.style.fontSize = `${size}rem`;
    el.style.setProperty("--x", `${rand(0, 100)}vw`);
    el.style.setProperty("--drift", `${rand(-80, 80)}px`);
    el.style.setProperty("--spin", `${rand(-320, 320)}deg`);
    el.style.animationDuration = `${rand(2.2, 4.2)}s`;
    el.style.animationDelay = `${rand(0, 0.9)}s`;
    fxLayer.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
}

function setupBonus() {
  const cards = $$("#bonus-grid .bonus-card");
  const feedback = $("#bonus-feedback");
  const nextBtn = $("#bonus-next");

  cards.forEach((card) => {
    card.addEventListener("click", async () => {
      if (state.bonusLocked) return;
      state.bonusLocked = true;

      cards.forEach((c) => {
        const selected = c === card;
        c.classList.toggle("selected", selected);
        c.classList.toggle("dimmed", !selected);
        c.disabled = true;
      });

      feedback.hidden = false;
      await sleep(500);
      spawnBonusRain(card.dataset.emoji);
      await sleep(2800);
      nextBtn.hidden = false;
    });
  });
}

/* ---------- Screen 3.1: cakes ---------- */
function clearCakesField() {
  const field = $("#cakes-field");
  field.innerHTML = "";
  if (state.cakes.timerId) clearInterval(state.cakes.timerId);
  if (state.cakes.moveId) clearInterval(state.cakes.moveId);
  state.cakes.timerId = null;
  state.cakes.moveId = null;
  state.cakes.running = false;
}

function updateCakesHud() {
  $("#cakes-score").textContent = `ТОРТЫ: ${state.cakes.caught} / ${CAKE_TARGET}`;
  $("#cakes-time").textContent = `ВРЕМЯ: ${state.cakes.timeLeft}`;
}

function placeFlyer(el, field) {
  const size = rand(1.5, 2.6);
  el.style.setProperty("--size", `${size}rem`);
  el.style.setProperty("--dur", `${rand(1.2, 2.2)}s`);
  el.style.setProperty("--dx", `${rand(-70, 70)}px`);
  el.style.setProperty("--dy", `${rand(-55, 55)}px`);

  const maxX = Math.max(field.clientWidth - 56, 10);
  const maxY = Math.max(field.clientHeight - 56, 10);
  el.style.left = `${rand(0, maxX)}px`;
  el.style.top = `${rand(0, maxY)}px`;
}

function spawnFlyer(field, { emoji, isCake }) {
  const flyer = document.createElement("button");
  flyer.type = "button";
  flyer.className = "flyer";
  flyer.textContent = emoji;
  flyer.dataset.cake = isCake ? "1" : "0";
  flyer.setAttribute("aria-label", isCake ? "Торт" : "Еда");
  placeFlyer(flyer, field);

  const onCatch = (event) => {
    event.preventDefault();
    if (!state.cakes.running || flyer.classList.contains("caught")) return;

    if (!isCake) {
      flyer.classList.remove("enemy-hit");
      void flyer.offsetWidth;
      flyer.classList.add("enemy-hit");
      $("#cakes-feedback").textContent = "Что-то не выглядит как торт";
      return;
    }

    flyer.classList.add("caught");
    state.cakes.caught += 1;
    updateCakesHud();
    $("#cakes-feedback").textContent = "";
    setTimeout(() => flyer.remove(), 180);
    if (state.cakes.caught >= CAKE_TARGET) finishCakes(true);
  };

  flyer.addEventListener("pointerdown", onCatch);
  field.appendChild(flyer);
}

function repositionCakes() {
  const field = $("#cakes-field");
  $$(".flyer", field).forEach((flyer) => {
    if (flyer.classList.contains("caught")) return;
    placeFlyer(flyer, field);
  });
}

function finishCakes(won) {
  if (!state.cakes.running) return;
  state.cakes.running = false;
  if (state.cakes.timerId) clearInterval(state.cakes.timerId);
  if (state.cakes.moveId) clearInterval(state.cakes.moveId);
  state.cakes.timerId = null;
  state.cakes.moveId = null;

  const feedback = $("#cakes-feedback");
  const startBtn = $("#cakes-start");
  const retryBtn = $("#cakes-retry");
  const nextBtn = $("#cakes-next");

  startBtn.hidden = true;

  if (won) {
    $$(".flyer").forEach((c) => c.remove());
    feedback.innerHTML =
      `<strong>🎂 ${CAKE_TARGET}/${CAKE_TARGET}</strong><br />Удивительно.<br />Торты пойманы.<br />Ни один именинный торт не пострадал.`;
    retryBtn.hidden = true;
    nextBtn.hidden = false;
  } else {
    feedback.textContent =
      "⏰ Время вышло!\n\nНо система решила проявить милосердие.";
    retryBtn.hidden = false;
    nextBtn.hidden = true;
  }
}

function startCakesGame() {
  clearCakesField();
  state.cakes.caught = 0;
  state.cakes.timeLeft = CAKE_TIME;
  state.cakes.running = true;
  updateCakesHud();

  $("#cakes-feedback").textContent = "";
  $("#cakes-start").hidden = true;
  $("#cakes-retry").hidden = true;
  $("#cakes-next").hidden = true;

  const field = $("#cakes-field");
  for (let i = 0; i < CAKE_TARGET; i += 1) {
    spawnFlyer(field, { emoji: "🎂", isCake: true });
  }
  FOOD_ENEMIES.forEach((emoji) => {
    spawnFlyer(field, { emoji, isCake: false });
  });

  state.cakes.moveId = setInterval(repositionCakes, 1800);
  state.cakes.timerId = setInterval(() => {
    state.cakes.timeLeft -= 1;
    updateCakesHud();
    if (state.cakes.timeLeft <= 0) finishCakes(false);
  }, 1000);
}

function setupCakes() {
  updateCakesHud();
}

/* ---------- Screen 3.2: spot the gift among party poppers ---------- */
function buildSpotGrid() {
  const grid = $("#spot-grid");
  const feedback = $("#spot-feedback");
  const nextBtn = $("#spot-next");
  feedback.textContent = "";
  nextBtn.hidden = true;
  grid.innerHTML = "";

  const cols = pick([4, 5, 5, 6]);
  const rows = pick([4, 5, 5]);
  const total = cols * rows;
  const giftIndex = Math.floor(Math.random() * total);
  const normal = "🎉";
  const odd = "🎁";

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let i = 0; i < total; i += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "spot-cell";
    const isGift = i === giftIndex;
    cell.textContent = isGift ? odd : normal;
    cell.setAttribute("aria-label", isGift ? "Подарок" : "Хлопушка");

    cell.addEventListener("click", () => {
      if (!nextBtn.hidden) return;
      if (!isGift) {
        cell.classList.remove("miss");
        void cell.offsetWidth;
        cell.classList.add("miss");
        feedback.textContent = "❌ Не этот.";
        return;
      }

      cell.classList.add("hit");
      feedback.innerHTML =
        "✅ Найдено!<br /><br />Отлично.<br />Осталось одно логистическое испытание.";
      $$(".spot-cell", grid).forEach((c) => {
        c.disabled = true;
      });
      nextBtn.hidden = false;
    });

    grid.appendChild(cell);
  }
}

/* ---------- Screen 3.3: maze UA -> FI ---------- */
// 0 = путь, 1 = стена. Старт [0,0] 🇺🇦, финиш [8,8] 🇫🇮
const MAZE_MAP = [
  [0, 0, 1, 0, 0, 0, 1, 0, 0],
  [1, 0, 1, 0, 1, 0, 1, 0, 1],
  [0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0],
  [1, 1, 0, 1, 1, 1, 0, 1, 0],
  [0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 1, 1, 1, 0, 1, 1, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0],
];

const MAZE_START = { r: 0, c: 0 };
const MAZE_END = { r: 8, c: 8 };
const MAZE_DIRS = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};

const mazeState = {
  r: MAZE_START.r,
  c: MAZE_START.c,
  won: false,
  ready: false,
};

function renderMaze() {
  const board = $("#maze-board");
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${MAZE_MAP[0].length}, 1fr)`;

  MAZE_MAP.forEach((row, r) => {
    row.forEach((cell, c) => {
      const tile = document.createElement("div");
      tile.className = "maze-cell";
      const isWall = cell === 1;
      const isStart = r === MAZE_START.r && c === MAZE_START.c;
      const isEnd = r === MAZE_END.r && c === MAZE_END.c;
      const isPlayer = r === mazeState.r && c === mazeState.c;

      if (isWall) {
        tile.classList.add("wall");
        tile.setAttribute("aria-hidden", "true");
      } else {
        tile.classList.add("path");
        if (isStart) tile.classList.add("start");
        if (isEnd) tile.classList.add("end");
        if (isPlayer) tile.classList.add("player");

        if (isPlayer) {
          tile.textContent = "🎁";
        } else if (isStart) {
          tile.textContent = "🇺🇦";
        } else if (isEnd) {
          tile.textContent = "🇫🇮";
        }
      }

      board.appendChild(tile);
    });
  });
}

function initMaze() {
  mazeState.r = MAZE_START.r;
  mazeState.c = MAZE_START.c;
  mazeState.won = false;
  mazeState.ready = true;
  $("#maze-feedback").textContent = "Маршрут: Украина 🇺🇦 → Финляндия 🇫🇮";
  $("#maze-next").hidden = true;
  renderMaze();
}

function tryMoveMaze(dir) {
  if (!mazeState.ready || mazeState.won) return;
  const delta = MAZE_DIRS[dir];
  if (!delta) return;

  const nextR = mazeState.r + delta.r;
  const nextC = mazeState.c + delta.c;
  const row = MAZE_MAP[nextR];
  if (!row || row[nextC] === undefined || row[nextC] === 1) {
    $("#maze-feedback").textContent = "🚧 Стена. Система предлагает другой путь.";
    return;
  }

  mazeState.r = nextR;
  mazeState.c = nextC;
  renderMaze();

  if (mazeState.r === MAZE_END.r && mazeState.c === MAZE_END.c) {
    mazeState.won = true;
    $("#maze-feedback").innerHTML =
      "✅ Подарок доставлен в Финляндию!<br />Осталось задуть свечи.";
    $("#maze-next").hidden = false;
    return;
  }

  $("#maze-feedback").textContent = "Подарок в пути…";
}

function setupMazeControls() {
  document.querySelectorAll("[data-maze-dir]").forEach((btn) => {
    btn.addEventListener("click", () => tryMoveMaze(btn.dataset.mazeDir));
  });

  window.addEventListener("keydown", (event) => {
    if (!$('[data-screen="maze"]').classList.contains("active")) return;
    const map = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
    };
    const dir = map[event.key] || map[event.key.toLowerCase()];
    if (!dir) return;
    event.preventDefault();
    tryMoveMaze(dir);
  });
}

/* ---------- Screen 3.4: blow out candles ---------- */
const candlesState = {
  blown: 0,
  done: false,
};

function updateCandlesHud() {
  $("#candles-score").textContent = `СВЕЧИ: ${candlesState.blown} / ${BIRTHDAY_AGE}`;
}

function buildCandles() {
  const grid = $("#candles-grid");
  const feedback = $("#candles-feedback");
  const nextBtn = $("#candles-next");

  candlesState.blown = 0;
  candlesState.done = false;
  feedback.textContent = "";
  nextBtn.hidden = true;
  updateCandlesHud();
  grid.innerHTML = "";

  for (let i = 0; i < BIRTHDAY_AGE; i += 1) {
    const candle = document.createElement("button");
    candle.type = "button";
    candle.className = "candle lit";
    candle.dataset.index = String(i);
    candle.setAttribute("aria-label", `Свеча ${i + 1}`);
    candle.innerHTML = '<span class="flame">🕯️</span>';

    candle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      if (candlesState.done || candle.classList.contains("out")) return;

      candle.classList.remove("lit");
      candle.classList.add("out");
      candle.innerHTML = '<span class="smoke">💨</span>';
      candle.disabled = true;
      candlesState.blown += 1;
      updateCandlesHud();

      if (candlesState.blown >= BIRTHDAY_AGE) {
        candlesState.done = true;
        feedback.innerHTML =
          `✅ Все ${BIRTHDAY_AGE} свечей задуты!<br />Желание загадано. Система это зафиксировала.`;
        nextBtn.hidden = false;
        $("#candles-hint").textContent = "🎉 ГОТОВО";
      } else {
        const left = BIRTHDAY_AGE - candlesState.blown;
        feedback.textContent =
          left === 1 ? "Осталась последняя свеча!" : `Осталось: ${left}`;
      }
    });

    grid.appendChild(candle);
  }

  $("#candles-hint").textContent = "💨 ДУЙ!";
}

/* ---------- Screen 4: delivery ---------- */
function spawnSparks(arena) {
  for (let i = 0; i < 18; i += 1) {
    const spark = document.createElement("span");
    spark.className = "spark";
    spark.style.left = `${rand(10, 90)}%`;
    spark.style.top = `${rand(20, 80)}%`;
    spark.style.setProperty("--sx", `${rand(-60, 60)}px`);
    spark.style.setProperty("--sy", `${rand(-50, 50)}px`);
    spark.style.background = pick(["#ffc857", "#2fe0b5", "#ffffff"]);
    arena.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove());
  }
}

async function launchDelivery() {
  const launchBtn = $("#launch-delivery");
  const arena = $("#delivery-arena");
  const gift = $("#gift-fly");
  const done = $("#delivery-done");
  const toFinale = $("#to-finale");

  launchBtn.hidden = true;
  arena.hidden = false;
  done.hidden = true;
  toFinale.hidden = true;

  gift.classList.remove("flying");
  void gift.offsetWidth;
  gift.classList.add("flying");

  const sparkInterval = setInterval(() => spawnSparks(arena), 220);
  await sleep(1900);
  clearInterval(sparkInterval);
  spawnSparks(arena);

  done.hidden = false;
  toFinale.hidden = false;
}

/* ---------- Finale + secret ---------- */
function openGift() {
  const box = $("#gift-box");
  const openBtn = $("#open-gift");
  const content = $("#finale-content");
  const secretBtn = $("#secret-btn");

  box.classList.add("opened");
  openBtn.hidden = true;
  content.hidden = false;

  setTimeout(() => {
    secretBtn.hidden = false;
    secretBtn.style.animation = "screenIn 0.45s ease both";
  }, 2800);
}

function openSecret(open) {
  $("#secret-modal").hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
}

/* ---------- Actions ---------- */
function setupActions() {
  document.body.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;

    switch (action) {
      case "start-quest":
        showScreen("identity");
        break;
      case "to-bonus":
        showScreen("bonus");
        break;
      case "to-cakes":
        clearCakesField();
        state.cakes.caught = 0;
        state.cakes.timeLeft = CAKE_TIME;
        updateCakesHud();
        $("#cakes-feedback").textContent = "";
        $("#cakes-start").hidden = false;
        $("#cakes-retry").hidden = true;
        $("#cakes-next").hidden = true;
        showScreen("cakes");
        break;
      case "start-cakes":
      case "retry-cakes":
        startCakesGame();
        break;
      case "to-spot":
        showScreen("spot");
        buildSpotGrid();
        break;
      case "to-maze":
        showScreen("maze");
        initMaze();
        break;
      case "reset-maze":
        initMaze();
        break;
      case "to-candles":
        showScreen("candles");
        buildCandles();
        break;
      case "to-delivery":
        showScreen("delivery");
        break;
      case "launch-delivery":
        launchDelivery();
        break;
      case "to-finale":
        showScreen("finale");
        break;
      case "open-gift":
        openGift();
        break;
      case "open-secret":
        openSecret(true);
        break;
      case "close-secret":
        openSecret(false);
        break;
      default:
        break;
    }
  });
}

function init() {
  $("#recipient-name").textContent = RECIPIENT_NAME;
  setupIdentity();
  setupBonus();
  setupCakes();
  setupMazeControls();
  setupActions();
  showScreen("intro");
  progressEl.hidden = true;
}

init();

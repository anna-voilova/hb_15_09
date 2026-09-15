/**
 * Birthday Quest — интерактивная система доставки подарка
 * Измени имя получателя ниже при необходимости.
 */
const RECIPIENT_NAME = "Санёчек";

const LEVELS = {
  identity: 1,
  bonus: 2,
  cakes: 3,
  spot: 3,
  delivery: 4,
  finale: 4,
};

const SPOT_PAIRS = [
  ["😀", "😃"],
  ["😎", "🤓"],
  ["🐱", "😺"],
  ["⭐", "✨"],
  ["🙂", "😊"],
  ["🟦", "🔷"],
  ["🍎", "🍏"],
  ["🐶", "🐕"],
  ["🌙", "🌚"],
  ["🟡", "🟠"],
];

const state = {
  level: 1,
  bonusLocked: false,
  cakes: {
    running: false,
    caught: 0,
    timeLeft: 10,
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
  $("#cakes-score").textContent = `ТОРТЫ: ${state.cakes.caught} / 5`;
  $("#cakes-time").textContent = `ВРЕМЯ: ${state.cakes.timeLeft}`;
}

function spawnCake(field) {
  const cake = document.createElement("button");
  cake.type = "button";
  cake.className = "cake";
  cake.textContent = "🎂";
  cake.setAttribute("aria-label", "Торт");

  const size = rand(1.7, 2.8);
  cake.style.setProperty("--size", `${size}rem`);
  cake.style.setProperty("--dur", `${rand(1.8, 3.6)}s`);
  cake.style.setProperty("--dx", `${rand(-50, 50)}px`);
  cake.style.setProperty("--dy", `${rand(-40, 40)}px`);

  const maxX = Math.max(field.clientWidth - 56, 10);
  const maxY = Math.max(field.clientHeight - 56, 10);
  cake.style.left = `${rand(0, maxX)}px`;
  cake.style.top = `${rand(0, maxY)}px`;

  const catchCake = (event) => {
    event.preventDefault();
    if (!state.cakes.running || cake.classList.contains("caught")) return;
    cake.classList.add("caught");
    state.cakes.caught += 1;
    updateCakesHud();
    setTimeout(() => cake.remove(), 180);
    if (state.cakes.caught >= 5) finishCakes(true);
  };

  cake.addEventListener("pointerdown", catchCake);
  field.appendChild(cake);
}

function repositionCakes() {
  const field = $("#cakes-field");
  $$(".cake", field).forEach((cake) => {
    if (cake.classList.contains("caught")) return;
    const maxX = Math.max(field.clientWidth - 56, 10);
    const maxY = Math.max(field.clientHeight - 56, 10);
    cake.style.left = `${rand(0, maxX)}px`;
    cake.style.top = `${rand(0, maxY)}px`;
    cake.style.setProperty("--dx", `${rand(-60, 60)}px`);
    cake.style.setProperty("--dy", `${rand(-50, 50)}px`);
    cake.style.setProperty("--dur", `${rand(1.6, 3.2)}s`);
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
    $$(".cake").forEach((c) => c.remove());
    feedback.innerHTML =
      "<strong>🎂 5/5</strong><br />Удивительно.<br />Торты пойманы.<br />Ни один именинный торт не пострадал.";
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
  state.cakes.timeLeft = 10;
  state.cakes.running = true;
  updateCakesHud();

  $("#cakes-feedback").textContent = "";
  $("#cakes-start").hidden = true;
  $("#cakes-retry").hidden = true;
  $("#cakes-next").hidden = true;

  const field = $("#cakes-field");
  for (let i = 0; i < 5; i += 1) spawnCake(field);

  state.cakes.moveId = setInterval(repositionCakes, 1200);
  state.cakes.timerId = setInterval(() => {
    state.cakes.timeLeft -= 1;
    updateCakesHud();
    if (state.cakes.timeLeft <= 0) finishCakes(false);
  }, 1000);
}

function setupCakes() {
  updateCakesHud();
}

/* ---------- Screen 3.2: spot the odd one ---------- */
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
  const oddIndex = Math.floor(Math.random() * total);

  let normal = "😀";
  let odd = "😃";
  const pair = pick(SPOT_PAIRS.filter((p) => p[0] !== p[1]));
  if (pair) {
    [normal, odd] = pair;
  }

  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let i = 0; i < total; i += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "spot-cell";
    const isOdd = i === oddIndex;
    cell.textContent = isOdd ? odd : normal;
    cell.setAttribute("aria-label", isOdd ? "Возможно отличающийся смайлик" : "Смайлик");

    cell.addEventListener("click", () => {
      if (!nextBtn.hidden) return;
      if (!isOdd) {
        cell.classList.remove("miss");
        void cell.offsetWidth;
        cell.classList.add("miss");
        feedback.textContent = "❌ Не этот.";
        return;
      }

      cell.classList.add("hit");
      feedback.innerHTML =
        "✅ Найдено!<br /><br />Отлично.<br />Система официально признаёт тебя пригодным к получению подарка.";
      $$(".spot-cell", grid).forEach((c) => {
        c.disabled = true;
      });
      nextBtn.hidden = false;
    });

    grid.appendChild(cell);
  }
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
        state.cakes.timeLeft = 10;
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
  setupActions();
  showScreen("intro");
  progressEl.hidden = true;
}

init();

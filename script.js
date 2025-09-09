import { levels } from './levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const resultModal = document.getElementById("resultModal");
const resultTitle = document.getElementById("resultTitle");
const resultScore = document.getElementById("resultScore");
const nextLevelBtn = document.getElementById("nextLevelBtn");
const backMenuBtn = document.getElementById("backMenuBtn");
const lanesX = [-0.28, 0, 0.28];
const playerImg = new Image();
playerImg.src = "player.png";
let tiltAngle = 0;

const state = {
    running: false,
    time: 0,
    scroll: 0,
    speed: 50,
    baseSpeed: 90,
    lane: 1,
    targetLane: 1,
    velocity: 60,
    dash: 0,
    gates: [],
    finished: false,
    gameOver: false,
    currentLevel: 0,
    score: 100
};

const ui = {
    velocity: document.getElementById('velocityBox'),
    start: document.getElementById('btnStart'),
    modal: document.getElementById('levelModal'),
    levelButtons: document.getElementById('levelButtons'),
    close: document.getElementById('btnClose')
};

function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
}
resize();
window.addEventListener('resize', resize);

function loadProgress() {
    const saved = localStorage.getItem("gameProgress");
    if (saved) {
        return JSON.parse(saved);
    }
    return { unlocked: [true, ...Array(levels.length-1).fill(false)] };
}

function saveProgress(progress) {
    localStorage.setItem("gameProgress", JSON.stringify(progress));
}

let progress = loadProgress();

function openMenu() {
    resultModal.classList.add('hidden');

    setTimeout(() => {
        populateLevelButtons();
        ui.modal.classList.remove('hidden');
        ui.modal.style.zIndex = '1300';
        resultModal.style.zIndex = '1200';
        state.running = false;
    }, 40);
}

function populateLevelButtons(){
    ui.levelButtons.innerHTML = "";
    levels.forEach((_,i)=>{
        const btn = document.createElement('button');
        btn.textContent = `Fase ${i+1}`;
        btn.className = "btn-level";

        if (!progress.unlocked[i]) {
            btn.disabled = true;
            btn.classList.add("locked");
        }

        btn.addEventListener('click', ()=>{
            if (!progress.unlocked[i]) return;
            state.currentLevel = i;
            reset();
            state.running = true;
            ui.modal.classList.add('hidden');
            resultModal.classList.add('hidden');
        });

        ui.levelButtons.appendChild(btn);
    });
}

function goToNextLevel() {
    let next = state.currentLevel + 1;

    if (next < levels.length && progress.unlocked[next]) {
        state.currentLevel = next;
    } else {
        let found = -1;
        for (let i = state.currentLevel + 1; i < levels.length; i++) {
            if (progress.unlocked[i]) {
                found = i;
                break;
            }
        }

        if (found >= 0) {
            state.currentLevel = found;
        } else {
            openMenu();
            return;
        }
    }

    reset();
    state.running = true;
    state.finished = false;
    state.gameOver = false;

    populateLevelButtons();
    saveProgress(progress);
}

ui.close.addEventListener('click', () => {
    ui.modal.classList.add('hidden');
});

ui.start.addEventListener("click", () => {
  openMenu();
});

function laneToX(l){
    const m = canvas.width / 2;
    const w = Math.min(canvas.width * 0.6, 700 * devicePixelRatio);

    return m + lanesX[l]*w;
}

function moveLeft(){
    if (state.lane > 0) {
        state.lane--;
        tiltAngle = -0.2;
    }
}

function moveRight(){
    if (state.lane < 2) {
        state.lane++;
        tiltAngle = 0.2;
    }
}

function updateTilt(){
    if (tiltAngle > 0) {
        tiltAngle -= 0.02;

        if (tiltAngle < 0)
            tiltAngle = 0;
    }

    if (tiltAngle < 0) {
        tiltAngle += 0.02;

        if (tiltAngle > 0)
            tiltAngle = 0;
    }
}

function drawPlayer(){
    const px = laneToX(state.lane);
    const py = canvas.height - 120;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(tiltAngle);
    ctx.drawImage(playerImg, -35, -70, 70, 140);
    ctx.restore();

    updateTilt();
}

function drawRoad(){
    // Grama no fundo
    ctx.fillStyle = "#2E7D32";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Variáveis para o posicionamento da estrada
    const roadWidth = Math.min(canvas.width * 0.6, 700 * devicePixelRatio);
    const roadX = (canvas.width - roadWidth) / 2;

    // Asfalto
    ctx.fillStyle = "#555";
    ctx.fillRect(roadX, 0, roadWidth, canvas.height);

    // Variáveis para o guard-rail
    const railWidth = 10;
    const postWidth = 12;
    const postHeight = 40;
    const postGap = 80;
    const postScrollTotal = postHeight + postGap;
    const postOffset = state.scroll % postScrollTotal;

    // Guard-rails
    ctx.fillStyle = "#BDBDBD";
    ctx.fillRect(roadX - railWidth / 2, 0, railWidth, canvas.height);
    ctx.fillRect(roadX + roadWidth - railWidth / 2, 0, railWidth, canvas.height);

    ctx.fillStyle = "#888";
    for (let y = -postScrollTotal; y < canvas.height + postScrollTotal; y += postScrollTotal) {
        const currentY = y + postOffset;

        ctx.fillRect(roadX - postWidth / 2, currentY, postWidth, postHeight);
        ctx.fillRect(roadX + roadWidth - postWidth / 2, currentY, postWidth, postHeight);
    }

    // Faixas
    const laneWidth = roadWidth / 3;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 6;
    ctx.setLineDash([]);

    const segmentLength = 60;
    const gap = 40;
    const total = segmentLength + gap;
    const offset = state.scroll % total;

    for (let i = 1; i < 3; i++) {
        const x = roadX + i * laneWidth;

        for (let y = -total; y < canvas.height + total; y += total) {
            ctx.beginPath();
            ctx.moveTo(x, y + offset);
            ctx.lineTo(x, y + offset + segmentLength);
            ctx.stroke();
        }
    }
}

function drawGate(g){
    // Se o portal já desapareceu, não faz nada
    if (g.alpha <= 0)
        return;

    const x = laneToX(g.lane);
    const y = g.y + state.scroll;

    if (g.type === "finish") {
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(0, y, canvas.width, 10);
        ctx.fillStyle = "#fff";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏁 CHEGADA 🏁", canvas.width/2, y - 15);
        ctx.fillText(`Pontuação mínima: ${g.value} pts`, canvas.width/2, y + 25);
        return;
    }

    ctx.save();

    ctx.globalAlpha = g.alpha;
    ctx.translate(x, y);
    ctx.scale(g.scale, g.scale);

    ctx.fillStyle = (g.type === "add" || g.type === "mul") ? "#0f0" : "#f00";
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    let txt = "";

    if (g.type === "add") txt = `+${g.value}`;
    if (g.type === "sub") txt = `-${g.value}`;
    if (g.type === "mul") txt = `x${g.value}`;
    if (g.type === "div") txt = `/${g.value}`;

    ctx.fillText(txt, 0, 5);

    ctx.restore();
}

function applyGate(g){
    if (g.hit)
        return;

    g.hit = true;

    // NOVO: Encontra todos os portais na mesma altura e ativa o efeito de desaparecer
    state.gates.forEach(otherGate => {
          if (otherGate.y === g.y) {
              otherGate.disappearing = true;
          }
    });

    if (g.type === "finish") {
        state.running = false;
        const minScore = g.value;

        if (state.score >= minScore) {
            state.finished = true;
        } else {
            state.gameOver = true;
        }

        return;
    }

    if (g.type === "add") {
        state.score += g.value;
        state.velocity += g.value;
    }

    if (g.type === "mul") {
        state.score *= g.value;
        state.velocity = Math.round(state.velocity * g.value);
    }

    if (g.type === "sub") {
        state.score -= g.value;
        state.velocity = Math.max(0, state.velocity - g.value);
    }

    if (g.type === "div") {
        state.score = Math.floor(state.score / g.value);
        state.velocity = Math.max(0, Math.round(state.velocity / g.value));
    }

    // Limita a velocidade em 100 km/h
    state.velocity = Math.min(Math.max(state.velocity, 0), 100);

    if (state.velocity <= 0) {
        state.gameOver = true;
        state.running = false;
    }
}

function updateGates() {
    state.gates.forEach(g => {

        if (g.disappearing && g.alpha > 0) {
            g.alpha -= 0.05;
            g.scale -= 0.05;

            if (g.alpha < 0)
                g.alpha = 0;

            if (g.scale < 0)
                g.scale = 0;
        }
    });
}

function collide() {
    const px = state.lane;
    const py = canvas.height - 100;

    for (const g of state.gates) {
        const dist = Math.abs((g.y + state.scroll) - py);

        if (g.type === 'finish') {
            const finishThreshold = 60;
            if (!g.hit && dist < finishThreshold)
                applyGate(g);

        } else {
            const gateThreshold = 40;

            if (!g.hit && !g.disappearing && g.lane === px && dist < gateThreshold)
                applyGate(g);
        }
    }
}

function reset() {
    state.time = 0;
    state.scroll = 0;
    state.speed = state.baseSpeed;
    state.lane = 1;
    state.targetLane = 1;
    state.velocity = 20;
    state.finished = false;
    state.gameOver = false;
    state.running = true;
    state.score = 100;
    const levelGates = levels[state.currentLevel % levels.length];

    // Propriedades de animação a cada portal
    state.gates = levelGates.map(g => ({
        ...g,
        hit: false,
        disappearing: false,
        alpha: 1,
        scale: 1
    }));

    resultModal.classList.add("hidden");
    ui.modal.classList.add("hidden");
}

function showResultModal(success) {
    resultTitle.textContent = success ? "🎉 Fase Concluída!" : "❌ Você falhou!";
    resultScore.textContent = `Pontuação final: ${state.score} pts`;

    // Desbloqueia próxima fase se houver
    if (success && state.currentLevel + 1 < levels.length && !progress.unlocked[state.currentLevel + 1]) {
        progress.unlocked[state.currentLevel + 1] = true;
        saveProgress(progress);
        populateLevelButtons();
    }

    state.running = false;
    nextLevelBtn.style.display = success ? "inline-block" : "none";
    resultModal.style.zIndex = '1200';
    ui.modal.style.zIndex = '1100';

    backMenuBtn.onclick = () => {
        resultModal.classList.add('hidden');

        setTimeout(() => {
            populateLevelButtons();
            ui.modal.classList.remove('hidden');
            ui.modal.style.zIndex = '1300';
        }, 40);
    };

    nextLevelBtn.onclick = () => {
        resultModal.classList.add('hidden');
        setTimeout(() => goToNextLevel(), 40);
    };

    resultModal.classList.remove('hidden');
}

function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.running) {
        const roadSpeed = Math.min(Math.sqrt(state.velocity) * 0.15, 10);
        state.scroll += roadSpeed;

        collide();
    }

    updateGates();
    drawRoad();

    for (const g of state.gates) {
        drawGate(g);
    }

    drawPlayer();

    ui.velocity.textContent = `🚗 ${state.velocity} km/h | 🏆 ${state.score} pts`;

    if (!state.running && !resultModal.classList.contains("hidden")) {
        // modal de resultado aberto — não faz nada
    } else if (state.finished) {
        state.running = false;
        showResultModal(true);
    } else if (state.gameOver) {
        state.running = false;
        showResultModal(false);
    }

    requestAnimationFrame(frame);
}

// Controles
window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA')
        moveLeft();

    if (e.code === 'ArrowRight' || e.code === 'KeyD')
        moveRight();
});

populateLevelButtons();
openMenu();
frame();

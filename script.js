import { levels } from './levels.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
}
resize();
window.addEventListener('resize', resize);

const lanesX = [-0.28, 0, 0.28];
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
    currentLevel: 0
};

const ui = {
    velocity: document.getElementById('velocityBox'),
    start: document.getElementById('btnStart'),
    modal: document.getElementById('levelModal'),
    levelButtons: document.getElementById('levelButtons'),
    close: document.getElementById('btnClose')
};

// Cria botões de fase na modal
function populateLevelButtons(){
    ui.levelButtons.innerHTML = "";
    levels.forEach((_,i)=>{
        const btn = document.createElement('button');
        btn.textContent = `Fase ${i+1}`;
        btn.className = "btn-level";
        btn.addEventListener('click', ()=>{
            state.currentLevel = i;
            reset();
            ui.modal.classList.add('hidden');
        });
        ui.levelButtons.appendChild(btn);
    });
}

populateLevelButtons();

// Fechar modal
ui.close.addEventListener('click', () => {
    ui.modal.classList.add('hidden');
});

// Reiniciar fase atual
ui.start.addEventListener('click', () => {
    reset();
});

// Funções do jogo
function laneToX(l){
    const m = canvas.width / 2;
    const w = Math.min(canvas.width * 0.6, 700 * devicePixelRatio);
    return m + lanesX[l]*w;
}

function drawPlayer(){
    const px = laneToX(state.lane);
    const py = canvas.height - 120;

    ctx.fillStyle = "#ff0000";
    ctx.fillRect(px - 25, py - 50, 50, 100);

    ctx.fillStyle = "#fff";
    ctx.fillRect(px - 20, py - 40, 40, 30);
}

function drawRoad(){
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const roadWidth = Math.min(canvas.width * 0.6, 700 * devicePixelRatio);
    const roadX = (canvas.width - roadWidth) / 2;

    // Pista
    ctx.fillStyle = "#555";
    ctx.fillRect(roadX, 0, roadWidth, canvas.height);

    // Linhas brancas centrais
    const laneWidth = roadWidth / 3;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.setLineDash([40, 40]);

    for (let i = 1; i < 3; i++) {
        const x = roadX + i * laneWidth;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    ctx.setLineDash([]);
}

function drawGate(g){
    const x = laneToX(g.lane);
    const y = g.y + state.scroll;

    if (g.type === "finish") {
        ctx.fillStyle = "#FFD700";
        ctx.fillRect(0, y, canvas.width, 10);
        ctx.fillStyle = "#fff";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🏁 CHEGADA 🏁", canvas.width/2, y - 15);
        ctx.fillText(`Velocidade mínima: ${g.value} km/h`, canvas.width/2, y + 25);
        return;
    }

    ctx.fillStyle = (g.type === "add" || g.type === "mul") ? "#0f0" : "#f00";
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    let txt = "";
    if (g.type === "add") txt = `+${g.value}`;
    if (g.type === "sub") txt = `-${g.value}`;
    if (g.type === "mul") txt = `x${g.value}`;
    if (g.type === "div") txt = `/${g.value}`;
    ctx.fillText(txt, x, y + 5);
}

function applyGate(g){
    if (g.hit) return;
    g.hit = true;

    if (g.type === "finish") {
        state.running = false;
        const minVel = g.value ?? 100;
        if (state.velocity >= minVel) {
            state.finished = true;
        } else {
            state.gameOver = true;
        }
        return;
    }

    if (g.type === "add") state.velocity += g.value;
    if (g.type === "mul") state.velocity = Math.round(state.velocity * g.value);
    if (g.type === "sub") state.velocity = Math.max(0, state.velocity - g.value);
    if (g.type === "div") state.velocity = Math.max(0, Math.round(state.velocity / g.value));

    state.velocity = Math.min(state.velocity, 100);

    if (state.velocity <= 0) {
        state.gameOver = true;
        state.running = false;
    }
}

function collide() {
    const px = state.lane;
    const py = canvas.height - 100;
    for (const g of state.gates) {
        if (!g.hit && g.lane === px && Math.abs((g.y + state.scroll) - py) < 40) {
            applyGate(g);
        }
    }
}

function reset() {
    state.running = true;
    state.time = 0;
    state.scroll = 0;
    state.speed = state.baseSpeed;
    state.lane = 1;
    state.targetLane = 1;
    state.velocity = 20;
    state.finished = false;
    state.gameOver = false;

    const levelGates = levels[state.currentLevel % levels.length];
    state.gates = levelGates.map(g => ({ ...g, hit: false }));
}

function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.running) {
        const roadSpeed = Math.min(Math.sqrt(state.velocity) * 0.3, 10);
        state.scroll += roadSpeed;
        collide();
    }

    drawRoad();

    for (const g of state.gates) {
        drawGate(g);
    }

    drawPlayer();
    ui.velocity.textContent = `🚗 ${state.velocity} km/h`;

    if (state.finished) {
        ctx.fillStyle = '#0f0';
        ctx.font = "32px sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText("🎉 Fase Concluída!", canvas.width / 2, canvas.height / 2);
    }
    if (state.gameOver) {
        ctx.fillStyle = '#f00';
        ctx.font = "32px sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText("❌ Você falhou!", canvas.width / 2, canvas.height / 2);
    }

    requestAnimationFrame(frame);
}

window.addEventListener('keydown', e => {
    if(e.code==='ArrowLeft'||e.code==='KeyA'){ state.lane=Math.max(0,state.lane-1); }
    if(e.code==='ArrowRight'||e.code==='KeyD'){ state.lane=Math.min(2,state.lane+1); }
});

frame();

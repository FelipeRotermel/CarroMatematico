import { Game } from "./src/js/Game.js";

/**
 * Application Entry Point & Bootstrapper for "Carro Matemático"
 */
function initGame() {
    if (window.gameApp) {
        return;
    }

    try {
        const app = new Game();

        window.gameApp = app;
        window.game = app;
    } catch (err) {
        const status = document.getElementById("bootStatus");

        if (status) {
            status.classList.remove("hidden");
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGame);
} else {
    initGame();
}

/**
 * Antigravity - Mini-framework para gerenciamento de estado e DOM
 * Desenvolvido como engine super leve para projetos práticos.
 */
export class Component {
    constructor() {
        this.state = {};
        // Adia a inicialização para permitir que a classe filha defina o seu estado inicial.
        setTimeout(() => this._init(), 0);
    }

    async _init() {
        this._renderToDOM();
        if (this.onMount) {
            await this.onMount();
        }
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this._renderToDOM();
    }

    _renderToDOM() {
        const appElement = document.getElementById('app');
        if (!appElement || !this.render) return;

        // Hack exclusivo para não destruir a tag <canvas> do Teachable Machine nas re-renderizações.
        // Simulando a persistência do DOM Virtual :)
        let savedCanvas = null;
        const webcamContainer = document.getElementById('webcam-container');
        if (webcamContainer && webcamContainer.firstChild) {
            savedCanvas = webcamContainer.firstChild;
        }

        // Aplica o novo HTML
        appElement.innerHTML = this.render();

        // Repõe a webcam no novo container, se ele ainda existir na renderização
        const newWebcamContainer = document.getElementById('webcam-container');
        if (newWebcamContainer && savedCanvas) {
            newWebcamContainer.appendChild(savedCanvas);
        }
    }
}

import { Component } from 'antigravity';

class JogoIA extends Component {
    constructor() {
        super();
        this.state = {
            userChoice: 'Aguardando...',
            computerChoice: '?',
            result: 'Carregando IA...',
            isPlaying: false,
            isLoading: true,
            cameraError: false,
            simulationMode: false,
            statusColor: 'neutro'
        };
    }

    async onMount() {
        try {
            // Tenta detectar câmeras
            const devices = await navigator.mediaDevices.enumerateDevices();
            const video = devices.filter(d => d.kind === 'videoinput');
            
            if (video.length > 0) {
                await this.initAI(video[0].deviceId);
            } else {
                // Se não detectar nada, oferece o modo de segurança
                this.setState({ isLoading: false, cameraError: true, result: "Sensor não detectado" });
            }
        } catch (e) {
            this.setState({ isLoading: false, cameraError: true });
        }
    }

    async initAI(deviceId) {
        try {
            const URL = "https://teachablemachine.withgoogle.com/models/ib_Kd5aCH/";
            
            // Carrega o Modelo
            this.model = await tmImage.load(URL + "model.json", URL + "metadata.json");
            
            // Configura Webcam
            this.webcam = new tmImage.Webcam(350, 350, true);
            await this.webcam.setup({ deviceId: deviceId });
            await this.webcam.play();
            
            this.setState({ isLoading: false, cameraError: false, result: "Mostre sua jogada!" });
            
            const container = document.getElementById("webcam-container");
            if (container) container.appendChild(this.webcam.canvas);
            
            this.loop();
        } catch (error) {
            console.error(error);
            this.setState({ isLoading: false, cameraError: true });
        }
    }

    async loop() {
        if (!this.webcam || this.state.cameraError) return;
        this.webcam.update();
        await this.predict();
        window.requestAnimationFrame(() => this.loop());
    }

    async predict() {
        if (this.state.isLoading || this.state.isPlaying) return;
        
        const prediction = await this.model.predict(this.webcam.canvas);
        const best = prediction.reduce((prev, curr) => (prev.probability > curr.probability) ? prev : curr);

        if (best.probability > 0.9 && best.className.toLowerCase() !== "fundo") {
            this.processarJogada(best.className.trim());
        }
    }

    processarJogada(escolha) {
        if (this.state.isPlaying) return;

        const opcoes = ['Pedra', 'Papel', 'Tesoura'];
        const pc = opcoes[Math.floor(Math.random() * 3)];
        let res = "";
        let color = "neutro";

        if (escolha === pc) { res = "Empate!"; color = "empate"; }
        else if (
            (escolha === 'Pedra' && pc === 'Tesoura') ||
            (escolha === 'Papel' && pc === 'Pedra') ||
            (escolha === 'Tesoura' && pc === 'Papel')
        ) {
            res = "Você Venceu! 🎉"; color = "vitoria";
        } else {
            res = "IA Venceu! 😢"; color = "derrota";
        }

        this.setState({ 
            userChoice: escolha, 
            computerChoice: pc, 
            result: res, 
            statusColor: color, 
            isPlaying: true 
        });

        // Resetar para próxima rodada
        setTimeout(() => {
            this.setState({ 
                isPlaying: false, 
                result: "Mostre sua jogada!",
                statusColor: "neutro" 
            });
        }, 3000);
    }

    render() {
        return `
            <div class="game-container status-${this.state.statusColor}">
                <header class="game-header">
                    <h2>Jokenpô AI <span class="ai-badge">PROVA</span></h2>
                </header>

                <div class="main-content">
                    <div class="webcam-box">
                        ${this.state.isLoading ? '<div class="absolute-center spinner"></div>' : ''}
                        <div id="webcam-container"></div>
                        
                        ${this.state.cameraError ? `
                            <div class="absolute-center" style="text-align:center;">
                                <p style="color:#ff4444; font-size:0.9rem; margin-bottom:10px;">Câmera não encontrada</p>
                                <button onclick="window.app.setState({simulationMode: true, cameraError: false})" class="btn-primary">Ativar Modo Simulação</button>
                            </div>
                        ` : ''}

                        ${this.state.simulationMode ? `
                            <div class="absolute-center simulation-pane">
                                <p>Simular Jogada:</p>
                                <div class="btn-group">
                                    <button onclick="window.app.processarJogada('Pedra')">✊</button>
                                    <button onclick="window.app.processarJogada('Papel')">🖐️</button>
                                    <button onclick="window.app.processarJogada('Tesoura')">✌️</button>
                                </div>
                            </div>
                        ` : ''}

                        <div class="webcam-overlay ${this.state.isPlaying ? 'locked' : ''}">
                            <div class="lock-text">${this.state.isPlaying ? this.state.result : ''}</div>
                        </div>
                    </div>

                    <div class="scoreboard bg-glass">
                        <div class="score-line">
                            <span class="label">Jogador</span>
                            <span class="val">${this.state.userChoice}</span>
                        </div>
                        <div class="score-line">
                            <span class="label">IA</span>
                            <span class="val">${this.state.computerChoice}</span>
                        </div>
                        <hr>
                        <h3 class="result-text">${this.state.result}</h3>
                    </div>
                </div>
                
                <footer class="game-footer">
                    <p>Integrando Antigravity + Teachable Machine</p>
                </footer>
            </div>
        `;
    }
}

window.app = new JogoIA();

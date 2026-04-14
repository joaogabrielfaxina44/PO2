import { Component } from 'antigravity';

class JogoIA extends Component {
    constructor() {
        super();
        this.state = {
            userChoice: 'Aguardando...',
            computerChoice: '?',
            result: 'Mostre sua jogada na câmera!',
            isPlaying: false,
            isLoading: true
        };
    }

    async onMount() {
        // Link fornecido do Teachable Machine
        const URL = "https://teachablemachine.withgoogle.com/models/ib_Kd5aCH/";
        
        try {
            // Carrega a IA
            this.model = await tmImage.load(URL + "model.json", URL + "metadata.json");
            
            // Configurar webcam
            this.webcam = new tmImage.Webcam(300, 300, true);
            await this.webcam.setup(); // request access to the webcam
            await this.webcam.play();
            
            this.setState({ isLoading: false });
            
            const webcamContainer = document.getElementById("webcam-container");
            if (webcamContainer) {
                webcamContainer.appendChild(this.webcam.canvas);
            }
            
            this.loop();
        } catch (error) {
            console.error("Erro ao carregar a IA ou webcam:", error);
            this.setState({ result: "Erro ao acessar a câmera. Tente novamente." });
        }
    }

    async loop() {
        if (!this.webcam) return;
        this.webcam.update();
        await this.predict();
        window.requestAnimationFrame(() => this.loop());
    }

    async predict() {
        const prediction = await this.model.predict(this.webcam.canvas);
        
        const bestPrediction = prediction.reduce((prev, current) => 
            (prev.probability > current.probability) ? prev : current
        );

        // Garantir predição confiável, ignorando fundos ou ruídos
        if (bestPrediction.probability > 0.9) {
            const classNome = bestPrediction.className.trim();
            // Ignora se for lido como Fundo
            if (classNome.toLowerCase() !== "fundo" && classNome !== "Background") {
                this.processarJogada(classNome);
            }
        }
    }

    processarJogada(escolhaUsuario) {
        if (this.state.isPlaying) return;

        // Normalização de nomes só pra garantir
        const escolhasMap = {
            'pedra': 'Pedra',
            'papel': 'Papel',
            'tesoura': 'Tesoura'
        };
        const uChoiceNormal = escolhaUsuario.toLowerCase();
        const jogadaSegura = escolhasMap[uChoiceNormal] || escolhaUsuario; // Cai de volta se não for uma das 3 exatas

        const opcoes = ['Pedra', 'Papel', 'Tesoura'];
        const escolhaComputador = opcoes[Math.floor(Math.random() * 3)];
        
        let resultado = "";
        let statusColor = "neutro"; // para mudar o CSS via Antigravity

        if (jogadaSegura === escolhaComputador) {
            resultado = "Empate!";
            statusColor = "empate";
        } else if (
            (jogadaSegura === 'Pedra' && escolhaComputador === 'Tesoura') ||
            (jogadaSegura === 'Papel' && escolhaComputador === 'Pedra') ||
            (jogadaSegura === 'Tesoura' && escolhaComputador === 'Papel')
        ) {
            resultado = "Você Venceu! 🎉";
            statusColor = "vitoria";
        } else {
            resultado = "Computador Venceu! 😢";
            statusColor = "derrota";
        }

        // Atualiza a tela com o resultado e bloqueia novas leituras por um momento
        this.setState({ 
            userChoice: jogadaSegura, 
            computerChoice: escolhaComputador, 
            result: resultado,
            statusColor: statusColor,
            isPlaying: true 
        });

        // Libera após 3 segundos
        setTimeout(() => {
            this.setState({ 
                isPlaying: false, 
                result: "Mostre sua jogada!",
                userChoice: 'Aguardando...',
                computerChoice: '?',
                statusColor: "neutro"
            });
        }, 3000);
    }

    render() {
        if (this.state.isLoading) {
            return `
              <div class="game-container loading-container">
                  <h2>Carregando Inteligência Artificial...</h2>
                  <div class="spinner"></div>
              </div>
            `;
        }

        // Renderização principal e dinâmica do DOM via Antigravity
        return `
            <div class="game-container status-${this.state.statusColor || 'neutro'}">
                <header class="game-header">
                    <h2>Pedra, Papel, Tesoura <span class="ai-badge">VS IA</span></h2>
                </header>
                
                <div class="main-content">
                    <div class="webcam-box">
                        <div id="webcam-container"></div>
                        <div class="webcam-overlay ${this.state.isPlaying ? 'locked' : ''}">
                            ${this.state.isPlaying ? `<div class="lock-text">${this.state.result}</div>` : ''}
                        </div>
                    </div>

                    <div class="scoreboard bg-glass">
                        <div class="score-line">
                            <span class="label">Você:</span>
                            <span class="val pulse-text">${this.state.userChoice}</span>
                        </div>
                        <div class="score-line">
                            <span class="label">IA:</span>
                            <span class="val delay-pulse">${this.state.computerChoice}</span>
                        </div>
                        <hr>
                        <h3 class="result-text">${this.state.result}</h3>
                    </div>
                </div>
            </div>
        `;
    }
}

// Inicia o App
const app = new JogoIA();

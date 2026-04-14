import { Component } from 'antigravity';

class JogoIA extends Component {
    constructor() {
        super();
        this.state = {
            userChoice: 'Aguardando...',
            computerChoice: '?',
            result: 'Mostre sua jogada na câmera!',
            isPlaying: false,
            isLoading: true,
            cameraError: false,
            devices: [],
            selectedDeviceId: null
        };
    }

    async onMount() {
        try {
            // Pede permissão inicial rápida para o Navegador liberar os nomes corretos (Camo, USB, etc)
            await navigator.mediaDevices.getUserMedia({ video: true });
            
            // Busca todos os dispositivos de mídia logados no PC
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 0) {
                // Guarda eles no State
                this.setState({ 
                    devices: videoDevices,
                    selectedDeviceId: videoDevices[0].deviceId
                });
                
                // Inicia a Câmera AI passando o ID específico
                await this.initAI(videoDevices[0].deviceId);
            } else {
                throw new Error("Nenhuma câmera encontrada no sistema.");
            }
        } catch (error) {
            console.error("Erro ao verificar câmeras:", error);
            this.setState({ isLoading: false, cameraError: true });
        }
    }

    // Método chamado ao inicializar e também ao trocar de câmera na dropdown
    async initAI(deviceId) {
        this.setState({ isLoading: true, selectedDeviceId: deviceId });
        
        try {
            // Se já tiver uma webcam rodando antes (troca de id), para o stream anterior e remove o canvas antigo.
            if (this.webcam) {
                this.webcam.stop();
                const container = document.getElementById("webcam-container");
                if (container && container.firstChild) {
                    container.innerHTML = '';
                }
            }

            const URL = "https://teachablemachine.withgoogle.com/models/ib_Kd5aCH/";
            
            // Só carrega os Pesos da Inteligência Artificial uma vez
            if (!this.model) {
                this.model = await tmImage.load(URL + "model.json", URL + "metadata.json");
            }
            
            // Inicializa a câmera apontando para o Sensor Virtual do Camo
            this.webcam = new tmImage.Webcam(300, 300, true);
            await this.webcam.setup({ deviceId: deviceId }); 
            await this.webcam.play();
            
            this.setState({ isLoading: false });
            
            const webcamContainer = document.getElementById("webcam-container");
            if (webcamContainer) {
                webcamContainer.appendChild(this.webcam.canvas);
            }
            
            this.loop();
        } catch (error) {
            console.error("Erro no setup da IA:", error);
            this.setState({ isLoading: false, cameraError: true });
        }
    }

    // Chamado pelo <select> do HTML
    mudarCamera(novoDeviceId) {
        if (novoDeviceId !== this.state.selectedDeviceId) {
            this.initAI(novoDeviceId);
        }
    }

    async loop() {
        if (!this.webcam) return;
        this.webcam.update();
        await this.predict();
        window.requestAnimationFrame(() => this.loop());
    }

    async predict() {
        if (this.state.isLoading) return; // proteção extra
        const prediction = await this.model.predict(this.webcam.canvas);
        
        const bestPrediction = prediction.reduce((prev, current) => 
            (prev.probability > current.probability) ? prev : current
        );

        if (bestPrediction.probability > 0.9) {
            const classNome = bestPrediction.className.trim();
            if (classNome.toLowerCase() !== "fundo" && classNome !== "Background") {
                this.processarJogada(classNome);
            }
        }
    }

    processarJogada(escolhaUsuario) {
        if (this.state.isPlaying) return;

        const escolhasMap = { 'pedra': 'Pedra', 'papel': 'Papel', 'tesoura': 'Tesoura' };
        const uChoiceNormal = escolhaUsuario.toLowerCase();
        const jogadaSegura = escolhasMap[uChoiceNormal] || escolhaUsuario; 

        const opcoes = ['Pedra', 'Papel', 'Tesoura'];
        const escolhaComputador = opcoes[Math.floor(Math.random() * 3)];
        
        let resultado = "";
        let statusColor = "neutro";

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

        this.setState({ 
            userChoice: jogadaSegura, 
            computerChoice: escolhaComputador, 
            result: resultado,
            statusColor: statusColor,
            isPlaying: true 
        });

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
        if (this.state.cameraError) {
            return `
              <div class="game-container status-derrota">
                  <h2>Erro na Câmera 📷</h2>
                  <p style="font-size: 1.2rem; margin-top: 10px; text-align: center;">O navegador bloqueou o acesso à sua webcam ou ela está sendo usada por outro app.</p>
                  <p style="font-size: 1rem; color: var(--text-muted); text-align: center;">Por favor, libere o acesso no ícone de "Configurações de site" (cadeado) na barra de endereços ali em cima e recarregue a página.</p>
                  <button onclick="location.reload()" style="padding:12px 24px; font-size:1.2rem; cursor:pointer; margin-top:20px; border-radius:12px; border:none; background:var(--primary); color:white; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">Tentar Novamente</button>
              </div>
            `;
        }

        if (this.state.isLoading && this.state.devices.length === 0) {
            return `
              <div class="game-container loading-container">
                  <h2>Buscando Câmeras Disponíveis...</h2>
                  <div class="spinner"></div>
              </div>
            `;
        }

        // Renderiza as opções de câmera
        const cameraOptions = this.state.devices.map(device => {
            return `<option value="${device.deviceId}" ${this.state.selectedDeviceId === device.deviceId ? 'selected' : ''}>
                ${device.label || 'Câmera Desconhecida'}
            </option>`;
        }).join('');

        return `
            <div class="game-container status-${this.state.statusColor || 'neutro'}">
                <header class="game-header">
                    <h2>Pedra, Papel, Tesoura <span class="ai-badge">VS IA</span></h2>
                    
                    <div class="camera-selector">
                        <label for="cam-select">Sua Câmera:</label>
                        <select id="cam-select" onchange="window.app.mudarCamera(this.value)">
                            ${cameraOptions}
                        </select>
                    </div>
                </header>
                
                <div class="main-content">
                    <div class="webcam-box">
                        ${this.state.isLoading ? '<div class="absolute-center spinner"></div>' : '<div id="webcam-container"></div>'}
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

// Expõe globalmente para que o HTML <select onchange="..."> possa chamá-lo
window.app = new JogoIA();

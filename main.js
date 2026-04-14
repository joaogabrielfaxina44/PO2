import { Component } from 'antigravity';

class JogoIA extends Component {
    constructor() {
        super();
        this.state = {
            userChoice: 'Aguardando...',
            computerChoice: '?',
            result: 'Aguardando câmera...',
            isPlaying: false,
            isLoading: true,
            cameraError: false,
            devices: [],
            selectedDeviceId: null
        };
    }

    async onMount() {
        // Tenta detectar câmeras sem travar o código se falhar
        await this.detectCameras();
    }

    async detectCameras() {
        try {
            // Tenta listar o que o Windows reporta
            let allDevices = await navigator.mediaDevices.enumerateDevices();
            let videoDevices = allDevices.filter(device => device.kind === 'videoinput');

            // Se não vier nomes (labels), precisamos pedir permissão primeiro
            if (videoDevices.length > 0 && !videoDevices[0].label) {
                try {
                    // Pede permissão apenas para vídeo
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    // Se deu certo, para o stream temporário para não dar conflito
                    stream.getTracks().forEach(track => track.stop());
                    
                    // Lista de novo para pegar os nomes reais (Camo, etc)
                    allDevices = await navigator.mediaDevices.enumerateDevices();
                    videoDevices = allDevices.filter(device => device.kind === 'videoinput');
                } catch (e) {
                    console.warn("Permissão negada ou erro no prompt inicial:", e);
                }
            }

            if (videoDevices.length > 0) {
                this.setState({ 
                    devices: videoDevices,
                    selectedDeviceId: videoDevices[0].deviceId,
                    cameraError: false
                });
                await this.initAI(videoDevices[0].deviceId);
            } else {
                // Se chegou aqui, o Camo não está sendo visto pelo Chrome
                this.setState({ isLoading: false, cameraError: true });
            }
        } catch (error) {
            console.error("Erro na detecção:", error);
            this.setState({ isLoading: false, cameraError: true });
        }
    }

    async initAI(deviceId) {
        this.setState({ isLoading: true, selectedDeviceId: deviceId });
        
        try {
            if (this.webcam) {
                this.webcam.stop();
                const container = document.getElementById("webcam-container");
                if (container) container.innerHTML = '';
            }

            const URL = "https://teachablemachine.withgoogle.com/models/ib_Kd5aCH/";
            if (!this.model) {
                this.model = await tmImage.load(URL + "model.json", URL + "metadata.json");
            }
            
            // Tenta forçar a resolução padrão para webcams virtuais
            this.webcam = new tmImage.Webcam(300, 300, true);
            
            // Adicionando um pequeno delay para o Camo Studio "acordar"
            await new Promise(r => setTimeout(r, 500));
            
            await this.webcam.setup({ deviceId: deviceId }); 
            await this.webcam.play();
            
            this.setState({ isLoading: false, cameraError: false });
            
            const webcamContainer = document.getElementById("webcam-container");
            if (webcamContainer) {
                webcamContainer.appendChild(this.webcam.canvas);
            }
            
            this.loop();
        } catch (error) {
            console.error("Erro ao iniciar câmera especifica:", error);
            // Se falhar, talvez seja permissão ou o Camo ocupado
            this.setState({ isLoading: false, cameraError: true });
        }
    }

    mudarCamera(novoDeviceId) {
        this.initAI(novoDeviceId);
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
        
        const bestPrediction = prediction.reduce((prev, current) => 
            (prev.probability > current.probability) ? prev : current
        );

        if (bestPrediction.probability > 0.85) {
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
            resultado = "IA Venceu! 😢";
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
                  <h2>Ops! Camo não detectado 📷</h2>
                  <p style="font-size: 1.1rem; margin-top: 10px; text-align: center;">Não conseguimos encontrar sua câmera. O Camo Studio está aberto e transmitindo?</p>
                  
                  <div style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 10px; margin: 15px 0; font-size: 0.9rem; border: 1px dashed var(--primary);">
                    <strong>Dicas para resolver:</strong><br>
                    1. Verifique se o celular está conectado ao Camo no PC.<br>
                    2. Clique no ícone de "Configurações" (Tune) ao lado da URL e marque "Câmera: Permitir".<br>
                    3. Reinicie o Chrome se você acabou de instalar o Camo.
                  </div>

                  <button onclick="location.reload()" style="padding:12px 24px; font-size:1.1rem; cursor:pointer; border-radius:12px; border:none; background:var(--primary); color:white; box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);">Tentar Novamente</button>
              </div>
            `;
        }

        if (this.state.isLoading && this.state.devices.length === 0) {
            return `
              <div class="game-container loading-container">
                  <h2>Sincronizando com Camo Studio...</h2>
                  <div class="spinner"></div>
              </div>
            `;
        }

        const cameraOptions = this.state.devices.map(device => {
            return `<option value="${device.deviceId}" ${this.state.selectedDeviceId === device.deviceId ? 'selected' : ''}>
                ${device.label || 'Câmera (Permissão Necessária)'}
            </option>`;
        }).join('');

        return `
            <div class="game-container status-${this.state.statusColor || 'neutro'}">
                <header class="game-header">
                    <h2>Pedra, Papel, Tesoura <span class="ai-badge">VS IA</span></h2>
                    
                    <div class="camera-selector">
                        <select id="cam-select" onchange="window.app.mudarCamera(this.value)">
                            <option value="">-- Selecione sua Câmera --</option>
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

window.app = new JogoIA();

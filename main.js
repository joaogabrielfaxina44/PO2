import { Component } from 'antigravity';

class JogoIA extends Component {
    constructor() {
        super();
        this.state = {
            userChoice: 'Aguardando...',
            computerChoice: '?',
            result: 'Diagnosticando...',
            isPlaying: false,
            isLoading: true,
            cameraError: false,
            devices: [],
            allMediaDevices: [], // Todos os dispositivos para debug
            lastError: null,
            selectedDeviceId: null
        };
    }

    async onMount() {
        await this.diagnostic();
    }

    async diagnostic() {
        try {
            // Varredura completa de hardware detectado pelo navegador
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            this.setState({ allMediaDevices: allDevices });

            const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 0) {
                this.setState({ devices: videoDevices, cameraError: false });
                // Tenta iniciar a primeira
                await this.initAI(videoDevices[0].deviceId);
            } else {
                // Tenta forçar um pedido de permissão para ver se as câmeras "acordam"
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    stream.getTracks().forEach(t => t.stop());
                    // Busca de novo após permissão
                    const retryDevices = await navigator.mediaDevices.enumerateDevices();
                    const retryVideo = retryDevices.filter(d => d.kind === 'videoinput');
                    
                    if (retryVideo.length > 0) {
                        this.setState({ devices: retryVideo, allMediaDevices: retryDevices, cameraError: false });
                        await this.initAI(retryVideo[0].deviceId);
                    } else {
                        throw new Error("Nenhum sensor de vídeo encontrado mesmo após permissão.");
                    }
                } catch (e) {
                    this.setState({ lastError: e.name + ": " + e.message, isLoading: false, cameraError: true });
                }
            }
        } catch (err) {
            this.setState({ lastError: err.name + ": " + err.message, isLoading: false, cameraError: true });
        }
    }

    async initAI(deviceId) {
        this.setState({ isLoading: true, selectedDeviceId: deviceId });
        try {
            if (this.webcam) { this.webcam.stop(); }
            
            const URL = "https://teachablemachine.withgoogle.com/models/ib_Kd5aCH/";
            if (!this.model) {
                this.model = await tmImage.load(URL + "model.json", URL + "metadata.json");
            }
            
            this.webcam = new tmImage.Webcam(300, 300, true);
            await this.webcam.setup({ deviceId: deviceId }); 
            await this.webcam.play();
            
            this.setState({ isLoading: false, cameraError: false });
            const webcamContainer = document.getElementById("webcam-container");
            if (webcamContainer) {
                webcamContainer.innerHTML = '';
                webcamContainer.appendChild(this.webcam.canvas);
            }
            this.loop();
        } catch (error) {
            this.setState({ lastError: error.name + ": " + error.message, isLoading: false, cameraError: true });
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
        const best = prediction.reduce((p, c) => (p.probability > c.probability) ? p : c);
        if (best.probability > 0.85 && best.className.toLowerCase() !== "fundo") {
            this.processarJogada(best.className.trim());
        }
    }

    processarJogada(escolha) {
        if (this.state.isPlaying) return;
        const opcoes = ['Pedra', 'Papel', 'Tesoura'];
        const pcChoice = opcoes[Math.floor(Math.random() * 3)];
        let res = "";
        let color = "neutro";
        
        if (escolha === pcChoice) { res = "Empate!"; color = "empate"; }
        else if ((escolha === 'Pedra' && pcChoice === 'Tesoura') || (escolha === 'Papel' && pcChoice === 'Pedra') || (escolha === 'Tesoura' && pcChoice === 'Papel')) {
            res = "Você Venceu! 🎉"; color = "vitoria";
        } else { res = "IA Venceu! 😢"; color = "derrota"; }

        this.setState({ userChoice: escolha, computerChoice: pcChoice, result: res, statusColor: color, isPlaying: true });
        setTimeout(() => this.setState({ isPlaying: false, result: "Mostre sua jogada!", userChoice: '...', statusColor: "neutro" }), 3000);
    }

    render() {
        // Abaixo da tela principal, vamos renderizar o DIAGNÓSTICO DE HARDWARE
        const debugInfo = this.state.allMediaDevices.map(d => 
            `<li style="margin-bottom:5px">Type: <b>${d.kind}</b> | Label: <b>${d.label || 'OCULTO (Sem Permissão)'}</b></li>`
        ).join('');

        return `
            <div class="game-container status-${this.state.statusColor || 'neutro'}">
                <header class="game-header">
                    <h2>Pedra, Papel, Tesoura <span class="ai-badge">IA</span></h2>
                    ${this.state.devices.length > 0 ? `
                        <div class="camera-selector">
                            <select onchange="window.app.initAI(this.value)">
                                ${this.state.devices.map(d => `<option value="${d.deviceId}">${d.label || 'Câmera'}</option>`).join('')}
                            </select>
                        </div>` : ''}
                </header>
                
                <div class="main-content">
                    <div class="webcam-box">
                        ${this.state.cameraError ? `
                            <div class="absolute-center" style="text-align:center; padding: 20px;">
                                <p style="color:#ff4444; font-weight:bold;">ERRO DE SENSOR</p>
                                <p style="font-size:0.8rem">${this.state.lastError || 'Nenhum dispositivo encontrado'}</p>
                                <button onclick="location.reload()" style="background:var(--primary); color:white; border:none; padding:8px 15px; border-radius:5px; margin-top:10px; cursor:pointer;">REPETIR BUSCA</button>
                            </div>
                        ` : (this.state.isLoading ? '<div class="absolute-center spinner"></div>' : '<div id="webcam-container"></div>')}
                        
                        <div class="webcam-overlay ${this.state.isPlaying ? 'locked' : ''}">
                            ${this.state.isPlaying ? `<div class="lock-text">${this.state.result}</div>` : ''}
                        </div>
                    </div>

                    <div class="scoreboard bg-glass">
                        <div class="score-line"><span class="label">Você:</span><span class="val">${this.state.userChoice}</span></div>
                        <div class="score-line"><span class="label">IA:</span><span class="val">${this.state.computerChoice}</span></div>
                        <hr><h3 class="result-text">${this.state.result}</h3>
                    </div>
                </div>

                <!-- PAINEL DE VARREDURA TÉCNICA -->
                <div style="margin-top: 30px; padding: 15px; background: rgba(0,0,0,0.5); border-radius: 10px; width: 100%; max-width: 600px; font-family: monospace; font-size: 0.75rem; border: 1px solid #333;">
                    <p style="color:var(--neon-blue); margin-bottom: 10px; font-weight: bold; text-transform: uppercase;">📡 Varredura de Hardware do Chrome:</p>
                    <ul style="list-style: none; padding: 0; color: #aaa;">
                        ${debugInfo || '<li>Nenhum hardware detectado pelo Kernel do Navegador.</li>'}
                    </ul>
                    <p style="color: grey; margin-top: 10px;">Dica: Se "Label" estiver OCULTO, clique em "Permitir" no ícone do cadeado lá em cima.</p>
                </div>
            </div>
        `;
    }
}

window.app = new JogoIA();

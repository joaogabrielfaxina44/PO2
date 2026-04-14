# Jokenpô com IA 🤖✊🖐✌️

Projeto desenvolvido como Prova Prática de Introdução à IA, utilizando a webcam e modelos de aprendizado de máquina treinados.

## 🚀 Tecnologias Utilizadas

- **Teachable Machine (Google):** Utilizado para o treinamento do modelo de visão computacional capaz de identificar 4 classes pela webcam: `Fundo`, `Pedra`, `Papel` e `Tesoura`.
- **Antigravity Framework:** Biblioteca ultra leve para renderização reativa baseada em estado (`state`). Foi construído um injetor especial de DOM para não sobrecarregar e nem recriar constantemente o buffer da webcam enquanto a interface gráfica é atualizada.
- **Glassmorphism CSS:** Design moderno focado em transparência, desfoque e retroiluminação condicional (a tela se banha em luz verde ao vencer e vermelha ao perder).

## 🧩 Arquitetura de Integração

1. O componente classe `JogoIA` é "montado" e carrega o modelo exportado do Teachable Machine.
2. É ativado um fluxo via `requestAnimationFrame` que submete a saída do `canvas` (webcam) em tempo real para a rede neural.
3. Aplicamos uma trava lógica (Debounce / Cooldown) de 3 segundos quando é detectado um gesto (confiança > 90%). Sem esse tratamento, a IA julgaria as mãos do usuário centenas de vezes tentando ganhar antes de registrar a intenção.
4. O resultado é calculado e o ciclo de vida reativo do Antigravity re-insere os rótulos de vitória e derrota usando CSS dinâmico.

## 🌐 Como Rodar

Basta servir os arquivos estáticos através do GitHub Pages, e autorizar a aba do navegador a usar a Câmera Web (requisito OBRIGATÓRIO de HTTPS, automaticamente atendido pelo GitHub Pages).

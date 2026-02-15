# Alive: Survival Chronicles

Jogo de sobrevivência 3D em navegador, construído com React + Three.js.
Você explora uma ilha, coleta recursos, caça, gerencia fome/vida e interage com ambientes (incluindo uma cabine com computador).

## Visão geral

- Renderização 3D com `@react-three/fiber` e `three`.
- HUD com vida, fome, inventário, minimapa e modos de câmera.
- Sistema de recursos: madeira, pedra, comida, crafting e construção.
- IA do Gemini para avatar e textos narrativos.
- Salvamento automático do perfil e progresso via `localStorage`.

## Tecnologias

- React 19
- TypeScript
- Vite
- Three.js + React Three Fiber + Drei
- Zustand
- Google GenAI SDK (`@google/genai`)

## Pré-requisitos

- Node.js 18+ (recomendado Node.js 20+)
- npm
- Chave de API do Gemini (Google AI Studio)

## Configuração do ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_GEMINI_API_KEY=sua_chave_aqui
```

Observação:
- Sem a chave, o projeto ainda abre, mas recursos de IA podem usar fallback (ex.: avatar padrão).

## Como rodar localmente

1. Instale dependências:

```bash
npm install
```

2. Execute em modo desenvolvimento:

```bash
npm run dev
```

3. Abra o endereço exibido no terminal (normalmente `http://localhost:5173`).

## Scripts disponíveis

- `npm run dev`: inicia ambiente de desenvolvimento.
- `npm run build`: gera build de produção em `dist/`.
- `npm run preview`: pré-visualiza o build localmente.

## Controles do jogo

- `W A S D` ou setas: movimentação.
- `Shift`/`Ctrl`: correr.
- `V`: alternar câmera (`1P`, `2P`, `3P`).
- `Space`: ataque corpo a corpo.
- `F`: disparo rápido no modo `1P`.
- Botão direito do mouse: mirar com arco (2P/3P).
- Botão esquerdo do mouse: atirar enquanto mira.
- `B`: equipar/guardar arco.
- `C`: comer comida do inventário.
- `G`: coletar carcaça/caça.
- Próximo da cadeira: `E` para sentar, `N` para recusar.
- Sentado: `X` para levantar.

## Salvamento e dados

- Perfil do jogador e estado da partida são salvos automaticamente no `localStorage`.
- Chaves utilizadas:
  - `alive_player_profile`
  - `alive_game_state`

## Deploy (GitHub Pages)

Links públicos para teste:

- Jogo: `https://romariosg1998.github.io/Alive/`
- Página da mesa/notebook: `https://romariosg1998.github.io/Alive/desk-browser.html`

Este repositório publica automaticamente no GitHub Pages via GitHub Actions
(`.github/workflows/deploy-pages.yml`) a cada `push` na branch `main`.

Passo único no GitHub (se ainda não estiver feito):
- Em `Settings > Pages`, selecione `Source: Deploy from a branch`.
- Branch: `gh-pages` e pasta: `/(root)`.

## Estrutura do projeto (resumo)

- `App.tsx`: loop principal do jogo e regras de gameplay.
- `components/`: interface, player, mundo e efeitos visuais.
- `services/`: áudio, IA (Gemini) e persistência.
- `store/`: estado global com Zustand.
- `utils/`: terreno, constantes e texturas.
- `dist/`: artefatos gerados no build de produção.

## Problemas comuns

- Pop-up bloqueado ao sentar na cadeira:
  - permita pop-ups para abrir a aba de computador (`desk-browser.html`).
- IA sem resposta:
  - verifique `VITE_GEMINI_API_KEY` no `.env.local`.
- Build falhando em ambiente sem internet:
  - o projeto usa Tailwind e Font Awesome por CDN no `index.html`.

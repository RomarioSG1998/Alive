---
description: Pipeline para criar e integrar novos assets visuais (sprites) no jogo.
---

Este workflow automatiza a limpeza de backgrounds para novos assets gerados.

### Passos:

1. **Gere a Imagem**: Use o prompt de IA para gerar o sprite (fundo branco).
2. **Salve o Arquivo**: Coloque-o em `client/public/assets/nome_do_asset.png`.
3. **Remova o Fundo**:
// turbo
```bash
python3 scripts/bin/remove_bg.py client/public/assets/nome_do_asset.png
```

4. **Integre no Phaser**:
Adicione ao `preload()` do `main.ts`:
```typescript
this.load.spritesheet('nome', 'assets/nome_do_asset.png', { frameWidth: W, frameHeight: H });
```

# GBD-BBS

Portfólio no estilo servidor BBS: tela verde de fósforo, scanlines e navegação por comandos de texto.

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera dist/ (estático, pronto para GitHub Pages/Netlify/Vercel)
```

## Editando o conteúdo

Tudo fica em [`src/filesystem.js`](src/filesystem.js): perfil, projetos e os arquivos `about.txt`, `skills.txt` e `contact.txt`.

Dentro dos textos:

- `[texto](https://url)` vira link externo
- `[texto](cmd:cd ~/projects)` vira um link que executa um comando

## Comandos

`help`, `menu`, `ls`, `cd`, `cat`, `open`, `pwd`, `whoami`, `history`, `date`, `echo`, `color <green|amber|white>`, `banner`, `clear`, `exit`.
Atalhos: `1`–`4` (menu), TAB autocompleta, ↑/↓ histórico, Ctrl+L limpa.

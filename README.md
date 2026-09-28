# GBD Terminal

Portfólio no estilo terminal retrô: tela verde de fósforo, scanlines e navegação por comandos de texto.

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # checa os tipos e gera dist/ (estático, pronto para GitHub Pages/Netlify/Vercel)
```

## Editando o conteúdo

O perfil e os arquivos `about.txt` e `contact.txt` ficam em [`src/filesystem.ts`](src/filesystem.ts). Durante o login são carregados do site:

- `~/projects` ← <https://gdias.dev.br/projects.json> (`[{ name, url }]`)
- `~/skills.txt` ← <https://gdias.dev.br/stack.json> (`[{ title, items }]`)

Dentro dos textos:

- `[texto](https://url)` vira link externo
- `[texto](cmd:cd ~/projects)` vira um link que executa um comando

## Comandos

`help`, `menu`, `ls`, `cd`, `cat`, `open`, `pwd`, `whoami`, `history`, `date`, `echo`, `color <green|amber|white>`, `banner`, `clear`, `exit`.
Atalhos: `1`–`4` (menu), TAB autocompleta, ↑/↓ histórico, Ctrl+L limpa.

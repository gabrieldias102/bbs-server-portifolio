// ============================================================
//  Conteúdo do portfólio — edite aqui.
//
//  Marcação suportada dentro de textos:
//    [texto](https://url)   → link externo (abre em nova aba)
//    [texto](cmd:comando)   → link clicável que executa um comando
// ============================================================

export const profile = {
  name: 'Gabriel Bastians Dias',
  handle: 'gabriel',
  role: 'Desenvolvedor de Software',
  location: 'Brasil',
}

// Cada projeto vira um diretório em ~/projects com um README.txt
export const projects = [
  {
    slug: 'bbs-portfolio',
    name: 'BBS Portfolio',
    description: 'Este portfólio: um servidor BBS falso no navegador',
    stack: ['Vite', 'Tailwind CSS', 'JavaScript'],
    year: 2026,
    url: 'https://example.com',
    repo: 'https://github.com/seu-usuario/bbs-server-portifolio',
  },
  {
    slug: 'projeto-exemplo',
    name: 'Projeto Exemplo',
    description: 'Descreva o projeto em uma linha',
    stack: ['React', 'Node.js'],
    year: 2025,
    url: 'https://example.com',
    repo: 'https://github.com/seu-usuario/projeto-exemplo',
  },
  {
    slug: 'outro-projeto',
    name: 'Outro Projeto',
    description: 'Mais um projeto para mostrar',
    stack: ['Python', 'FastAPI'],
    year: 2024,
    repo: 'https://github.com/seu-usuario/outro-projeto',
  },
]

function projectReadme(p) {
  const lines = [
    `== ${p.name.toUpperCase()} ==`,
    '',
    p.description,
    '',
    `ano ....... ${p.year}`,
    `stack ..... ${p.stack.join(', ')}`,
  ]
  if (p.url) lines.push(`demo ...... [${p.url}](${p.url})`)
  if (p.repo) lines.push(`código .... [${p.repo}](${p.repo})`)
  lines.push('', `Digite 'open ${p.slug}' ou clique nos links acima.`)
  return lines.join('\n')
}

const file = (content) => ({ type: 'file', content })
const dir = (children, project) => ({ type: 'dir', children, project })

export const tree = dir({
  'about.txt': file(`== SOBRE MIM ==

Olá! Eu sou ${profile.name}, ${profile.role.toLowerCase()} no ${profile.location}.

Escreva aqui um parágrafo curto sobre você: o que você faz,
o que gosta de construir e o que está buscando agora.

Veja meus trabalhos em [~/projects](cmd:cd ~/projects).`),

  'skills.txt': file(`== HABILIDADES ==

linguagens .... JavaScript, TypeScript, Python
frontend ...... React, Vite, Tailwind CSS
backend ....... Node.js, FastAPI
ferramentas ... Git, Docker, Linux`),

  'contact.txt': file(`== CONTATO ==

e-mail ..... [seu-email@exemplo.com](mailto:seu-email@exemplo.com)
github ..... [github.com/seu-usuario](https://github.com/seu-usuario)
linkedin ... [linkedin.com/in/seu-usuario](https://www.linkedin.com/in/seu-usuario)`),

  projects: dir(
    Object.fromEntries(projects.map((p) => [p.slug, dir({ 'README.txt': file(projectReadme(p)) }, p)])),
  ),
})

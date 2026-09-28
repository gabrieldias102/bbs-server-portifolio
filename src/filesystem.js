export const profile = {
  name: "Gabriel Bastians Dias",
  handle: "gabriel",
  role: "Desenvolvedor de Software",
  location: "Brasil",
};

// Projetos e tecnologias vêm do site:
//   projects.json → [{ name, image, url }]  (um diretório por projeto em ~/projects)
//   stack.json    → [{ title, items }]      (o conteúdo de ~/skills.txt)
const PROJECTS_URL = "https://gdias.dev.br/projects.json";
const STACK_URL = "https://gdias.dev.br/stack.json";

const slugify = (name) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function projectReadme(p) {
  const lines = [`== ${p.name.toUpperCase()} ==`, ""];
  if (p.url) lines.push(`acessar ...... [${p.url}](${p.url})`);
  lines.push("", `Digite 'open ${p.slug}' ou clique nos links acima.`);
  return lines.join("\n");
}

const SKILLS_WIDTH = 56;

// Uma seção por categoria: título com contagem e itens quebrados em linhas
function skillsText(stack) {
  const sections = stack.map(({ title: category, items }) => {
    const title = `× ${category.toUpperCase()} `;
    const count = String(items.length).padStart(2, "0");
    const header = `${title}${".".repeat(SKILLS_WIDTH - title.length - count.length - 1)} ${count}`;

    const lines = [];
    let line = "";
    for (const item of items) {
      const next = line ? `${line} · ${item}` : item;
      if (line && next.length > SKILLS_WIDTH - 2) {
        lines.push(line);
        line = item;
      } else line = next;
    }
    lines.push(line);
    return [header, ...lines.map((l) => `  ${l}`)].join("\n");
  });
  return ["== TECNOLOGIAS & FERRAMENTAS ==", ...sections].join("\n\n");
}

const file = (content) => ({ type: "file", content });
const dir = (children, project) => ({ type: "dir", children, project });

export const tree = dir({
  "about.txt": file(`== SOBRE MIM ==

Olá! Eu sou ${profile.name}, ${profile.role.toLowerCase()} no ${profile.location}.

Desenvolvedor full stack especializado em arquiteturas React, Node.js, 
Vue, PHP e Python — transformo problemas complexos em lógica elegante.

Veja meus trabalhos em [~/projects](cmd:cd ~/projects).`),

  "skills.txt": file("(lista de tecnologias indisponível)"),

  "contact.txt": file(`== CONTATO ==

e-mail ..... [contatogbd@gmail.com](mailto:contatogbd@gmail.com)
github ..... [github.com/gabrieldias102](https://github.com/gabrieldias102)
linkedin ... [linkedin.com/in/gabrieldias102](https://www.linkedin.com/in/gabrieldias102)`),

  projects: dir({}),
});

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function loadProjects() {
  const projects = (await fetchJson(PROJECTS_URL)).map((p) => ({
    ...p,
    slug: slugify(p.name),
    // imagens vêm com caminho relativo ao site
    image: p.image && new URL(p.image, PROJECTS_URL).href,
  }));
  tree.children.projects.children = Object.fromEntries(
    projects.map((p) => [
      p.slug,
      dir({ "README.txt": file(projectReadme(p)) }, p),
    ]),
  );
}

export async function loadStack() {
  tree.children["skills.txt"].content = skillsText(await fetchJson(STACK_URL));
}

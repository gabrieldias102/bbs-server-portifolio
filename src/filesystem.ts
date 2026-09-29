export const profile = {
  name: "Gabriel Bastians Dias",
  handle: "gabriel",
  role: "Desenvolvedor Full Stack",
  location: "Brasil",
};

// ------------------------------------------------------------
//  Tipos
// ------------------------------------------------------------

// Formato de cada item em projects.json
interface ProjectJson {
  name: string;
  url?: string;
}

export interface Project extends ProjectJson {
  slug: string;
}

// Formato de cada item em stack.json
interface StackCategory {
  title: string;
  items: string[];
}

export interface FileNode {
  type: "file";
  content: string;
}

export interface DirNode {
  type: "dir";
  children: Record<string, FsNode>;
  project?: Project;
}

export type FsNode = FileNode | DirNode;

// ------------------------------------------------------------
//  Conteúdo
// ------------------------------------------------------------

// Projetos e tecnologias vêm do site:
//   projects.json → [{ name, url }]  (um diretório por projeto em ~/projects)
//   stack.json    → [{ title, items }]      (o conteúdo de ~/skills.txt)
const PROJECTS_URL = "https://gdias.dev.br/projects.json";
const STACK_URL = "https://gdias.dev.br/stack.json";

const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function projectReadme(p: Project) {
  const lines = [`== ${p.name.toUpperCase()} ==`, ""];
  if (p.url) lines.push(`acessar ...... [${p.url}](${p.url})`);
  lines.push("", `Digite 'open ${p.slug}' ou clique nos links acima.`);
  return lines.join("\n");
}

const SKILLS_WIDTH = 56;

// Uma seção por categoria: título com contagem e itens quebrados em linhas
function skillsText(stack: StackCategory[]) {
  const sections = stack.map(({ title: category, items }) => {
    const title = `× ${category.toUpperCase()} `;
    const count = String(items.length).padStart(2, "0");
    const header = `${title}${".".repeat(SKILLS_WIDTH - title.length - count.length - 1)} ${count}`;

    const lines: string[] = [];
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

const file = (content: string): FileNode => ({ type: "file", content });
const dir = (children: Record<string, FsNode>, project?: Project): DirNode => ({
  type: "dir",
  children,
  project,
});

// Preenchidos por loadProjects() e loadStack()
const projectsDir = dir({});
const skillsFile = file("(lista de tecnologias indisponível)");

export const tree = dir({
  "about.txt": file(`== SOBRE MIM ==

Olá! Eu sou ${profile.name}, ${profile.role.toLowerCase()} no ${profile.location}.

Desenvolvedor full stack especializado em arquiteturas React, Node.js,
Vue, PHP e Python — transformo problemas complexos em lógica elegante.

Veja meus trabalhos em [~/projects](cmd:cd ~/projects).`),

  "skills.txt": skillsFile,

  "contact.txt": file(`== CONTATO ==

e-mail ..... [contatogbd@gmail.com](mailto:contatogbd@gmail.com)
github ..... [github.com/gabrieldias102](https://github.com/gabrieldias102)
linkedin ... [linkedin.com/in/gabrieldias102](https://www.linkedin.com/in/gabrieldias102)`),

  projects: projectsDir,
});

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function loadProjects() {
  const projects = (await fetchJson<ProjectJson[]>(PROJECTS_URL)).map(
    (p): Project => ({
      ...p,
      slug: slugify(p.name),
    }),
  );
  projectsDir.children = Object.fromEntries(
    projects.map((p) => [
      p.slug,
      dir({ "README.txt": file(projectReadme(p)) }, p),
    ]),
  );
}

export async function loadStack() {
  skillsFile.content = skillsText(await fetchJson<StackCategory[]>(STACK_URL));
}

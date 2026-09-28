import "./style.css";
import { loadProjects, loadStack, profile, tree } from "./filesystem.js";

const $ = (id) => document.getElementById(id);
const screen = $("screen");
const output = $("output");
const promptLine = $("prompt-line");
const promptLabel = $("prompt-label");
const input = $("input");
const clock = $("clock");

const HOST = "gbd";
const USER = "guest";

const state = {
  cwd: [],
  history: [],
  historyIndex: 0,
  booting: false,
  skip: false,
  loggedIn: false,
  loginAt: Date.now(),
};

// ------------------------------------------------------------
//  Sistema de arquivos
// ------------------------------------------------------------

const isDir = (node) => node?.type === "dir";

function resolve(path = ".") {
  const segs =
    path.startsWith("/") || path.startsWith("~") ? [] : [...state.cwd];
  for (const part of path.replace(/^~/, "").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") segs.pop();
    else segs.push(part);
  }
  let node = tree;
  for (const seg of segs) {
    if (!isDir(node) || !Object.hasOwn(node.children, seg)) return null;
    node = node.children[seg];
  }
  return { node, segs };
}

const displayPath = (segs) => "~" + (segs.length ? "/" + segs.join("/") : "");

// ------------------------------------------------------------
//  Saída
// ------------------------------------------------------------

const sleep = (ms) =>
  state.skip ? Promise.resolve() : new Promise((r) => setTimeout(r, ms));

function el(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const scrollDown = () => (screen.scrollTop = screen.scrollHeight);

const LINK_CLASS =
  "cursor-pointer text-phosphor-bright underline decoration-dotted underline-offset-4 hover:bg-phosphor hover:text-crt hover:no-underline focus-visible:bg-phosphor focus-visible:text-crt focus-visible:outline-none";

function makeLink(label, target) {
  if (target.startsWith("cmd:")) {
    const button = el("button", LINK_CLASS, label);
    button.type = "button";
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.loggedIn && !state.booting) run(target.slice(4));
    });
    return button;
  }
  const a = el("a", LINK_CLASS, label);
  a.href = target;
  if (!target.startsWith("mailto:")) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
  return a;
}

// Converte "[texto](alvo)" em links; o resto vira texto puro.
function renderInline(text) {
  const frag = document.createDocumentFragment();
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match;
  while ((match = re.exec(text))) {
    if (match.index > last) frag.append(text.slice(last, match.index));
    frag.append(makeLink(match[1], match[2]));
    last = re.lastIndex;
  }
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

function print(text = "", className = "") {
  for (const line of String(text).split("\n")) {
    const div = el("div", `whitespace-pre-wrap break-words ${className}`);
    div.append(line ? renderInline(line) : " ");
    output.append(div);
  }
  scrollDown();
}

const error = (text) => print(text, "text-alert");

async function typeLine(text, className = "", delay = 28) {
  const div = el("div", `whitespace-pre-wrap ${className}`);
  output.append(div);
  for (const char of text) {
    div.textContent += char;
    scrollDown();
    await sleep(delay);
  }
}

const promptText = () => `${USER}@${HOST}:${displayPath(state.cwd)}$ `;

function echoCommand(raw) {
  const div = el("div", "whitespace-pre-wrap break-words");
  div.append(el("span", "text-phosphor-bright", promptText()), raw);
  output.append(div);
}

const BANNER = [
  " ██████╗ ██████╗ ██████╗",
  "██╔════╝ ██╔══██╗██╔══██╗",
  "██║  ███╗██████╔╝██║  ██║",
  "██║   ██║██╔══██╗██║  ██║",
  "╚██████╔╝██████╔╝██████╔╝",
  " ╚═════╝ ╚═════╝ ╚═════╝",
].join("\n");

function printBanner() {
  output.append(
    el("pre", "banner my-3 text-[min(2.9vw,1.05rem)] text-phosphor", BANNER),
  );
  scrollDown();
}

const MENU = [
  ["1", "sobre mim", "cat ~/about.txt"],
  ["2", "projetos", "cd ~/projects"],
  ["3", "habilidades", "cat ~/skills.txt"],
  ["4", "contato", "cat ~/contact.txt"],
  ["?", "ajuda", "help"],
];

function printMenu() {
  print("\n -=[ MENU PRINCIPAL ]=-\n");
  for (const [key, label, cmd] of MENU) {
    print(
      `  [${key}] [${label}](cmd:${cmd}) ${".".repeat(16 - label.length)} ${cmd.replace("~/", "")}`,
    );
  }
  print();
}

// ------------------------------------------------------------
//  Comandos
// ------------------------------------------------------------

function listDir(node, segs) {
  const entries = Object.entries(node.children);
  if (!entries.length) return print("(vazio)", "text-phosphor-dim");

  const labelOf = ([name, child]) => (isDir(child) ? `${name}/` : name);
  const width = Math.max(...entries.map((e) => labelOf(e).length));
  const indent = " ".repeat(12 + width + 2);

  for (const entry of entries) {
    const [name, child] = entry;
    const label = labelOf(entry);
    const path = displayPath([...segs, name]);
    const perms = isDir(child) ? "drwxr-xr-x" : "-rw-r--r--";
    const action = isDir(child) ? `cd ${path}` : `cat ${path}`;
    const pad = " ".repeat(width - label.length);
    const project = child.project;

    print(
      `${perms}  [${label}](cmd:${action})${pad}  ${project ? project.name : ""}`,
    );
    if (project) {
      const links = [
        project.url && `[acessar ↗](${project.url})`,
        `[info](cmd:cat ${path}/README.txt)`,
      ].filter(Boolean);
      print(`${indent}${links.join("  ")}`, "text-phosphor-dim");
    }
  }
}

function findProject(arg) {
  const target = arg
    ? (resolve(arg) ?? resolve(`~/projects/${arg}`))
    : resolve(".");
  return target?.node.project;
}

const commands = {
  help: {
    desc: "lista os comandos disponíveis",
    run() {
      print("Comandos disponíveis:\n");
      const entries = Object.entries(commands);
      const width = Math.max(
        ...entries.map(([name, cmd]) => (cmd.usage ?? name).length),
      );
      for (const [name, cmd] of entries) {
        const usage = cmd.usage ?? name;
        const label = usage.includes("<") ? usage : `[${usage}](cmd:${usage})`;
        print(`  ${label}${" ".repeat(width - usage.length)}  ${cmd.desc}`);
      }
      print(
        "\nDica: TAB completa comandos e caminhos, ↑/↓ navega no histórico.",
        "text-phosphor-dim",
      );
    },
  },
  menu: {
    desc: "mostra o menu principal",
    run: printMenu,
  },
  ls: {
    usage: "ls [dir]",
    desc: "lista o conteúdo de um diretório",
    run(args) {
      const path = args.find((a) => !a.startsWith("-")) ?? ".";
      const target = resolve(path);
      if (!target) return error(`ls: ${path}: diretório não encontrado`);
      if (!isDir(target.node)) return print(path);
      listDir(target.node, target.segs);
    },
  },
  cd: {
    usage: "cd <dir>",
    desc: "entra em um diretório e lista o conteúdo",
    run([path = "~"]) {
      const target = resolve(path);
      if (!target) return error(`cd: ${path}: diretório não encontrado`);
      if (!isDir(target.node)) return error(`cd: ${path}: não é um diretório`);
      state.cwd = target.segs;
      if (target.node.project)
        print(target.node.children["README.txt"].content);
      else listDir(target.node, target.segs);
    },
  },
  cat: {
    usage: "cat <arquivo>",
    desc: "mostra o conteúdo de um arquivo",
    run([path]) {
      if (!path) return error("cat: informe um arquivo. Ex: cat about.txt");
      const target = resolve(path);
      if (!target) return error(`cat: ${path}: arquivo não encontrado`);
      if (isDir(target.node)) return error(`cat: ${path}: é um diretório`);
      print(target.node.content);
    },
  },
  open: {
    usage: "open <projeto>",
    desc: "abre o site do projeto em nova aba",
    run([arg]) {
      const project = findProject(arg);
      if (!project) return error(`open: ${arg ?? "."}: projeto não encontrado`);
      const url = project.url;
      print(`Abrindo ${url} ...`, "text-phosphor-dim");
      window.open(url, "_blank", "noopener");
    },
  },
  pwd: {
    desc: "mostra o diretório atual",
    run: () => print(displayPath(state.cwd)),
  },
  whoami: {
    desc: "mostra seu usuário e o dono do terminal",
    run: () =>
      print(`${USER} (visitante)\ndono: ${profile.name} — ${profile.role}`),
  },
  history: {
    desc: "mostra o histórico de comandos",
    run: () =>
      state.history.forEach((cmd, i) =>
        print(`${String(i + 1).padStart(4)}  ${cmd}`),
      ),
  },
  date: {
    desc: "mostra data e hora",
    run: () => print(new Date().toLocaleString("pt-BR")),
  },
  echo: {
    usage: "echo <texto>",
    desc: "repete o texto",
    run: (args) => print(args.join(" ")),
  },
  color: {
    usage: "color <green|amber|white>",
    desc: "troca a cor do fósforo",
    run([theme]) {
      const themes = ["green", "amber", "white"];
      if (!themes.includes(theme))
        return error(`color: use ${themes.join(", ")}`);
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("term-theme", theme);
      } catch {}
    },
  },
  banner: {
    desc: "mostra o banner de boas-vindas",
    run: printBanner,
  },
  clear: {
    desc: "limpa a tela",
    run: () => output.replaceChildren(),
  },
  exit: {
    desc: "encerra a sessão",
    async run() {
      print("logout");
      await sleep(400);
      print("\nSessão encerrada.", "text-phosphor-bright");
      state.loggedIn = false;
      promptLine.hidden = true;
      print(
        "\n(pressione qualquer tecla para entrar de novo)",
        "text-phosphor-dim cursor-blink",
      );
    },
  },
};

const aliases = {
  dir: "ls",
  ll: "ls",
  type: "cat",
  more: "cat",
  less: "cat",
  cls: "clear",
  "?": "help",
  logout: "exit",
  quit: "exit",
  1: "cat ~/about.txt",
  2: "cd ~/projects",
  3: "cat ~/skills.txt",
  4: "cat ~/contact.txt",
};

const easterEggs = {
  sudo: () =>
    error(
      `${USER} não está no arquivo sudoers. Este incidente será reportado.`,
    ),
  rm: () => error("rm: permissão negada. Boa tentativa :)"),
  vim: () =>
    print("Você entrou no vim. Boa sorte para sair. (brincadeira, não entrou)"),
};

async function run(raw) {
  echoCommand(raw);
  const line = raw.trim();
  if (line) {
    state.history.push(line);
    state.historyIndex = state.history.length;
    await dispatch(line);
  }
  updatePrompt();
  scrollDown();
}

async function dispatch(line) {
  let [name, ...args] = line.split(/\s+/);
  name = name.toLowerCase();
  if (Object.hasOwn(aliases, name)) {
    [name, ...args] = [...aliases[name].split(" "), ...args];
  }
  if (Object.hasOwn(commands, name)) return commands[name].run(args);
  if (Object.hasOwn(easterEggs, name)) return easterEggs[name](args);
  error(`${name}: comando não encontrado. Digite 'help' para ver os comandos.`);
}

// ------------------------------------------------------------
//  Autocompletar (TAB)
// ------------------------------------------------------------

function commonPrefix(words) {
  let prefix = words[0];
  for (const word of words)
    while (!word.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}

function complete() {
  const tokens = input.value.split(" ");
  const current = tokens.at(-1);
  let base = "";
  let fragment = current;
  let candidates;

  if (tokens.length === 1) {
    candidates = Object.keys(commands).filter((c) => c.startsWith(current));
  } else {
    const slash = current.lastIndexOf("/");
    base = current.slice(0, slash + 1);
    fragment = current.slice(slash + 1);
    const target = resolve(base || ".");
    if (!target || !isDir(target.node)) return;
    candidates = Object.entries(target.node.children)
      .filter(([name]) => name.startsWith(fragment))
      .map(([name, child]) => (isDir(child) ? `${name}/` : name));
  }

  if (!candidates.length) return;
  if (candidates.length === 1) {
    const done = candidates[0];
    tokens[tokens.length - 1] = base + done + (done.endsWith("/") ? "" : " ");
    input.value = tokens.join(" ");
    return;
  }
  const common = commonPrefix(candidates);
  if (common.length > fragment.length) {
    tokens[tokens.length - 1] = base + common;
    input.value = tokens.join(" ");
  } else {
    echoCommand(input.value);
    print(candidates.join("   "));
  }
}

// ------------------------------------------------------------
//  Login / boot
// ------------------------------------------------------------

// Resolve com o erro (ou null) para não gerar rejeição sem tratamento
// enquanto a animação de login ainda não chegou no await.
const remote = [
  { path: "~/projects", load: loadProjects },
  { path: "~/skills.txt", load: loadStack },
];
const fetchRemote = (source) =>
  source.load().then(
    () => null,
    (err) => err,
  );
const loading = new Map(remote.map((source) => [source, fetchRemote(source)]));

function updatePrompt() {
  promptLabel.textContent = promptText();
}

async function login() {
  state.booting = true;
  state.skip = false;
  state.cwd = [];
  promptLine.hidden = true;
  output.replaceChildren();

  print(`GBD/OS 1.0 ${HOST} tty1`, "text-phosphor-dim");
  await sleep(300);
  print();
  await typeLine(`${HOST} login: ${USER}`);
  await sleep(250);
  print("Last login: nunca", "text-phosphor-dim");
  await sleep(300);

  for (const source of remote) {
    if (!loading.has(source)) loading.set(source, fetchRemote(source));
    const loadError = await loading.get(source);
    if (loadError) {
      loading.delete(source); // tenta de novo no próximo login
      error(
        `aviso: não foi possível carregar ${source.path} (${loadError.message})`,
      );
    }
  }

  printBanner();
  print(`Bem-vindo(a) ao terminal de ${profile.name}.
Sessão iniciada como ${USER}. Explore o portfólio pelos comandos abaixo.`);
  printMenu();
  print(
    "Digite um comando (ex: 'cd projects') ou clique nas opções acima.",
    "text-phosphor-dim",
  );

  state.booting = false;
  state.loggedIn = true;
  state.loginAt = Date.now();
  updatePrompt();
  promptLine.hidden = false;
  input.value = "";
  input.focus();
  scrollDown();
}

// ------------------------------------------------------------
//  Eventos
// ------------------------------------------------------------

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    const value = input.value;
    input.value = "";
    run(value);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (state.historyIndex > 0)
      input.value = state.history[--state.historyIndex];
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    state.historyIndex = Math.min(state.historyIndex + 1, state.history.length);
    input.value = state.history[state.historyIndex] ?? "";
  } else if (e.key === "Tab") {
    e.preventDefault();
    complete();
  } else if (e.key === "l" && e.ctrlKey) {
    e.preventDefault();
    output.replaceChildren();
  } else if (
    e.key === "c" &&
    e.ctrlKey &&
    input.selectionStart === input.selectionEnd
  ) {
    // Ctrl+C sem seleção = interromper (como num terminal de verdade)
    echoCommand(input.value + "^C");
    input.value = "";
    scrollDown();
  }
});

function wake() {
  if (state.booting) state.skip = true;
  else if (!state.loggedIn) login();
}

document.addEventListener("keydown", (e) => {
  if (state.booting || !state.loggedIn) {
    e.preventDefault();
    wake();
  }
});

screen.addEventListener("click", () => {
  if (state.booting || !state.loggedIn) return wake();
  // não rouba o foco enquanto o usuário seleciona texto
  if (!window.getSelection()?.toString()) input.focus();
});

setInterval(() => {
  const s = Math.floor((Date.now() - state.loginAt) / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  clock.textContent = state.loggedIn ? `${hh}:${mm}:${ss}` : "--:--:--";
}, 1000);

try {
  const saved = localStorage.getItem("term-theme");
  if (saved) document.documentElement.dataset.theme = saved;
} catch {}

login();

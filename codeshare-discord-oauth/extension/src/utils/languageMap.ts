/**
 * Map a VS Code languageId to the hint Discord understands after the opening
 * code fence (which drives syntax highlighting). VS Code ids mostly match
 * Discord/highlight.js aliases; the overrides below cover the exceptions.
 */
const OVERRIDES: Record<string, string> = {
  jsx: 'jsx',
  'javascriptreact': 'jsx',
  'typescriptreact': 'tsx',
  csharp: 'cs',
  'objective-c': 'objectivec',
  'objective-cpp': 'cpp',
  shellscript: 'bash',
  powershell: 'powershell',
  bat: 'batch',
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  'cuda-cpp': 'cpp',
  vue: 'vue',
  svelte: 'svelte',
  'jsonc': 'json',
  'plaintext': '',
  fsharp: 'fsharp',
  'git-commit': '',
  'git-rebase': '',
  ignore: '',
  properties: 'ini',
  razor: 'cshtml',
  scss: 'scss',
  less: 'less',
  yaml: 'yaml',
  toml: 'toml',
};

export function toFenceHint(languageId: string): string {
  if (!languageId) {
    return '';
  }
  if (languageId in OVERRIDES) {
    return OVERRIDES[languageId];
  }
  // Default: the languageId is usually a valid hint as-is.
  return languageId.toLowerCase();
}

/** Best-effort guess of a languageId from a file extension. */
export function guessLanguageFromExtension(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  if (!match) {
    return 'plaintext';
  }
  const ext = match[1].toLowerCase();
  const byExt: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    m: 'objective-c',
    sh: 'shellscript',
    bash: 'shellscript',
    ps1: 'powershell',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    sql: 'sql',
    xml: 'xml',
    dart: 'dart',
    lua: 'lua',
    r: 'r',
    scala: 'scala',
    pl: 'perl',
  };
  return byExt[ext] ?? 'plaintext';
}

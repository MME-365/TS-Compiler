import { ProjectFile, CompilerConfig } from '../types';

/**
 * Resolves a module specifier against a current file path in the virtual file system.
 * e.g., currentFile = "src/app.ts", specifier = "./utils/calc" -> "src/utils/calc"
 */
export function resolveVirtualModulePath(
  currentFilePath: string,
  importSpecifier: string,
  availableFilePaths: string[]
): string | null {
  // If it's not a relative path and not starting with ./ or ../, check root
  let targetPath = '';

  if (importSpecifier.startsWith('.')) {
    const currentDir = getDirectory(currentFilePath);
    targetPath = normalizePath(currentDir ? `${currentDir}/${importSpecifier}` : importSpecifier);
  } else {
    // Might be absolute or path-mapped alias
    targetPath = normalizePath(importSpecifier);
  }

  // Candidates to test
  const candidates = [
    targetPath,
    `${targetPath}.ts`,
    `${targetPath}.tsx`,
    `${targetPath}.d.ts`,
    `${targetPath}.js`,
    `${targetPath}.jsx`,
    `${targetPath}/index.ts`,
    `${targetPath}/index.tsx`,
    `${targetPath}/index.js`,
  ];

  for (const candidate of candidates) {
    const matched = availableFilePaths.find(
      (p) => normalizePath(p).toLowerCase() === candidate.toLowerCase()
    );
    if (matched) return matched;
  }

  return null;
}

export function getDirectory(path: string): string {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/');
}

export function normalizePath(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  const stack: string[] = [];

  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (stack.length > 0) stack.pop();
    } else {
      stack.push(part);
    }
  }

  return stack.join('/');
}

/**
 * Generates or parses tsconfig.json to stay synchronized with UI compiler config
 */
export function generateTsConfigContent(config: CompilerConfig): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: config.target,
        module: config.module,
        jsx: config.jsx === 'ReactJSX' ? 'react-jsx' : config.jsx.toLowerCase(),
        strict: config.strict,
        noImplicitAny: config.noImplicitAny,
        removeComments: config.removeComments,
        sourceMap: config.inlineSourceMap,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        moduleResolution: 'node',
      },
      include: ['**/*'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2
  );
}

/**
 * Parses user-edited tsconfig.json and updates compiler config
 */
export function parseTsConfigContent(
  content: string,
  currentConfig: CompilerConfig
): Partial<CompilerConfig> {
  try {
    const parsed = JSON.parse(content);
    const opts = parsed.compilerOptions || {};
    const updates: Partial<CompilerConfig> = {};

    if (opts.target) updates.target = opts.target;
    if (opts.module) updates.module = opts.module;
    if (opts.strict !== undefined) updates.strict = Boolean(opts.strict);
    if (opts.removeComments !== undefined) updates.removeComments = Boolean(opts.removeComments);

    return updates;
  } catch {
    return {};
  }
}

/**
 * Builds dependency graph of the project (file -> imported file paths)
 */
export function buildDependencyGraph(
  files: ProjectFile[]
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const filePaths = files.map((f) => f.name);

  // Regex to extract static imports/exports
  const importRegex = /(?:import|export)\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;

  for (const file of files) {
    const dependencies = new Set<string>();
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const specifier = match[1];
      const resolved = resolveVirtualModulePath(file.name, specifier, filePaths);
      if (resolved) {
        dependencies.add(resolved);
      }
    }
    graph.set(file.name, dependencies);
  }

  return graph;
}

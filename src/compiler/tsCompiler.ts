import { transform } from 'sucrase';
import { CompilerConfig, CompilationResult, CompilerDiagnostic, ProjectFile } from '../types';

export const DEFAULT_COMPILER_CONFIG: CompilerConfig = {
  target: 'ES2022',
  module: 'ESNext',
  jsx: 'ReactJSX',
  removeComments: false,
  inlineSourceMap: true,
  strict: true,
  noImplicitAny: true,
  autoCompile: true,
  autoRun: false,
};

/**
 * Strips comments from JavaScript/TypeScript code
 */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^\\:])\/\/.*$/gm, '$1');
}

/**
 * Transpiles TypeScript source code to JavaScript in the browser.
 */
export function compileTypeScript(
  code: string,
  fileName: string = 'index.ts',
  config: CompilerConfig = DEFAULT_COMPILER_CONFIG
): CompilationResult {
  const startTime = performance.now();
  const diagnostics: CompilerDiagnostic[] = [];

  const isJsx = fileName.endsWith('.tsx') || fileName.endsWith('.jsx');
  const transforms: ('typescript' | 'jsx' | 'imports')[] = ['typescript'];

  if (isJsx || config.jsx !== 'Preserve') {
    transforms.push('jsx');
  }

  if (config.module === 'CommonJS') {
    transforms.push('imports');
  }

  try {
    const processedCode = config.removeComments ? stripComments(code) : code;

    const result = transform(processedCode, {
      transforms,
      filePath: fileName,
      jsxRuntime: config.jsx === 'ReactJSX' ? 'automatic' : 'classic',
      sourceMapOptions: config.inlineSourceMap
        ? { compiledFilename: fileName.replace(/\.(ts|tsx)$/, '.js') }
        : undefined,
    });

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      success: true,
      outputText: result.code,
      sourceMapText: result.sourceMap ? JSON.stringify(result.sourceMap) : undefined,
      diagnostics: [],
      durationMs,
      compiledAt: new Date(),
    };
  } catch (err: any) {
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
    const line = err?.loc?.line || 1;
    const column = err?.loc?.column || 1;
    const rawMessage = err?.message || 'Syntax error in TypeScript file';
    // Clean up error message if needed
    const cleanMessage = rawMessage.replace(/\(\d+:\d+\)$/, '').trim();

    diagnostics.push({
      line,
      column,
      message: cleanMessage,
      code: 1001,
      category: 'error',
    });

    return {
      success: false,
      outputText: '',
      diagnostics,
      durationMs,
      compiledAt: new Date(),
    };
  }
}

/**
 * Compiles a multi-file project for in-browser execution with CommonJS module transforms.
 */
export function compileProjectForExecution(
  files: ProjectFile[],
  entryFileId: string,
  config: CompilerConfig = DEFAULT_COMPILER_CONFIG
): {
  success: boolean;
  compiledModules: Record<string, string>;
  entryModuleKey: string;
  diagnostics: Record<string, CompilerDiagnostic[]>;
} {
  const compiledModules: Record<string, string> = {};
  const diagnostics: Record<string, CompilerDiagnostic[]> = {};
  let overallSuccess = true;
  let entryKey = '';

  for (const file of files) {
    const key = normalizeModuleName(file.name);
    if (file.id === entryFileId || (!entryKey && file.isEntry)) {
      entryKey = key;
    }

    const fileDiags: CompilerDiagnostic[] = [];
    const isJsx = file.name.endsWith('.tsx') || file.name.endsWith('.jsx');
    const transforms: ('typescript' | 'jsx' | 'imports')[] = ['typescript', 'imports'];
    if (isJsx || config.jsx !== 'Preserve') {
      transforms.push('jsx');
    }

    try {
      const res = transform(file.content, {
        transforms,
        filePath: file.name,
        jsxRuntime: config.jsx === 'ReactJSX' ? 'automatic' : 'classic',
      });

      compiledModules[key] = res.code;
      diagnostics[file.id] = fileDiags;
    } catch (err: any) {
      const line = err?.loc?.line || 1;
      const column = err?.loc?.column || 1;
      const rawMessage = err?.message || 'Error compiling file';
      const cleanMessage = rawMessage.replace(/\(\d+:\d+\)$/, '').trim();

      fileDiags.push({
        line,
        column,
        message: cleanMessage,
        code: 1001,
        category: 'error',
      });
      diagnostics[file.id] = fileDiags;
      overallSuccess = false;
    }
  }

  if (!entryKey && files.length > 0) {
    entryKey = normalizeModuleName(files[0].name);
  }

  return {
    success: overallSuccess,
    compiledModules,
    entryModuleKey: entryKey,
    diagnostics,
  };
}

export function normalizeModuleName(name: string): string {
  let clean = name.trim().replace(/^\.\//, '');
  clean = clean.replace(/\.(ts|tsx|js|jsx)$/, '');
  return clean;
}

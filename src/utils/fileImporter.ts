import { ProjectFile } from '../types';

/**
 * Traverses HTML5 DataTransfer items to read entire folders recursively
 */
export async function extractFilesFromDataTransfer(
  items: DataTransferItemList | FileList
): Promise<ProjectFile[]> {
  const result: ProjectFile[] = [];

  // Check if WebKit Directory Entry API is supported
  const entries: any[] = [];
  if ('webkitGetAsEntry' in DataTransferItem.prototype) {
    for (let i = 0; i < items.length; i++) {
      const item = (items as DataTransferItemList)[i];
      if (item.kind === 'file') {
        const entry = (item as any).webkitGetAsEntry?.();
        if (entry) {
          entries.push(entry);
        }
      }
    }
  }

  if (entries.length > 0) {
    for (const entry of entries) {
      await traverseFileSystemEntry(entry, '', result);
    }
  } else {
    // Fallback for regular FileList
    const fileList = items as FileList;
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      try {
        const content = await file.text();
        const path = (file as any).webkitRelativePath || file.name;
        result.push({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: cleanPath(path),
          content,
          isEntry: path.endsWith('index.ts') || path.endsWith('main.ts'),
        });
      } catch (err) {
        console.warn('Could not read file:', file.name, err);
      }
    }
  }

  return result;
}

async function traverseFileSystemEntry(
  entry: any,
  currentPath: string,
  output: ProjectFile[]
): Promise<void> {
  if (entry.isFile) {
    const file = await getFileFromEntry(entry);
    if (file) {
      // Ignore git and node_modules folders
      const fullPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      if (
        fullPath.includes('.git/') ||
        fullPath.includes('node_modules/') ||
        fullPath.startsWith('.DS_Store')
      ) {
        return;
      }

      // Check for code/text extensions
      if (
        /\.(ts|tsx|js|jsx|json|d\.ts|txt|md|css|html)$/i.test(entry.name) ||
        entry.name === 'tsconfig.json' ||
        entry.name === 'package.json'
      ) {
        const content = await file.text();
        output.push({
          id: 'file_' + Math.random().toString(36).substring(2, 9),
          name: cleanPath(fullPath),
          content,
          isEntry: fullPath === 'index.ts' || fullPath === 'src/index.ts' || fullPath === 'main.ts',
        });
      }
    }
  } else if (entry.isDirectory) {
    // Skip hidden or massive system folders
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next') {
      return;
    }

    const dirReader = entry.createReader();
    const subEntries = await readAllEntriesFromReader(dirReader);
    const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;

    for (const sub of subEntries) {
      await traverseFileSystemEntry(sub, nextPath, output);
    }
  }
}

function getFileFromEntry(fileEntry: any): Promise<File | null> {
  return new Promise((resolve) => {
    fileEntry.file(
      (file: File) => resolve(file),
      () => resolve(null)
    );
  });
}

function readAllEntriesFromReader(dirReader: any): Promise<any[]> {
  return new Promise((resolve) => {
    const entries: any[] = [];
    function readBatch() {
      dirReader.readEntries((batch: any[]) => {
        if (!batch || batch.length === 0) {
          resolve(entries);
        } else {
          entries.push(...batch);
          readBatch();
        }
      }, () => resolve(entries));
    }
    readBatch();
  });
}

function cleanPath(path: string): string {
  return path.replace(/^\.\//, '').replace(/^\/+/, '');
}

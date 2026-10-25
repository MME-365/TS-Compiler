import React, { useState, useMemo } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  FileText, 
  FileJson, 
  Plus, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Edit3, 
  AlertCircle,
  Upload,
  Check,
  X
} from 'lucide-react';
import { ProjectFile } from '../types';

interface FileTreeProps {
  files: ProjectFile[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onAddFile: (path: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newPath: string) => void;
  onImportTrigger: () => void;
  diagnosticsByFile: Record<string, any[]>;
}

interface TreeNode {
  name: string;
  fullPath: string;
  isDirectory: boolean;
  file?: ProjectFile;
  children: TreeNode[];
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  onImportTrigger,
  diagnosticsByFile,
}) => {
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [editingNodePath, setEditingNodePath] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [isCreatingInFolder, setIsCreatingInFolder] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<'file' | 'folder'>('file');
  const [creatingName, setCreatingName] = useState<string>('');

  // Build tree from flat files
  const tree = useMemo(() => {
    const root: TreeNode = {
      name: '',
      fullPath: '',
      isDirectory: true,
      children: [],
    };

    for (const file of files) {
      const parts = file.name.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFile = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');

        let found = current.children.find((c) => c.name === part);

        if (!found) {
          found = {
            name: part,
            fullPath: currentPath,
            isDirectory: !isFile,
            file: isFile ? file : undefined,
            children: [],
          };
          current.children.push(found);
        }

        current = found;
      }
    }

    // Sort folders first, then alphabetically
    const sortNodes = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNodes);
    };

    sortNodes(root);
    return root;
  }, [files]);

  const toggleFolder = (folderPath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const startRename = (node: TreeNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNodePath(node.fullPath);
    setEditingText(node.name);
  };

  const saveRename = (node: TreeNode) => {
    const trimmed = editingText.trim();
    if (trimmed && trimmed !== node.name && node.file) {
      const parts = node.fullPath.split('/');
      parts[parts.length - 1] = trimmed;
      const newFullPath = parts.join('/');
      onRenameFile(node.file.id, newFullPath);
    }
    setEditingNodePath(null);
  };

  const handleCreateSubmit = (parentFolder: string = '') => {
    const trimmed = creatingName.trim();
    if (trimmed) {
      let finalPath = parentFolder ? `${parentFolder}/${trimmed}` : trimmed;
      if (creatingType === 'file') {
        if (!finalPath.includes('.')) {
          finalPath = `${finalPath}.ts`;
        }
        onAddFile(finalPath);
      } else {
        // Folder: add placeholder file so directory appears
        onAddFile(`${finalPath}/index.ts`);
      }
    }
    setIsCreatingInFolder(null);
    setCreatingName('');
  };

  const countFolderErrors = (node: TreeNode): number => {
    if (!node.isDirectory) {
      const diags = node.file ? diagnosticsByFile[node.file.id] || [] : [];
      return diags.filter((d: any) => d.category === 'error').length;
    }
    return node.children.reduce((acc, child) => acc + countFolderErrors(child), 0);
  };

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isCollapsed = collapsedFolders.has(node.fullPath);
    const isEditing = editingNodePath === node.fullPath;
    const isCreatingHere = isCreatingInFolder === node.fullPath;
    const isActive = node.file && node.file.id === activeFileId;
    const errorsCount = countFolderErrors(node);

    if (node.isDirectory) {
      return (
        <div key={node.fullPath}>
          <div
            onClick={(e) => toggleFolder(node.fullPath, e)}
            className={`group flex items-center justify-between py-1 px-2 rounded-sm text-xs cursor-pointer hover:bg-zinc-800/60 select-none transition-colors ${
              errorsCount > 0 ? 'text-amber-300' : 'text-zinc-300'
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <div className="flex items-center gap-1.5 truncate">
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              )}
              {isCollapsed ? (
                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              ) : (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate font-medium">{node.name}</span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {errorsCount > 0 && (
                <span className="text-[10px] text-red-400 flex items-center gap-0.5 px-1 rounded bg-red-950/60">
                  <AlertCircle className="w-2.5 h-2.5" />
                  {errorsCount}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreatingInFolder(node.fullPath);
                  setCreatingType('file');
                  setCreatingName('');
                  setCollapsedFolders((prev) => {
                    const next = new Set(prev);
                    next.delete(node.fullPath);
                    return next;
                  });
                }}
                title="New file in folder"
                className="p-0.5 text-zinc-400 hover:text-zinc-100"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* New file input inside this folder */}
          {isCreatingHere && (
            <div
              className="flex items-center gap-1 py-1 px-2 bg-zinc-900 border border-zinc-700 rounded-sm my-0.5"
              style={{ marginLeft: `${(depth + 1) * 12 + 8}px` }}
            >
              <FileCode className="w-3 h-3 text-blue-400" />
              <input
                autoFocus
                value={creatingName}
                placeholder="name.ts"
                onChange={(e) => setCreatingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateSubmit(node.fullPath);
                  if (e.key === 'Escape') setIsCreatingInFolder(null);
                }}
                className="bg-transparent text-xs text-white outline-none w-24 font-mono"
              />
              <button
                onClick={() => handleCreateSubmit(node.fullPath)}
                className="text-emerald-400 hover:text-emerald-300 p-0.5"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setIsCreatingInFolder(null)}
                className="text-zinc-500 hover:text-zinc-400 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {!isCollapsed && (
            <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    }

    // File Node
    const isJson = node.name.endsWith('.json');
    const isTsx = node.name.endsWith('.tsx') || node.name.endsWith('.jsx');
    const isMd = node.name.endsWith('.md') || node.name.endsWith('.txt');

    return (
      <div
        key={node.fullPath}
        onClick={() => node.file && onSelectFile(node.file.id)}
        onDoubleClick={(e) => startRename(node, e)}
        className={`group flex items-center justify-between py-1 px-2 rounded-sm text-xs cursor-pointer select-none transition-colors border-l-2 ${
          isActive
            ? 'bg-zinc-800 text-white font-medium border-blue-500 shadow-sm'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 border-transparent'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="flex items-center gap-1.5 truncate">
          {isJson ? (
            <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : isTsx ? (
            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          ) : isMd ? (
            <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          )}

          {isEditing ? (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                autoFocus
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename(node);
                  if (e.key === 'Escape') setEditingNodePath(null);
                }}
                onBlur={() => saveRename(node)}
                className="bg-zinc-900 border border-blue-500 rounded px-1 py-0.2 text-white text-xs w-24 outline-none font-mono"
              />
            </div>
          ) : (
            <span className="truncate font-mono text-[11.5px]">{node.name}</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Error badge */}
          {errorsCount > 0 && (
            <span
              title={`${errorsCount} syntax error(s)`}
              className="text-[10px] text-red-400 flex items-center gap-0.5 px-1 py-0.2 rounded bg-red-950/70 border border-red-800/60 font-mono"
            >
              <AlertCircle className="w-2.5 h-2.5" />
              {errorsCount}
            </span>
          )}

          {/* Action buttons on hover */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
              <button
                onClick={(e) => startRename(node, e)}
                title="Rename file"
                className="p-0.5 text-zinc-500 hover:text-zinc-200"
              >
                <Edit3 className="w-2.5 h-2.5" />
              </button>
              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (node.file) onDeleteFile(node.file.id);
                  }}
                  title="Delete file"
                  className="p-0.5 text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-56 h-full border-r border-zinc-800 bg-zinc-950 flex flex-col select-none text-zinc-300">
      {/* Top Header of File Tree */}
      <div className="h-9 px-3 border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
        <span className="font-semibold text-zinc-200 tracking-wider text-[11px] uppercase">
          Explorer ({files.length})
        </span>

        <div className="flex items-center gap-1">
          {/* Add file at root */}
          <button
            onClick={() => {
              setIsCreatingInFolder('');
              setCreatingType('file');
              setCreatingName('');
            }}
            title="New File"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Add folder at root */}
          <button
            onClick={() => {
              setIsCreatingInFolder('');
              setCreatingType('folder');
              setCreatingName('');
            }}
            title="New Folder"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>

          {/* Import Folder / Files */}
          <button
            onClick={onImportTrigger}
            title="Import folder or files"
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Root creation input */}
      {isCreatingInFolder === '' && (
        <div className="p-2 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-1">
          {creatingType === 'folder' ? (
            <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          )}
          <input
            autoFocus
            value={creatingName}
            placeholder={creatingType === 'folder' ? 'folderName' : 'fileName.ts'}
            onChange={(e) => setCreatingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateSubmit('');
              if (e.key === 'Escape') setIsCreatingInFolder(null);
            }}
            className="bg-transparent text-xs text-white outline-none flex-1 font-mono"
          />
          <button
            onClick={() => handleCreateSubmit('')}
            className="text-emerald-400 hover:text-emerald-300 p-0.5"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsCreatingInFolder(null)}
            className="text-zinc-500 hover:text-zinc-400 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 font-mono">
        {tree.children.map((child) => renderNode(child, 0))}
      </div>

      {/* Bottom Hint */}
      <div className="p-2 border-t border-zinc-800 text-[10px] text-zinc-500 font-sans flex items-center justify-between">
        <span>Drag folder here</span>
        <span className="font-mono text-zinc-400">IndexedDB ✓</span>
      </div>
    </div>
  );
};

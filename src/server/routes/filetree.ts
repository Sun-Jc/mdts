import { Router } from 'express';
import fs, { Dirent, Stats } from 'fs';
import path from 'path';
import simpleGit, { SimpleGit, StatusResult, FileStatusResult } from 'simple-git';
import { EXCLUDED_DIRECTORIES } from '../../constants';

type SortMode = 'name' | 'mtime' | 'ctime' | 'mtime_desc' | 'ctime_desc';

interface FileTreeItemWithStats {
  path: string;
  status: string;
  mtime?: number;
  ctime?: number;
}

type FileTreeItem = FileTreeItemWithStats | { [key: string]: FileTree };
type FileTree = FileTreeItem[];

export const fileTreeRouter = (directory: string): Router => {
  const router = Router();
  const git: SimpleGit = simpleGit({ baseDir: directory });

  router.get('/', async (req, res) => {
    const sortMode = (req.query.sort as string) || 'name';
    const isRepo = await git.checkIsRepo();
    const gitStatus = isRepo ? await git.status() : null;
    const fileTree = await getFileTree(directory, '', gitStatus, sortMode as SortMode);
    res.json({ fileTree, mountedDirectoryPath: directory });
  });

  return router;
};

const shouldIncludeEntry = (entry: Dirent): boolean => {
  // Exclude only directories explicitly listed in EXCLUDED_DIRECTORIES
  // This allows dot directories like .github, .agent to be included
  // while still excluding .git, .vscode, .idea, etc.
  return !EXCLUDED_DIRECTORIES.includes(entry.name);
};

const getFileStats = (filePath: string): { mtime: number; ctime: number } | null => {
  try {
    const stats = fs.statSync(filePath);
    return {
      mtime: stats.mtimeMs || 0,
      ctime: stats.birthtimeMs || stats.ctimeMs || 0,
    };
  } catch {
    return null;
  }
};

const sortFileTree = (tree: FileTree, sortMode: SortMode): FileTree => {
  return tree.sort((a, b) => {
    const aIsDir = !('path' in a);
    const bIsDir = !('path' in b);

    // Keep directories and files separated for consistent sorting
    if (aIsDir && !bIsDir) return -1;
    if (!aIsDir && bIsDir) return 1;

    if (aIsDir && bIsDir) {
      const aKey = Object.keys(a)[0];
      const bKey = Object.keys(b)[0];

      // Default name-based sorting for directories
      if (sortMode === 'name') {
        return aKey.localeCompare(bKey);
      }

      if (sortMode === 'mtime' || sortMode === 'mtime_desc') {
        const aStats = a[aKey] as FileTree;
        const bStats = b[bKey] as FileTree;
        const aMtime = (aStats[0] as any)?.mtime || 0;
        const bMtime = (bStats[0] as any)?.mtime || 0;
        return sortMode === 'mtime' ? aMtime - bMtime : bMtime - aMtime;
      }

      if (sortMode === 'ctime' || sortMode === 'ctime_desc') {
        const aStats = a[aKey] as FileTree;
        const bStats = b[bKey] as FileTree;
        const aCtime = (aStats[0] as any)?.ctime || 0;
        const bCtime = (bStats[0] as any)?.ctime || 0;
        return sortMode === 'ctime' ? aCtime - bCtime : bCtime - aCtime;
      }
    } else {
      const aItem = a as FileTreeItemWithStats;
      const bItem = b as FileTreeItemWithStats;
      const aPath = aItem.path.split('/').pop() || aItem.path;
      const bPath = bItem.path.split('/').pop() || bItem.path;

      // Default name-based sorting for files
      if (sortMode === 'name') {
        return aPath.localeCompare(bPath);
      }

      if (sortMode === 'mtime' || sortMode === 'mtime_desc') {
        const aMtime = aItem.mtime || 0;
        const bMtime = bItem.mtime || 0;
        return sortMode === 'mtime' ? aMtime - bMtime : bMtime - aMtime;
      }

      if (sortMode === 'ctime' || sortMode === 'ctime_desc') {
        const aCtime = aItem.ctime || 0;
        const bCtime = bItem.ctime || 0;
        return sortMode === 'ctime' ? aCtime - bCtime : bCtime - aCtime;
      }
    }

    return 0;
  });
};

const getFileTree = async (
  baseDirectory: string,
  currentRelativePath: string,
  gitStatus: StatusResult | null,
  sortMode: SortMode = 'name'
): Promise<FileTree> => {
  const fullPath = path.join(baseDirectory, currentRelativePath);
  const entriesInDir = fs.readdirSync(
    fullPath,
    { withFileTypes: true }
  );
  const entries = entriesInDir.filter(shouldIncludeEntry);

  const tree: FileTree = [];

  for (const entry of entries) {
    const entryPath = path.join(currentRelativePath, entry.name);
    if (entry.isDirectory()) {
      const subTree = await getFileTree(baseDirectory, entryPath, gitStatus, sortMode);
      if (subTree.length > 0) {
        tree.push({ [entry.name]: subTree });
      }
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
      let status = ' ';
      if (gitStatus) {
        const fileStatus = gitStatus.files.find((f: FileStatusResult) => f.path === entryPath);
        if (fileStatus) {
          status = fileStatus.index !== ' ' ? fileStatus.index : fileStatus.working_dir;
        }
      }

      const fullFilePath = path.join(baseDirectory, entryPath);
      const stats = getFileStats(fullFilePath);

      const fileItem: FileTreeItemWithStats = { path: entryPath, status };
      if (stats) {
        fileItem.mtime = stats.mtime;
        fileItem.ctime = stats.ctime;
      }

      tree.push(fileItem);
    }
  }

  return sortFileTree(tree, sortMode);
};


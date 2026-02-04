import { Router } from 'express';
import fs, { Dirent } from 'fs';
import path from 'path';
import simpleGit, { SimpleGit, StatusResult, FileStatusResult } from 'simple-git';
import { EXCLUDED_DIRECTORIES } from '../../constants';

type FileTreeLeaf = { path: string, status: string, tags?: string[], isDirectory?: boolean };
type FileTreeItem = FileTreeLeaf | { [key: string]: FileTree };
type FileTree = FileTreeItem[];
type SortOption = 'name' | 'modified' | 'created';
type SortOrder = 'asc' | 'desc';

export const fileTreeRouter = (directory: string): Router => {
  const router = Router();
  const git: SimpleGit = simpleGit({ baseDir: directory });

  router.get('/', async (req, res) => {
    const isRepo = await git.checkIsRepo();
    const gitStatus = isRepo ? await git.status() : null;
    const sortOption = parseSortOption(req.query.sort);
    const sortOrder = parseSortOrder(req.query.order);
    const fileTree = await getFileTree(directory, '', gitStatus, sortOption, sortOrder);
    res.json({ fileTree, mountedDirectoryPath: directory });
  });

  return router;
};

const shouldIncludeEntry = (entry: Dirent): boolean => {
  return !EXCLUDED_DIRECTORIES.includes(entry.name);
};

const getFileTree = async (
  baseDirectory: string,
  currentRelativePath: string,
  gitStatus: StatusResult | null,
  sortOption: SortOption,
  sortOrder: SortOrder
): Promise<FileTree> => {
  const fullPath = path.join(baseDirectory, currentRelativePath);
  const entriesInDir = fs.readdirSync(fullPath, { withFileTypes: true });
  const entries = entriesInDir.filter(shouldIncludeEntry);
  const sortedEntries = sortEntries(entries, fullPath, sortOption, sortOrder);

  const tree: FileTree = [];

  for (const entry of sortedEntries) {
    const entryPath = path.join(currentRelativePath, entry.name);
    if (entry.isDirectory()) {
      const subTree = await getFileTree(baseDirectory, entryPath, gitStatus, sortOption, sortOrder);
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
      const tags = getTagsFromFile(path.join(baseDirectory, entryPath));
      tree.push({ path: entryPath, status, tags });
    }
  }
  return tree;
};

const parseSortOption = (value: unknown): SortOption => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'modified' || normalized === 'created' || normalized === 'name') {
      return normalized;
    }
  }
  return 'name';
};

const parseSortOrder = (value: unknown): SortOrder => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'asc' || normalized === 'desc') {
      return normalized;
    }
  }
  return 'asc';
};

const sortEntries = (entries: Dirent[], fullPath: string, sortOption: SortOption, sortOrder: SortOrder): Dirent[] => {
  const directories: Dirent[] = [];
  const files: Dirent[] = [];

  entries.forEach(entry => {
    if (entry.isDirectory()) {
      directories.push(entry);
    } else {
      files.push(entry);
    }
  });

  const direction = sortOrder === 'asc' ? 1 : -1;
  const byName = (a: Dirent, b: Dirent) => a.name.localeCompare(b.name) * direction;

  if (sortOption === 'name') {
    return [...directories].sort(byName).concat([...files].sort(byName));
  }

  const getTime = sortOption === 'modified'
    ? (stats: fs.Stats) => stats.mtimeMs
    : (stats: fs.Stats) => stats.birthtimeMs;

  const sortByTime = (list: Dirent[]) => {
    return list
      .map(entry => ({ entry, stats: fs.statSync(path.join(fullPath, entry.name)) }))
      .sort((a, b) => {
        const timeDiff = (getTime(a.stats) - getTime(b.stats)) * direction;
        return timeDiff !== 0 ? timeDiff : a.entry.name.localeCompare(b.entry.name) * direction;
      })
      .map(({ entry }) => entry);
  };

  return sortByTime(directories).concat(sortByTime(files));
};

const getTagsFromFile = (filePath: string): string[] => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return extractTagsFromFrontmatter(content);
  } catch (error) {
    console.warn(`Failed to read tags from ${filePath}:`, error);
    return [];
  }
};

const extractTagsFromFrontmatter = (content: string): string[] => {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return [];

  const frontmatter = match[1];
  const lines = frontmatter.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const tagLineMatch = line.match(/^\s*tags\s*:\s*(.*)$/i);
    if (!tagLineMatch) continue;

    const inlineValue = tagLineMatch[1].trim();
    if (inlineValue) {
      return normalizeTags(inlineValue);
    }

    const collected: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      const nextLine = lines[j];
      if (/^\s*\w[\w-]*\s*:/.test(nextLine)) break;
      const itemMatch = nextLine.match(/^\s*-\s*(.+)$/);
      if (itemMatch) {
        const cleaned = cleanTag(itemMatch[1]);
        if (cleaned) collected.push(cleaned);
      }
    }
    return uniqueTags(collected);
  }

  return [];
};

const normalizeTags = (inlineValue: string): string[] => {
  const trimmed = inlineValue.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return uniqueTags(inner.split(',').map(cleanTag));
  }

  if (trimmed.includes(',')) {
    return uniqueTags(trimmed.split(',').map(cleanTag));
  }

  return uniqueTags([cleanTag(trimmed)]);
};

const cleanTag = (value: string): string => {
  const trimmed = value.trim();
  const unquoted = trimmed.replace(/^['\"](.+)['\"]$/, '$1');
  return unquoted.trim();
};

const uniqueTags = (tags: string[]): string[] => {
  return Array.from(new Set(tags.filter(Boolean)));
};

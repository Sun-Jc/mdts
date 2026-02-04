import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { EXCLUDED_DIRECTORIES } from '../../constants';
import { logger } from '../../utils/logger';

interface SearchMatch {
  line: number;
  preview: string;
}

interface SearchResult {
  path: string;
  matches: SearchMatch[];
}

interface SearchOptions {
  limit: number;
  maxPerFile: number;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  truncated: boolean;
}

const DEFAULT_LIMIT = 50;
const DEFAULT_MAX_PER_FILE = 3;

export const searchRouter = (directory: string): Router => {
  const router = Router();

  router.get('/', (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!query) {
      const emptyResponse: SearchResponse = { query: '', results: [], truncated: false };
      return res.json(emptyResponse);
    }

    const limit = parseNumberParam(req.query.limit, DEFAULT_LIMIT, 1, 500);
    const maxPerFile = parseNumberParam(req.query.maxPerFile, DEFAULT_MAX_PER_FILE, 1, 20);

    try {
      const { results, truncated } = searchMarkdownFiles(directory, query, { limit, maxPerFile });
      const response: SearchResponse = { query, results, truncated };
      return res.json(response);
    } catch (error) {
      logger.error('Search failed:', error);
      return res.status(500).send('Search failed');
    }
  });

  return router;
};

const parseNumberParam = (value: unknown, fallback: number, min: number, max: number): number => {
  if (typeof value !== 'string') return fallback;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const searchMarkdownFiles = (
  directory: string,
  query: string,
  options: SearchOptions
): { results: SearchResult[]; truncated: boolean } => {
  const normalizedQuery = query.toLowerCase();
  const files = collectMarkdownFiles(directory);
  const results: SearchResult[] = [];
  let truncated = false;

  for (const relativePath of files) {
    if (results.length >= options.limit) {
      truncated = true;
      break;
    }

    const fullPath = path.join(directory, relativePath);
    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch (error) {
      console.warn(`Failed to read ${fullPath}:`, error);
      continue;
    }

    const lines = content.split(/\r?\n/);
    const matches: SearchMatch[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.toLowerCase().includes(normalizedQuery)) {
        matches.push({ line: i + 1, preview: line.trim() });
        if (matches.length >= options.maxPerFile) break;
      }
    }

    if (matches.length > 0) {
      results.push({ path: relativePath, matches });
    }
  }

  return { results, truncated };
};

const collectMarkdownFiles = (directory: string, currentRelativePath: string = ''): string[] => {
  const fullPath = path.join(directory, currentRelativePath);
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRECTORIES.includes(entry.name)) continue;
      const nestedPath = path.join(currentRelativePath, entry.name);
      files.push(...collectMarkdownFiles(directory, nestedPath));
      continue;
    }

    if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
      files.push(path.join(currentRelativePath, entry.name));
    }
  }

  return files;
};

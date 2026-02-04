import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { logger } from '../../utils/logger';

const FRONTMATTER_REGEX = /^---\s*\r?\n([\s\S]*?)\r?\n---\s*(\r?\n|$)/;
const FRONTMATTER_KEY_REGEX = /^\s*\w[\w-]*\s*:/;
const TAG_LINE_REGEX = /^\s*tags\s*:\s*(.*)$/i;

const resolveFilePath = (directory: string, relativePath: string): string | null => {
  const decodedPath = decodeURIComponent(relativePath);
  const normalizedPath = path.normalize(decodedPath);
  const basePath = path.resolve(directory);
  const resolvedPath = path.resolve(basePath, normalizedPath);

  if (!resolvedPath.startsWith(basePath + path.sep)) {
    return null;
  }

  return resolvedPath;
};

const cleanTag = (value: string): string => {
  const trimmed = value.trim();
  const unquoted = trimmed.replace(/^['"](.+)['"]$/, '$1');
  return unquoted.trim();
};

const normalizeTags = (tags: unknown[]): string[] => {
  const expanded = tags.flatMap((tag) => {
    if (typeof tag === 'string' || typeof tag === 'number' || typeof tag === 'boolean') {
      return String(tag).split(',');
    }
    return [];
  });

  const cleaned = expanded
    .map(cleanTag)
    .filter(Boolean);

  return Array.from(new Set(cleaned));
};

const buildTagLines = (tags: string[]): string[] => {
  return ['tags:', ...tags.map((tag) => `  - ${tag}`)];
};

const findTagsBlock = (lines: string[]): { start: number; end: number } => {
  for (let i = 0; i < lines.length; i += 1) {
    if (!TAG_LINE_REGEX.test(lines[i])) continue;

    let end = i;
    for (let j = i + 1; j < lines.length; j += 1) {
      if (FRONTMATTER_KEY_REGEX.test(lines[j])) break;
      end = j;
    }
    return { start: i, end };
  }
  return { start: -1, end: -1 };
};

const updateFrontmatterTags = (content: string, tags: string[]): string => {
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    if (tags.length === 0) return content;
    const block = ['---', ...buildTagLines(tags), '---', ''].join(newline);
    return block + content;
  }

  const frontmatterBody = match[1];
  const trailing = match[2] ?? '';
  const lines = frontmatterBody.split(/\r?\n/);
  const { start, end } = findTagsBlock(lines);

  if (tags.length === 0) {
    if (start !== -1) {
      lines.splice(start, end - start + 1);
    }
  } else if (start === -1) {
    lines.push(...buildTagLines(tags));
  } else {
    lines.splice(start, end - start + 1, ...buildTagLines(tags));
  }

  const nextBody = lines.join(newline);
  if (!nextBody.trim()) {
    return content.replace(match[0], '');
  }

  const updatedBlock = `---${newline}${nextBody}${newline}---${trailing}`;
  return content.replace(match[0], updatedBlock);
};

export const frontmatterRouter = (directory: string): Router => {
  const router = Router();

  router.post('/tags', (req, res) => {
    const { path: relativePath, tags } = req.body ?? {};
    if (typeof relativePath !== 'string' || !Array.isArray(tags)) {
      return res.status(400).send('Invalid payload');
    }

    const normalizedTags = normalizeTags(tags);
    const filePath = resolveFilePath(directory, relativePath);
    if (!filePath) {
      return res.status(403).send('Forbidden');
    }

    if (!filePath.toLowerCase().endsWith('.md') && !filePath.toLowerCase().endsWith('.markdown')) {
      return res.status(400).send('Unsupported file type');
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const updated = updateFrontmatterTags(content, normalizedTags);

      if (updated !== content) {
        fs.writeFileSync(filePath, updated, 'utf8');
      }

      return res.json({ updated: updated !== content, tags: normalizedTags });
    } catch (error) {
      logger.error('Failed to update tags:', error);
      return res.status(500).send('Failed to update tags');
    }
  });

  return router;
};

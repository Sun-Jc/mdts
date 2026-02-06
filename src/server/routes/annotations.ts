import { Router } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../../utils/logger';

/**
 * Source range using character offsets
 */
interface SourceRange {
  start: number;
  end: number;
}

interface CommentAnnotation {
  type: 'comment';
  source: SourceRange;
  feedback: string;
}

interface DeleteAnnotation {
  type: 'delete';
  source: SourceRange;
}

type AnnotationItem = CommentAnnotation | DeleteAnnotation;

interface AnnotationFile {
  globalComment?: string;
  contentHash?: string;
  originalContent?: string;
  annotations: AnnotationItem[];
}

const computeHash = (content: string): string => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

/**
 * Get the annotation file path for a given markdown file path
 */
const getAnnotationFilePath = (directory: string, relativePath: string): string => {
  const fullPath = path.join(directory, relativePath);
  return `${fullPath}.annotation.json`;
};

/**
 * Validate that a resolved path is within the allowed directory
 */
const isPathSafe = (resolvedPath: string, directory: string): boolean => {
  const normalizedDir = path.normalize(directory);
  const normalizedPath = path.normalize(resolvedPath);
  return normalizedPath.startsWith(normalizedDir);
};

export const annotationsRouter = (directory: string): Router => {
  const router = Router();

  router.get('/*splat', (req, res) => {
    try {
      const relativePath = decodeURIComponent(req.path.substring(1));

      if (!relativePath) {
        return res.status(400).json({ error: 'Path is required' });
      }

      const annotationPath = getAnnotationFilePath(directory, relativePath);

      // Security check
      if (!isPathSafe(annotationPath, directory)) {
        logger.error(`🚫 Attempted path traversal: ${annotationPath}`);
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Return empty annotations if file doesn't exist
      if (!fs.existsSync(annotationPath)) {
        return res.json({ annotations: [], globalComment: '', hashMismatch: false });
      }

      const content = fs.readFileSync(annotationPath, 'utf-8');
      const data: AnnotationFile = JSON.parse(content);

      const originalFilePath = path.join(directory, relativePath);
      let hashMismatch = false;
      let currentContent = '';

      if (fs.existsSync(originalFilePath) && data.contentHash) {
        currentContent = fs.readFileSync(originalFilePath, 'utf-8');
        const currentHash = computeHash(currentContent);
        hashMismatch = currentHash !== data.contentHash;
      }

      return res.json({
        ...data,
        hashMismatch,
        currentContent: hashMismatch ? currentContent : undefined,
      });
    } catch (error) {
      logger.error('Failed to load annotations:', error);
      return res.status(500).json({ error: 'Failed to load annotations' });
    }
  });

  router.post('/*splat', (req, res) => {
    try {
      const relativePath = decodeURIComponent(req.path.substring(1));

      if (!relativePath) {
        return res.status(400).json({ error: 'Path is required' });
      }

      const annotationPath = getAnnotationFilePath(directory, relativePath);

      if (!isPathSafe(annotationPath, directory)) {
        logger.error(`🚫 Attempted path traversal: ${annotationPath}`);
        return res.status(403).json({ error: 'Forbidden' });
      }

      const data = req.body as { annotations?: unknown[]; globalComment?: unknown; currentContent?: string };

      if (!data || !Array.isArray(data.annotations)) {
        return res.status(400).json({ error: 'Invalid annotation format' });
      }

      const globalComment = typeof data.globalComment === 'string' ? data.globalComment : '';
      const currentContent = typeof data.currentContent === 'string' ? data.currentContent : '';

      for (const annotation of data.annotations) {
        const ann = annotation as Record<string, unknown>;
        if (!ann.type || !ann.source) {
          return res.status(400).json({ error: 'Invalid annotation: missing type or source' });
        }
        const source = ann.source as Record<string, unknown>;
        if (typeof source.start !== 'number' || typeof source.end !== 'number') {
          return res.status(400).json({ error: 'Invalid annotation: source must have numeric start and end' });
        }
        if (ann.type === 'comment' && typeof ann.feedback !== 'string') {
          return res.status(400).json({ error: 'Invalid comment annotation: missing feedback' });
        }
        if (ann.type !== 'comment' && ann.type !== 'delete') {
          return res.status(400).json({ error: `Invalid annotation type: ${ann.type}` });
        }
      }

      const validData: AnnotationFile = {
        globalComment,
        contentHash: currentContent ? computeHash(currentContent) : undefined,
        originalContent: currentContent || undefined,
        annotations: data.annotations as AnnotationItem[]
      };
      fs.writeFileSync(annotationPath, JSON.stringify(validData, null, 2), 'utf-8');

      logger.log('Annotations', `Saved annotations to: ${annotationPath}`);

      // Feedback generation is handled by the directory watcher when it detects .annotation.json changes
      return res.json({ success: true });
    } catch (error) {
      logger.error('Failed to save annotations:', error);
      return res.status(500).json({ error: 'Failed to save annotations' });
    }
  });

  return router;
};

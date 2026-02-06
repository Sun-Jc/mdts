import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

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

interface LineCharPosition {
  line: number;  // 1-based
  char: number;  // 1-based
}

/**
 * Convert a character offset to line:char position
 * Lines and chars are 1-based for human readability
 */
export function offsetToLineChar(content: string, offset: number): LineCharPosition {
  if (offset < 0) {
    return { line: 1, char: 1 };
  }
  
  if (offset >= content.length) {
    // Return position at end of content
    const lines = content.split('\n');
    return {
      line: lines.length,
      char: lines[lines.length - 1].length + 1
    };
  }

  let line = 1;
  let charInLine = 1;
  
  for (let i = 0; i < offset; i++) {
    if (content[i] === '\n') {
      line++;
      charInLine = 1;
    } else {
      charInLine++;
    }
  }
  
  return { line, char: charInLine };
}

/**
 * Create a summary from quoted text (first 30 chars with ellipsis if truncated)
 */
function createSummary(text: string): string {
  const firstLine = text.split('\n')[0].trim();
  if (firstLine.length <= 30) {
    return firstLine;
  }
  return firstLine.substring(0, 30) + '...';
}

/**
 * Format quoted text with markdown blockquote syntax
 * Handles multi-line quotes by prefixing each line with >
 */
function formatQuote(text: string): string {
  const lines = text.split('\n');
  return lines.map(line => `> ${line}`).join('\n');
}

/**
 * Generate the feedback markdown content from annotations
 */
export function generateFeedbackMd(
  originalPath: string,
  content: string,
  annotations: AnnotationItem[],
  globalComment?: string
): string {
  if (annotations.length === 0 && !globalComment) {
    return `# Feedback\n\nOriginal document: ${originalPath}\n\n*No annotations*\n`;
  }

  const sections: string[] = [
    '# Feedback',
    '',
    `Original document: ${originalPath}`,
    ''
  ];

  if (globalComment && globalComment.trim()) {
    sections.push('## Global Comment');
    sections.push('');
    sections.push(globalComment.trim());
    sections.push('');
    sections.push('---');
    sections.push('');
  }

  for (const annotation of annotations) {
    const quotedText = content.substring(annotation.source.start, annotation.source.end);
    const summary = createSummary(quotedText);
    const startPos = offsetToLineChar(content, annotation.source.start);
    const endPos = offsetToLineChar(content, annotation.source.end);
    
    if (annotation.type === 'comment') {
      sections.push(`## Comment on "${summary}"`);
      sections.push('');
      sections.push(`**Comment**: ${annotation.feedback}`);
      sections.push('');
      sections.push('Original Content:');
      sections.push('');
      sections.push(formatQuote(quotedText));
      sections.push('');
      sections.push('Anchor:');
      sections.push('');
      sections.push(`- From Line ${startPos.line} Char ${startPos.char}`);
      sections.push(`- To Line ${endPos.line} Char ${endPos.char}`);
      sections.push('');
    } else if (annotation.type === 'delete') {
      sections.push(`## Delete "${summary}"`);
      sections.push('');
      sections.push('Delete');
      sections.push(formatQuote(quotedText));
      sections.push('');
      sections.push('Anchor:');
      sections.push('');
      sections.push(`- From Line ${startPos.line} Char ${startPos.char}`);
      sections.push(`- To Line ${endPos.line} Char ${endPos.char}`);
      sections.push('');
    }
  }

  return sections.join('\n');
}

/**
 * Write the feedback markdown file
 * Creates {originalPath}.ant.md
 */
export function writeFeedbackFile(originalPath: string, feedbackMd: string): void {
  const feedbackPath = `${originalPath}.ant.md`;
  
  try {
    fs.writeFileSync(feedbackPath, feedbackMd, 'utf-8');
    logger.log('Feedback', `Generated feedback file: ${feedbackPath}`);
  } catch (error) {
    logger.error(`Failed to write feedback file ${feedbackPath}:`, error);
    throw error;
  }
}

/**
 * Generate and write feedback file for an annotation
 * Main entry point for the feedback generation workflow
 */
export function generateAndWriteFeedback(
  originalFilePath: string,
  annotationFilePath: string
): void {
  try {
    // Read original file content
    if (!fs.existsSync(originalFilePath)) {
      logger.error(`Original file not found: ${originalFilePath}`);
      return;
    }
    
    const content = fs.readFileSync(originalFilePath, 'utf-8');
    
    // Read annotation file
    if (!fs.existsSync(annotationFilePath)) {
      logger.error(`Annotation file not found: ${annotationFilePath}`);
      return;
    }
    
    const annotationData = JSON.parse(fs.readFileSync(annotationFilePath, 'utf-8'));
    const annotations: AnnotationItem[] = annotationData.annotations || [];
    const globalComment: string = annotationData.globalComment || '';
    
    // Generate and write feedback
    const feedbackMd = generateFeedbackMd(originalFilePath, content, annotations, globalComment);
    writeFeedbackFile(originalFilePath, feedbackMd);
  } catch (error) {
    logger.error('Failed to generate feedback:', error);
  }
}

/**
 * Source range in the original file using character offsets
 */
export interface SourceRange {
  /** Start character offset (0-based, inclusive) */
  start: number;
  /** End character offset (0-based, exclusive) */
  end: number;
}

/**
 * Comment annotation - marks text with feedback
 */
export interface CommentAnnotation {
  type: 'comment';
  source: SourceRange;
  feedback: string;
}

/**
 * Delete annotation - marks text for deletion
 */
export interface DeleteAnnotation {
  type: 'delete';
  source: SourceRange;
}

/**
 * Union of all annotation types
 */
export type AnnotationItem = CommentAnnotation | DeleteAnnotation;

/**
 * Annotation file structure stored as {filename}.annotation.json
 */
export interface AnnotationFile {
  globalComment?: string;
  contentHash?: string;
  originalContent?: string;
  annotations: AnnotationItem[];
}

/**
 * Type guard to check if an annotation is a comment
 */
export function isCommentAnnotation(item: AnnotationItem): item is CommentAnnotation {
  return item.type === 'comment';
}

/**
 * Type guard to check if an annotation is a deletion
 */
export function isDeleteAnnotation(item: AnnotationItem): item is DeleteAnnotation {
  return item.type === 'delete';
}

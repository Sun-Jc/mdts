import React, { useMemo } from 'react';
import type { AnnotationItem, CommentAnnotation } from '../../types/annotations';
import { isCommentAnnotation } from '../../types/annotations';

interface Segment {
  text: string;
  annotation: AnnotationItem | null;
  startOffset: number;
  endOffset: number;
}

interface AnnotatedMarkdownRendererProps {
  content: string;
  annotations: AnnotationItem[];
  onAnnotationClick?: (annotation: AnnotationItem) => void;
}

function splitByAnnotations(content: string, annotations: AnnotationItem[]): Segment[] {
  if (annotations.length === 0) {
    return [{ text: content, annotation: null, startOffset: 0, endOffset: content.length }];
  }

  const sorted = [...annotations].sort((a, b) => a.source.start - b.source.start);
  const segments: Segment[] = [];
  let currentPos = 0;

  for (const annotation of sorted) {
    const { start, end } = annotation.source;
    
    if (start < currentPos) continue;
    
    if (start > currentPos) {
      segments.push({
        text: content.substring(currentPos, start),
        annotation: null,
        startOffset: currentPos,
        endOffset: start,
      });
    }

    segments.push({
      text: content.substring(start, end),
      annotation,
      startOffset: start,
      endOffset: end,
    });

    currentPos = end;
  }

  if (currentPos < content.length) {
    segments.push({
      text: content.substring(currentPos),
      annotation: null,
      startOffset: currentPos,
      endOffset: content.length,
    });
  }

  return segments;
}

export const AnnotatedMarkdownRenderer: React.FC<AnnotatedMarkdownRendererProps> = ({
  content,
  annotations,
  onAnnotationClick,
}) => {
  const segments = useMemo(() => splitByAnnotations(content, annotations), [content, annotations]);

  return (
    <pre
      style={{
        fontFamily: 'inherit',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        margin: 0,
        padding: '16px',
        fontSize: '14px',
        lineHeight: '1.6',
      }}
    >
      {segments.map((segment, index) => {
        if (!segment.annotation) {
          return <span key={index}>{segment.text}</span>;
        }

        const isComment = isCommentAnnotation(segment.annotation);
        const backgroundColor = isComment ? 'rgba(255, 235, 59, 0.3)' : 'rgba(244, 67, 54, 0.2)';
        const borderColor = isComment ? '#ffc107' : '#f44336';

        return (
          <span
            key={index}
            onClick={() => onAnnotationClick?.(segment.annotation!)}
            title={isComment ? (segment.annotation as CommentAnnotation).feedback : 'Marked for deletion'}
            style={{
              backgroundColor,
              borderBottom: `2px solid ${borderColor}`,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isComment
                ? 'rgba(255, 235, 59, 0.5)'
                : 'rgba(244, 67, 54, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = backgroundColor;
            }}
          >
            {segment.text}
          </span>
        );
      })}
    </pre>
  );
};

export default AnnotatedMarkdownRenderer;

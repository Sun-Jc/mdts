import React, { useState, useEffect, useCallback } from 'react';
import { Paper, Typography } from '@mui/material';
import type { AnnotationItem, CommentAnnotation } from '../../../../types/annotations';
import { isCommentAnnotation } from '../../../../types/annotations';

interface PreviewAnnotationOverlayProps {
  annotations: AnnotationItem[];
  content: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  showBubbles?: boolean;
}

interface HighlightRect {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
  isComment: boolean;
}

interface CommentBubble {
  id: string;
  feedback: string;
  top: number;
  left: number;
}

function getTextNodes(container: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    textNodes.push(node);
  }
  return textNodes;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function findTextInRendered(
  container: HTMLElement,
  searchText: string
): Array<{ node: Text; start: number; end: number }> {
  const results: Array<{ node: Text; start: number; end: number }> = [];
  const normalizedSearch = normalizeText(searchText);

  if (!normalizedSearch) return results;

  const textNodes = getTextNodes(container);

  let fullText = '';
  const nodeMap: Array<{ node: Text; startInFull: number; endInFull: number }> = [];

  for (const node of textNodes) {
    const nodeText = node.textContent || '';
    const startInFull = fullText.length;
    fullText += nodeText;
    nodeMap.push({ node, startInFull, endInFull: fullText.length });
  }

  const normalizedFull = normalizeText(fullText);

  let searchIdx = normalizedFull.indexOf(normalizedSearch);
  if (searchIdx === -1) {
    const words = normalizedSearch.split(' ').filter(w => w.length > 3);
    for (const word of words) {
      searchIdx = normalizedFull.indexOf(word);
      if (searchIdx !== -1) break;
    }
  }

  if (searchIdx === -1) return results;

  let normalizedCharCount = 0;
  let startInOriginal = 0;
  let endInOriginal = 0;

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const normalized = char.replace(/\s+/g, ' ').toLowerCase();

    if (normalizedCharCount === searchIdx) {
      startInOriginal = i;
    }

    if (normalized.trim() || (normalized === ' ' && normalizedCharCount > 0)) {
      normalizedCharCount += normalized.length;
    }

    if (normalizedCharCount >= searchIdx + normalizedSearch.length) {
      endInOriginal = i + 1;
      break;
    }
  }

  if (endInOriginal === 0) {
    endInOriginal = fullText.length;
  }

  for (const { node, startInFull, endInFull } of nodeMap) {
    if (endInFull > startInOriginal && startInFull < endInOriginal) {
      const nodeStart = Math.max(0, startInOriginal - startInFull);
      const nodeEnd = Math.min(endInFull - startInFull, endInOriginal - startInFull);
      if (nodeEnd > nodeStart) {
        results.push({ node, start: nodeStart, end: nodeEnd });
      }
    }
  }

  return results;
}

function calculateBubblePositions(
  rawBubbles: Array<{ id: string; feedback: string; bottom: number; right: number }>,
  containerWidth: number
): CommentBubble[] {
  type BubblePos = { id: string; feedback: string; top: number; left: number; width: number; height: number };
  const positioned: BubblePos[] = [];
  const BUBBLE_GAP = 8;
  const MAX_WIDTH = 220;
  const LINE_HEIGHT = 18;
  const PADDING = 16;

  for (const bubble of rawBubbles) {
    const charCount = bubble.feedback.length;
    const estimatedWidth = Math.min(MAX_WIDTH, Math.max(100, charCount * 7));
    const lineCount = Math.ceil(charCount * 7 / estimatedWidth);
    const estimatedHeight = lineCount * LINE_HEIGHT + PADDING;

    let top = bubble.bottom + 4;
    let left = bubble.right + 8;

    if (left + estimatedWidth > containerWidth - 20) {
      left = containerWidth - estimatedWidth - 20;
    }
    if (left < 10) left = 10;

    for (const existing of positioned) {
      const overlap = !(
        left + estimatedWidth < existing.left ||
        left > existing.left + existing.width ||
        top + estimatedHeight < existing.top ||
        top > existing.top + existing.height
      );

      if (overlap) {
        top = existing.top + existing.height + BUBBLE_GAP;
      }
    }

    positioned.push({
      id: bubble.id,
      feedback: bubble.feedback,
      top,
      left,
      width: estimatedWidth,
      height: estimatedHeight,
    });
  }

  return positioned.map(({ id, feedback, top, left }) => ({ id, feedback, top, left }));
}

/**
 * Compute highlight rects and bubble positions without modifying the DOM.
 * Uses Range.getClientRects() for read-only position measurement.
 */
function computeOverlayData(
  container: HTMLElement,
  annotations: AnnotationItem[],
  rawContent: string
): { highlights: HighlightRect[]; bubbles: CommentBubble[] } {
  const containerRect = container.getBoundingClientRect();
  const highlights: HighlightRect[] = [];
  const rawBubbles: Array<{ id: string; feedback: string; bottom: number; right: number }> = [];

  const sortedAnnotations = [...annotations].sort((a, b) => a.source.start - b.source.start);

  for (let i = 0; i < sortedAnnotations.length; i++) {
    const annotation = sortedAnnotations[i];
    const annotationId = `preview-annotation-${i}`;

    const annotatedText = rawContent.substring(annotation.source.start, annotation.source.end);
    const nodesToHighlight = findTextInRendered(container, annotatedText);

    if (nodesToHighlight.length === 0) continue;

    const isComment = isCommentAnnotation(annotation);
    let lastBottom = 0;
    let lastRight = 0;

    for (const { node, start, end } of nodesToHighlight) {
      try {
        const range = document.createRange();
        const textLen = node.textContent?.length || 0;
        range.setStart(node, Math.min(start, textLen));
        range.setEnd(node, Math.min(end, textLen));
        const rects = range.getClientRects();

        for (let r = 0; r < rects.length; r++) {
          const rect = rects[r];
          if (rect.width === 0 || rect.height === 0) continue;

          const top = rect.top - containerRect.top;
          const left = rect.left - containerRect.left;

          highlights.push({
            id: `${annotationId}-${highlights.length}`,
            top,
            left,
            width: rect.width,
            height: rect.height,
            isComment,
          });

          if (rect.bottom > lastBottom || (rect.bottom === lastBottom && rect.right > lastRight)) {
            lastBottom = rect.bottom;
            lastRight = rect.right;
          }
        }

        range.detach();
      } catch {
        // Skip nodes where range creation fails
      }
    }

    if (isComment && lastBottom > 0) {
      rawBubbles.push({
        id: annotationId,
        feedback: (annotation as CommentAnnotation).feedback,
        bottom: lastBottom - containerRect.top,
        right: lastRight - containerRect.left,
      });
    }
  }

  rawBubbles.sort((a, b) => a.bottom - b.bottom);
  const bubbles = calculateBubblePositions(rawBubbles, containerRect.width);

  return { highlights, bubbles };
}

const PreviewAnnotationOverlay: React.FC<PreviewAnnotationOverlayProps> = ({
  annotations,
  content,
  containerRef,
  showBubbles = true,
}) => {
  const [highlights, setHighlights] = useState<HighlightRect[]>([]);
  const [bubbles, setBubbles] = useState<CommentBubble[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bubbleId = e.currentTarget.dataset.bubbleId;
    if (bubbleId) setHoveredId(bubbleId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container || annotations.length === 0) {
      setHighlights([]);
      setBubbles([]);
      return;
    }

    const data = computeOverlayData(container, annotations, content);
    setHighlights(data.highlights);
    setBubbles(data.bubbles);
  }, [annotations, content, containerRef]);

  useEffect(() => {
    if (annotations.length === 0) {
      setHighlights([]);
      setBubbles([]);
      return;
    }

    // Wait for ReactMarkdown to finish rendering
    const timeoutId = setTimeout(recalculate, 150);
    return () => clearTimeout(timeoutId);
  }, [content, annotations, recalculate]);

  // Recalculate on window resize since rects are position-based
  useEffect(() => {
    if (annotations.length === 0) return;

    const handleResize = (): void => {
      recalculate();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [annotations.length, recalculate]);

  if (highlights.length === 0 && bubbles.length === 0) {
    return null;
  }

  return (
    <>
      {highlights.map(({ id, top, left, width, height, isComment }) => (
        <div
          key={id}
          style={{
            position: 'absolute',
            top,
            left,
            width,
            height,
            backgroundColor: isComment
              ? 'rgba(255, 193, 7, 0.25)'
              : 'rgba(244, 67, 54, 0.15)',
            borderBottom: isComment ? '2px solid rgba(255, 193, 7, 0.7)' : undefined,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      ))}
      {showBubbles && bubbles.map(({ id, feedback, top, left }) => (
        <Paper
          key={id}
          data-bubble-id={id}
          elevation={hoveredId === id ? 3 : 0}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{
            position: 'absolute',
            top,
            left,
            zIndex: hoveredId === id ? 20 : 10,
            maxWidth: 220,
            p: 1,
            backgroundColor: '#fff8e1',
            border: hoveredId === id ? '1px solid #ffc107' : '1px solid #ffe082',
            borderRadius: 1,
            transition: 'background-color 0.15s, border-color 0.15s, box-shadow 0.15s',
            cursor: 'default',
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: 'text.secondary',
              lineHeight: 1.4,
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {feedback}
          </Typography>
        </Paper>
      ))}
    </>
  );
};

export default PreviewAnnotationOverlay;

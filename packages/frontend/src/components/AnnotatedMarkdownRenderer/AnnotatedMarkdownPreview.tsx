import React, {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { AnnotationItem } from '../../types/annotations';
import { isCommentAnnotation } from '../../types/annotations';

export interface SelectionInfo {
  start: number;
  end: number;
  text: string;
}

export interface AnnotatedMarkdownPreviewHandle {
  getSelectionInRawContent: () => SelectionInfo | null;
  getContainer: () => HTMLDivElement | null;
}

interface AnnotatedMarkdownPreviewProps {
  content: string;
  annotations: AnnotationItem[];
  onHoverAnnotation?: (index: number | null) => void;
}

interface HighlightRect {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
  annotationIndex: number;
  isComment: boolean;
}

function buildReverseOffsetMap(
  rawContent: string,
  renderedText: string
): Map<number, number> {
  const map = new Map<number, number>();
  let rawIdx = 0;
  let renderedIdx = 0;

  while (rawIdx < rawContent.length && renderedIdx < renderedText.length) {
    const rawChar = rawContent[rawIdx];
    const renderedChar = renderedText[renderedIdx];

    if (rawChar === renderedChar) {
      map.set(renderedIdx, rawIdx);
      rawIdx++;
      renderedIdx++;
    } else if (rawChar === '\n' && renderedChar !== '\n') {
      rawIdx++;
    } else if (renderedChar === '\n' && rawChar !== '\n') {
      map.set(renderedIdx, rawIdx);
      renderedIdx++;
    } else {
      rawIdx++;
    }
  }

  while (renderedIdx < renderedText.length) {
    map.set(renderedIdx, rawContent.length);
    renderedIdx++;
  }

  return map;
}

function findTextInRaw(
  rawContent: string,
  searchText: string,
  approximateStart: number
): { start: number; end: number } | null {
  const cleanSearch = searchText
    .replace(/\s+/g, '\\s*')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const searchWindow = Math.min(500, rawContent.length);
  const windowStart = Math.max(0, approximateStart - searchWindow);
  const windowEnd = Math.min(
    rawContent.length,
    approximateStart + searchWindow
  );
  const searchRegion = rawContent.substring(windowStart, windowEnd);

  try {
    const regex = new RegExp(cleanSearch, 'i');
    const match = searchRegion.match(regex);
    if (match && match.index !== undefined) {
      const start = windowStart + match.index;
      const end = start + match[0].length;
      return { start, end };
    }
  } catch {
    // Regex failed, try direct search
  }

  const directIndex = rawContent.indexOf(
    searchText,
    Math.max(0, approximateStart - 100)
  );
  if (directIndex !== -1) {
    return { start: directIndex, end: directIndex + searchText.length };
  }

  const beforeIndex = rawContent.lastIndexOf(
    searchText,
    approximateStart + 100
  );
  if (beforeIndex !== -1) {
    return { start: beforeIndex, end: beforeIndex + searchText.length };
  }

  return null;
}

function getTextNodes(container: HTMLElement): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT
  );
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
  const nodeMap: Array<{
    node: Text;
    startInFull: number;
    endInFull: number;
  }> = [];

  for (const node of textNodes) {
    const nodeText = node.textContent || '';
    const startInFull = fullText.length;
    fullText += nodeText;
    nodeMap.push({ node, startInFull, endInFull: fullText.length });
  }

  const normalizedFull = normalizeText(fullText);

  let searchIdx = normalizedFull.indexOf(normalizedSearch);
  if (searchIdx === -1) {
    const words = normalizedSearch.split(' ').filter((w) => w.length > 3);
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

    if (
      normalized.trim() ||
      (normalized === ' ' && normalizedCharCount > 0)
    ) {
      normalizedCharCount += normalized.length;
    }

    if (
      normalizedCharCount >=
      searchIdx + normalizedSearch.length
    ) {
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
      const nodeEnd = Math.min(
        endInFull - startInFull,
        endInOriginal - startInFull
      );
      if (nodeEnd > nodeStart) {
        results.push({ node, start: nodeStart, end: nodeEnd });
      }
    }
  }

  return results;
}

/**
 * Compute highlight rects without modifying the DOM.
 * Uses Range.getClientRects() for read-only position measurement.
 */
function computeHighlightRects(
  container: HTMLElement,
  annotations: AnnotationItem[],
  rawContent: string
): HighlightRect[] {
  const containerRect = container.getBoundingClientRect();
  const highlights: HighlightRect[] = [];

  for (let i = 0; i < annotations.length; i++) {
    const annotation = annotations[i];
    const annotatedText = rawContent.substring(
      annotation.source.start,
      annotation.source.end
    );
    const nodes = findTextInRendered(container, annotatedText);

    if (nodes.length === 0) continue;

    const isComment = isCommentAnnotation(annotation);

    for (const { node, start, end } of nodes) {
      try {
        const range = document.createRange();
        const textLen = node.textContent?.length || 0;
        range.setStart(node, Math.min(start, textLen));
        range.setEnd(node, Math.min(end, textLen));
        const rects = range.getClientRects();

        for (let r = 0; r < rects.length; r++) {
          const rect = rects[r];
          if (rect.width === 0 || rect.height === 0) continue;

          highlights.push({
            id: `ann-${i}-${highlights.length}`,
            top: rect.top - containerRect.top,
            left: rect.left - containerRect.left,
            width: rect.width,
            height: rect.height,
            annotationIndex: i,
            isComment,
          });
        }

        range.detach();
      } catch {
        // Skip nodes where range creation fails
      }
    }
  }

  return highlights;
}

export const AnnotatedMarkdownPreview = forwardRef<
  AnnotatedMarkdownPreviewHandle,
  AnnotatedMarkdownPreviewProps
>(({ content, annotations, onHoverAnnotation }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rawContentRef = useRef(content);
  const [renderKey, setRenderKey] = useState(0);
  const [highlights, setHighlights] = useState<HighlightRect[]>([]);

  rawContentRef.current = content;

  const getSelectionInRawContent = useCallback(
    (): SelectionInfo | null => {
      const container = containerRef.current;
      if (!container) return null;

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

      const range = sel.getRangeAt(0);
      const selectedText = sel.toString();
      if (!selectedText.trim()) return null;

      const preRange = document.createRange();
      preRange.selectNodeContents(container);
      preRange.setEnd(range.startContainer, range.startOffset);
      const renderedStart = preRange.toString().length;
      const renderedEnd = renderedStart + selectedText.length;

      const renderedText = container.textContent || '';
      const reverseMap = buildReverseOffsetMap(
        rawContentRef.current,
        renderedText
      );

      let rawStart = reverseMap.get(renderedStart);
      let rawEnd = reverseMap.get(renderedEnd);

      if (rawStart === undefined) {
        for (let i = renderedStart; i >= 0; i--) {
          if (reverseMap.has(i)) {
            rawStart = reverseMap.get(i);
            break;
          }
        }
        if (rawStart === undefined) rawStart = 0;
      }

      if (rawEnd === undefined) {
        for (let i = renderedEnd; i < renderedText.length; i++) {
          if (reverseMap.has(i)) {
            rawEnd = reverseMap.get(i);
            break;
          }
        }
        if (rawEnd === undefined) rawEnd = rawContentRef.current.length;
      }

      const rawText = rawContentRef.current.substring(rawStart, rawEnd);

      const cleanSelected = selectedText
        .replace(/\s+/g, '')
        .toLowerCase();
      const cleanRaw = rawText.replace(/\s+/g, '').toLowerCase();

      if (
        !cleanRaw.includes(
          cleanSelected.substring(
            0,
            Math.min(10, cleanSelected.length)
          )
        )
      ) {
        const found = findTextInRaw(
          rawContentRef.current,
          selectedText,
          rawStart
        );
        if (found) {
          return {
            start: found.start,
            end: found.end,
            text: rawContentRef.current.substring(
              found.start,
              found.end
            ),
          };
        }
      }

      return {
        start: rawStart,
        end: rawEnd,
        text: rawText,
      };
    },
    []
  );

  useImperativeHandle(
    ref,
    () => ({
      getSelectionInRawContent,
      getContainer: () => containerRef.current,
    }),
    [getSelectionInRawContent]
  );

  useEffect(() => {
    setRenderKey((prev) => prev + 1);
  }, [content]);

  const recalculate = useCallback(() => {
    const container = containerRef.current;
    if (!container || annotations.length === 0) {
      setHighlights([]);
      return;
    }
    const rects = computeHighlightRects(
      container,
      annotations,
      content
    );
    setHighlights(rects);
  }, [annotations, content]);

  useEffect(() => {
    if (annotations.length === 0) {
      setHighlights([]);
      return;
    }

    // Wait for ReactMarkdown to finish rendering
    const timeoutId = setTimeout(recalculate, 100);
    return () => clearTimeout(timeoutId);
  }, [content, annotations, renderKey, recalculate]);

  useEffect(() => {
    if (annotations.length === 0) return;
    const handleResize = (): void => recalculate();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [annotations.length, recalculate]);

  const handleOverlayMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const idx = e.currentTarget.dataset.annotationIndex;
      if (idx !== undefined) {
        onHoverAnnotation?.(parseInt(idx, 10));
      }
    },
    [onHoverAnnotation]
  );

  const handleOverlayMouseLeave = useCallback(() => {
    onHoverAnnotation?.(null);
  }, [onHoverAnnotation]);

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', userSelect: 'text', cursor: 'text' }}
    >
      <div ref={containerRef}>
        <ReactMarkdown
          key={renderKey}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
        >
          {content}
        </ReactMarkdown>
      </div>
      {highlights.map(
        ({ id, top, left, width, height, annotationIndex, isComment }) => (
          <div
            key={id}
            data-annotation-index={annotationIndex}
            onMouseEnter={handleOverlayMouseEnter}
            onMouseLeave={handleOverlayMouseLeave}
            style={{
              position: 'absolute',
              top,
              left,
              width,
              height,
              backgroundColor: isComment
                ? 'rgba(255, 193, 7, 0.3)'
                : 'rgba(244, 67, 54, 0.2)',
              borderBottom: isComment
                ? '2px solid #ffc107'
                : undefined,
              textDecoration: !isComment
                ? 'line-through'
                : undefined,
              pointerEvents: 'auto',
              zIndex: 1,
              cursor: 'pointer',
            }}
          />
        )
      )}
    </div>
  );
});

AnnotatedMarkdownPreview.displayName = 'AnnotatedMarkdownPreview';

export default AnnotatedMarkdownPreview;

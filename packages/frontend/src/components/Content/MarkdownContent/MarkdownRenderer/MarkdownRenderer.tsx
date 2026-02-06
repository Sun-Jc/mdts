import { Box } from '@mui/material';
import React, { useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { rehypeGithubAlerts } from 'rehype-github-alerts';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { AnnotationItem } from '../../../../types/annotations';
import MarkdownCode from './MarkdownCode';
import MarkdownLink from './MarkdownLink';
import PreviewAnnotationOverlay from './PreviewAnnotationOverlay';

import 'rehype-github-alerts/styling/css/index.css';
import 'katex/dist/katex.css';

interface MarkdownRendererProps {
  content: string;
  selectedFilePath: string | null;
  annotations?: AnnotationItem[];
  rawContent?: string;
  showBubbles?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, selectedFilePath, annotations = [], rawContent, showBubbles = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnnotations = annotations.length > 0;

  return (
    <Box sx={{ position: 'relative' }}>
      <Box ref={containerRef} className={'markdown-body'} sx={{ py: 2, px: 0 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeSlug, rehypeKatex, rehypeGithubAlerts]}
          components={{
            a: ({ href, children }) =>
              <MarkdownLink href={href} selectedFilePath={selectedFilePath}>{children}</MarkdownLink>,
            code: ({ inline, className, children, ...props }) => (
              <MarkdownCode inline={inline} className={className} {...props}>
                {children}
              </MarkdownCode>
            ),
            table: ({ children, ...props }) => (
              <div className="table-wrapper">
                <table {...props}>{children}</table>
              </div>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </Box>
      {hasAnnotations && (
        <PreviewAnnotationOverlay
          annotations={annotations}
          content={rawContent || content}
          containerRef={containerRef}
          showBubbles={showBubbles}
        />
      )}
    </Box>
  );
};

export default MarkdownRenderer;

import { Box } from '@mui/material';
import React, { useState, useCallback, useEffect, useRef } from 'react';

interface ResizablePaneProps {
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
}

const ResizablePane: React.FC<ResizablePaneProps> = ({
  children,
  defaultWidth = 300,
  minWidth = 200,
  maxWidth = window.innerWidth * 0.5,
  storageKey = 'resizable_pane_width'
}) => {
  const [width, setWidth] = useState<number>(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = parseInt(stored, 10);
        return Math.max(minWidth, Math.min(maxWidth, parsed));
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(clampedWidth);
    },
    [isResizing, minWidth, maxWidth]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      if (storageKey) {
        localStorage.setItem(storageKey, width.toString());
      }
    }
  }, [isResizing, width, storageKey]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <Box
      ref={paneRef}
      sx={{
        width: `${width}px`,
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '4px',
          height: '100%',
          cursor: 'col-resize',
          backgroundColor: isResizing ? 'primary.main' : 'transparent',
          '&:hover': {
            backgroundColor: 'primary.main',
            opacity: 0.5,
          },
          transition: 'background-color 0.2s',
          zIndex: 100,
        }}
      />
    </Box>
  );
};

export default ResizablePane;

import { Box, useTheme } from '@mui/material';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOutline } from '../../store/slices/outlineSlice';
import { AppDispatch, RootState } from '../../store/store';
import OutlineContent from './OutlineContent/OutlineContent';
import OutlineHeader from './OutlineHeader';

interface OutlineProps {
  filePath: string;
  onItemClick: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Outline: React.FC<OutlineProps> = ({ filePath, onItemClick, isOpen, onToggle }) => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const isResizing = useRef(false);

  const collapsedWidth = 66;
  const minWidth = 220;
  const maxWidth = 520;
  const [outlineWidth, setOutlineWidth] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 300;
    }
    const stored = window.localStorage.getItem('outlineWidth');
    const parsed = stored ? Number(stored) : 300;
    if (!Number.isFinite(parsed)) {
      return 300;
    }
    return Math.min(Math.max(parsed, minWidth), maxWidth);
  });
  const { outline, loading, error } = useSelector((state: RootState) => state.outline);

  useEffect(() => {
    dispatch(fetchOutline(filePath));
  }, [dispatch, filePath]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('outlineWidth', String(outlineWidth));
  }, [outlineWidth]);

  const handleResizeMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing.current) return;
    const delta = event.clientX - resizeStartX.current;
    const nextWidth = Math.min(Math.max(resizeStartWidth.current - delta, minWidth), maxWidth);
    setOutlineWidth(nextWidth);
  }, [minWidth, maxWidth]);

  const handleResizeMouseUp = useCallback(() => {
    if (!isResizing.current) return;
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleResizeMouseMove);
      window.removeEventListener('mouseup', handleResizeMouseUp);
    };
  }, [handleResizeMouseMove, handleResizeMouseUp]);

  return (
    <Box sx={{
      width: isOpen ? outlineWidth : collapsedWidth,
      py: 2,
      background: theme.palette.background.paper,
      borderLeft: '1px solid',
      borderColor: 'divider',
      minHeight: '100%',
      flexShrink: 0,
      position: 'relative',
    }}>
      <OutlineHeader isOpen={isOpen} onToggle={onToggle} />
      {isOpen && (
        <OutlineContent
          outline={outline}
          loading={loading}
          error={error}
          onItemClick={onItemClick}
        />
      )}
      {isOpen && (
        <Box
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize outline"
          onMouseDown={(event) => {
            event.preventDefault();
            isResizing.current = true;
            resizeStartX.current = event.clientX;
            resizeStartWidth.current = outlineWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '6px',
            cursor: 'col-resize',
            zIndex: 2,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          }}
        />
      )}
    </Box>
  );
};

export default Outline;

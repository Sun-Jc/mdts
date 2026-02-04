import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import DirectoryContent from './DirectoryContent/DirectoryContent';
import MarkdownContent from './MarkdownContent/MarkdownContent';
import { Box } from '@mui/material';
import { setScrollPosition } from '../../store/slices/contentSlice';

interface ContentProps {
  onFileSelect: (path: string) => void;
  onDirectorySelect: (path: string) => void;
  scrollToId: string | null;
}

const Content: React.FC<ContentProps> = ({ onFileSelect, onDirectorySelect, scrollToId }) => {
  const dispatch = useDispatch();
  const { currentPath, isDirectory } = useSelector((state: RootState) => state.history);
  const { contentMode } = useSelector((state: RootState) => state.appSetting);
  const { scrollPosition, loading } = useSelector((state: RootState) => state.content);
  const scrollableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollableElement = scrollableRef.current;
    return () => {
      if (scrollableElement) {
        dispatch(setScrollPosition(scrollableElement.scrollTop));
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (!loading && scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollPosition;
    }
  }, [loading, scrollPosition]);

  useEffect(() => {
    if (!scrollToId || loading || !scrollableRef.current) return;

    const target = document.getElementById(scrollToId);
    if (!target) return;

    const container = scrollableRef.current;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextTop = targetRect.top - containerRect.top + container.scrollTop;

    container.scrollTo({ top: nextTop, behavior: 'smooth' });
  }, [scrollToId, loading, currentPath]);

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100%',
        flexGrow: 1,
        minHeight: 0,
        minWidth: 0,
        justifyContent: 'center',
        ...(contentMode === 'full' && { bgcolor: 'background.paper' }),
      }}
    >
      <Box
        ref={scrollableRef}
        className="custom-scrollbar"
        sx={{
          overflowY: 'scroll',
          width: '100%',
        }}
      >
        {currentPath && isDirectory ? (
          <DirectoryContent onFileSelect={onFileSelect} onDirectorySelect={onDirectorySelect} />
        ) : (
          <MarkdownContent onDirectorySelect={onDirectorySelect} />
        )}
      </Box>
    </Box>
  );
};

export default Content;

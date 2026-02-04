import { Box, SelectChangeEvent, useTheme } from '@mui/material';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  expandAllNodes,
  fetchFileTree,
  FileTreeItem,
  setExpandedNodes,
  setSearchQuery,
  setTagFilter,
  setSortOption,
  setSortOrder,
  selectPinnedFileItems,
  togglePinnedPath,
} from '../../store/slices/fileTreeSlice';
import { AppDispatch, RootState } from '../../store/store';
import FileTreeContent from './FileTreeContent/FileTreeContent';
import FileTreeHeader from './FileTreeHeader';
import FileTreeSearch from './FileTreeSearch';
import FileTreeTagFilter from './FileTreeTagFilter';
import PinnedFiles from './PinnedFiles';

interface FileTreeComponentProps {
  onFileSelect: (path: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  selectedFilePath: string | null;
}

const FileTree: React.FC<FileTreeComponentProps> = ({ onFileSelect, isOpen, onToggle }) => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const isResizing = useRef(false);

  const collapsedWidth = 66;
  const minWidth = 220;
  const maxWidth = 520;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    if (typeof window === 'undefined') {
      return 300;
    }
    const stored = window.localStorage.getItem('fileTreeWidth');
    const parsed = stored ? Number(stored) : 300;
    if (!Number.isFinite(parsed)) {
      return 300;
    }
    return Math.min(Math.max(parsed, minWidth), maxWidth);
  });
  const {
    fileTree,
    filteredFileTree,
    loading,
    error,
    searchQuery,
    tagFilter,
    expandedNodes,
    pinnedPaths,
    sortOption,
    sortOrder
  } = useSelector((state: RootState) => state.fileTree);

  useEffect(() => {
    dispatch(fetchFileTree({ sortOption, sortOrder }));
  }, [dispatch, sortOption, sortOrder]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('fileTreeWidth', String(sidebarWidth));
  }, [sidebarWidth]);

  const handleResizeMouseMove = useCallback((event: MouseEvent) => {
    if (!isResizing.current) return;
    const delta = event.clientX - resizeStartX.current;
    const nextWidth = Math.min(Math.max(resizeStartWidth.current + delta, minWidth), maxWidth);
    setSidebarWidth(nextWidth);
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
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(event.target.value));
  }, [dispatch]);

  const handleClearSearch = useCallback(() => {
    dispatch(setSearchQuery(''));
  }, [dispatch]);

  const handleTagFilterChange = useCallback((tags: string[]) => {
    dispatch(setTagFilter(tags));
  }, [dispatch]);

  const handleSortChange = useCallback((event: SelectChangeEvent) => {
    const [nextSortOption, nextSortOrder] = String(event.target.value).split(':');
    if (nextSortOption) {
      dispatch(setSortOption(nextSortOption as 'name' | 'modified' | 'created'));
    }
    if (nextSortOrder) {
      dispatch(setSortOrder(nextSortOrder as 'asc' | 'desc'));
    }
  }, [dispatch]);

  const sortValue = `${sortOption}:${sortOrder}`;

  const allFolderPaths = useMemo(() => {
    const paths: string[] = [];
    const collectFolderPaths = (
      items: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
      parentPath: string = ''
    ) => {
      items.forEach((item) => {
        if ('path' in item) {
          return;
        }
        const key = Object.keys(item)[0];
        const value = (item as { [key: string]: (FileTreeItem | object)[] })[key];
        const currentPath = parentPath ? `${parentPath}/${key}` : key;
        paths.push(currentPath);
        if (Array.isArray(value)) {
          collectFolderPaths(value, currentPath);
        }
      });
    };
    collectFolderPaths(fileTree);
    return paths;
  }, [fileTree]);

  const expandedSet = useMemo(() => new Set(expandedNodes), [expandedNodes]);
  const isAllExpanded = allFolderPaths.length > 0 && allFolderPaths.every((path) => expandedSet.has(path));

  const handleToggleExpandCollapse = useCallback(() => {
    if (isAllExpanded) {
      dispatch(setExpandedNodes([]));
      return;
    }
    dispatch(expandAllNodes(fileTree));
  }, [dispatch, fileTree, isAllExpanded]);

  const handleExpandedItemsChange = useCallback((event: React.SyntheticEvent, itemIds: string[]) => {
    dispatch(setExpandedNodes(itemIds));
  }, [dispatch]);

  const handleTogglePin = useCallback((path: string) => {
    dispatch(togglePinnedPath(path));
  }, [dispatch]);

  useEffect(() => {
    if (!searchQuery && tagFilter.length === 0) return;

    const newExpanded: string[] = [];

    const collectExpandedPaths = (items: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[], parentPath: string = '') => {
      items.forEach(item => {
        if (!('path' in item)) { // It's a folder
          const key = Object.keys(item)[0];
          const value = (item as { [key: string]: (FileTreeItem | object)[] })[key];
          const currentPath = parentPath ? `${parentPath}/${key}` : key;
          if (!newExpanded.includes(currentPath)) {
            newExpanded.push(currentPath);
          }
          if (Array.isArray(value)) {
            collectExpandedPaths(value, currentPath);
          }
        }
      });
    };

    if (filteredFileTree) {
      collectExpandedPaths(filteredFileTree);
    }

    dispatch(setExpandedNodes(newExpanded));
  }, [searchQuery, tagFilter, filteredFileTree, dispatch]);

  const overlay = theme.palette.mode === 'dark' ? 'rgba(16, 16, 16, 0.01)' : 'rgba(192, 192, 192, 0.01)';
  const pinnedItems = selectPinnedFileItems(fileTree, pinnedPaths);
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    const collectTags = (items: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[]) => {
      items.forEach((item) => {
        if ('path' in item) {
          const fileItem = item as FileTreeItem;
          fileItem.tags?.forEach((tag) => tags.add(tag));
          return;
        }
        const key = Object.keys(item)[0];
        const value = item[key];
        if (Array.isArray(value)) {
          collectTags(value as (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[]);
        }
      });
    };
    collectTags(fileTree);
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [fileTree]);

  useEffect(() => {
    if (tagFilter.length === 0) return;
    const available = new Set(availableTags.map((tag) => tag.toLowerCase()));
    const nextTags = tagFilter.filter((tag) => available.has(tag.toLowerCase()));
    if (nextTags.length !== tagFilter.length) {
      dispatch(setTagFilter(nextTags));
    }
  }, [availableTags, dispatch, tagFilter]);

  return (
    <Box sx={{
      width: isOpen ? sidebarWidth : collapsedWidth,
      background: `linear-gradient(135deg, ${overlay} 0%, ${theme.palette.background.paper} 100%)`,
      pt: 2,
      pb: 0,
      borderRight: '1px solid',
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      flexShrink: 0,
      position: 'relative',
    }}>
      <FileTreeHeader
        isOpen={isOpen}
        onToggle={onToggle}
        onToggleExpandCollapse={handleToggleExpandCollapse}
        isAllExpanded={isAllExpanded}
        sortValue={sortValue}
        onSortChange={handleSortChange}
      />
      {isOpen && (
        <FileTreeSearch
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
        />
      )}
      {isOpen && (
        <FileTreeTagFilter
          availableTags={availableTags}
          selectedTags={tagFilter}
          onTagChange={handleTagFilterChange}
        />
      )}
      {isOpen && (
        <PinnedFiles
          items={pinnedItems}
          onFileSelect={onFileSelect}
          onTogglePin={handleTogglePin}
        />
      )}
      {isOpen && (
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <FileTreeContent
            filteredFileTree={filteredFileTree}
            loading={loading}
            error={error}
            expandedNodes={expandedNodes}
            pinnedPaths={pinnedPaths}
            onFileSelect={onFileSelect}
            onExpandedItemsChange={handleExpandedItemsChange}
            onTogglePin={handleTogglePin}
          />
        </Box>
      )}
      {isOpen && (
        <Box
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize file tree"
          onMouseDown={(event) => {
            event.preventDefault();
            isResizing.current = true;
            resizeStartX.current = event.clientX;
            resizeStartWidth.current = sidebarWidth;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
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

export default FileTree;

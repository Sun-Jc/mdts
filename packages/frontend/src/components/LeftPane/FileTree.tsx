import { Box, useTheme } from '@mui/material';
import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ResizablePane from '../ResizablePane/ResizablePane';
import {
  expandAllNodes,
  fetchFileTree,
  FileTreeItem,
  setSortMode,
  SortMode,
  setExpandedNodes,
  setSearchQuery,
  toggleTag
} from '../../store/slices/fileTreeSlice';
import { AppDispatch, RootState } from '../../store/store';
import FileTreeContent from './FileTreeContent/FileTreeContent';
import FileTreeHeader from './FileTreeHeader';
import FileTreeSearch from './FileTreeSearch';
import FileTreeTags from './FileTreeTags';

interface FileTreeComponentProps {
  onFileSelect: (path: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  selectedFilePath: string | null;
}

const FileTree: React.FC<FileTreeComponentProps> = ({ onFileSelect, isOpen, onToggle }) => {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useTheme();
  const {
    fileTree,
    filteredFileTree,
    loading,
    error,
    searchQuery,
    selectedTags,
    expandedNodes,
    sortMode
  } = useSelector((state: RootState) => state.fileTree);

  useEffect(() => {
    dispatch(fetchFileTree());
  }, [dispatch, sortMode]);

  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setSearchQuery(event.target.value));
  }, [dispatch]);

  const handleClearSearch = useCallback(() => {
    dispatch(setSearchQuery(''));
  }, [dispatch]);

  const handleToggleTag = useCallback((tag: string) => {
    dispatch(toggleTag(tag));
  }, [dispatch]);

  const handleSortModeChange = useCallback((mode: SortMode) => {
    dispatch(setSortMode(mode));
  }, [dispatch]);

  const handleExpandAllClick = useCallback(() => {
    dispatch(expandAllNodes(fileTree));
  }, [dispatch, fileTree]);

  const handleCollapseAll = useCallback(() => {
    dispatch(setExpandedNodes([]));
  }, [dispatch]);

  const handleExpandedItemsChange = useCallback((event: React.SyntheticEvent, itemIds: string[]) => {
    dispatch(setExpandedNodes(itemIds));
  }, [dispatch]);

  useEffect(() => {
    if (!searchQuery) return;

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
  }, [searchQuery, filteredFileTree, dispatch]);

  const overlay = theme.palette.mode === 'dark' ? 'rgba(16, 16, 16, 0.01)' : 'rgba(192, 192, 192, 0.01)';

  if (!isOpen) {
    return (
      <Box sx={{
        width: '66px',
        background: `linear-gradient(135deg, ${overlay} 0%, ${theme.palette.background.paper} 100%)`,
        py: 2,
        borderRight: '1px solid',
        borderColor: 'divider',
        minHeight: '100%',
        flexShrink: 0,
      }}>
        <FileTreeHeader
          isOpen={false}
          onToggle={onToggle}
          onExpandAllClick={handleExpandAllClick}
          onCollapseAll={handleCollapseAll}
          sortMode={sortMode}
          onSortModeChange={handleSortModeChange}
        />
      </Box>
    );
  }

  return (
    <ResizablePane
      defaultWidth={300}
      minWidth={200}
      maxWidth={window.innerWidth * 0.5}
      storageKey="mdts_file_tree_width"
    >
      <Box sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${overlay} 0%, ${theme.palette.background.paper} 100%)`,
        py: 2,
        borderRight: '1px solid',
        borderColor: 'divider',
        minHeight: '100%',
      }}>
        <FileTreeHeader
          isOpen={isOpen}
          onToggle={onToggle}
          onExpandAllClick={handleExpandAllClick}
          onCollapseAll={handleCollapseAll}
          sortMode={sortMode}
          onSortModeChange={handleSortModeChange}
        />
        <FileTreeSearch
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
        />
        <FileTreeTags
          fileTree={fileTree}
          selectedTags={selectedTags}
          onToggleTag={handleToggleTag}
        />
        <FileTreeContent
          filteredFileTree={filteredFileTree}
          loading={loading}
          error={error}
          expandedNodes={expandedNodes}
          onFileSelect={onFileSelect}
          onExpandedItemsChange={handleExpandedItemsChange}
        />
      </Box>
    </ResizablePane>
  );
};

export default FileTree;


import { ArticleOutlined, Star, StarOutline } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleStarred } from '../../../store/slices/fileTreeSlice';
import { RootState } from '../../../store/store';
import { FileTreeItem } from './types';

interface FileTreeItemViewProps {
  fileItem: FileTreeItem;
  onFileSelect: (path: string) => void;
  getStatusColor: (status: string) => string;
}

export const FileTreeItemView: React.FC<FileTreeItemViewProps> = ({ fileItem, onFileSelect, getStatusColor }) => {
  const fileName = fileItem.path.split('/').pop();
  const dispatch = useDispatch();
  const starredFiles = useSelector((state: RootState) => state.fileTree.starredFiles);
  const isStarred = starredFiles.includes(fileItem.path);

  const handleClick = useCallback(() => onFileSelect(fileItem.path), [fileItem, onFileSelect]);
  
  const handleStarClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleStarred(fileItem.path));
  }, [dispatch, fileItem.path]);

  return (
    <TreeItem
      key={fileItem.path}
      itemId={fileItem.path}
      label={
        <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
          <ArticleOutlined sx={{ mr: 0, mt: 0.5, fontSize: 'small', flexShrink: 0 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0, flex: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.875rem', 
                color: getStatusColor(fileItem.status),
                wordBreak: 'break-word',
                whiteSpace: 'normal',
                overflowWrap: 'break-word',
                lineHeight: 1.3,
              }}
              title={fileName}
            >
              {fileName}
            </Typography>
            {fileItem.status && fileItem.status !== ' ' && (
              <Typography 
                variant="body2" 
                sx={{ 
                  fontSize: '0.75rem', 
                  color: getStatusColor(fileItem.status),
                  lineHeight: 1.2,
                }}
              >
                {fileItem.status}
              </Typography>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={handleStarClick}
            sx={{ 
              padding: '4px',
              flexShrink: 0,
              color: isStarred ? 'warning.main' : 'inherit',
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            {isStarred ? <Star sx={{ fontSize: '1rem' }} /> : <StarOutline sx={{ fontSize: '1rem' }} />}
          </IconButton>
        </Box>
      }
      onClick={handleClick}
    />
  );
};

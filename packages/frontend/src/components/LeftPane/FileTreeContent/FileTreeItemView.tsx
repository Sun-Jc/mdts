import { ArticleOutlined } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';
import React, { useCallback } from 'react';
import { FileTreeItem } from './types';

interface FileTreeItemViewProps {
  fileItem: FileTreeItem;
  onFileSelect: (path: string) => void;
  getStatusColor: (status: string) => string;
}

export const FileTreeItemView: React.FC<FileTreeItemViewProps> = ({ fileItem, onFileSelect, getStatusColor }) => {
  const fileName = fileItem.path.split('/').pop();
  const handleClick = useCallback(() => onFileSelect(fileItem.path), [fileItem, onFileSelect]);

  return (
    <TreeItem
      key={fileItem.path}
      itemId={fileItem.path}
      label={
        <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
          <ArticleOutlined sx={{ mr: 0, mt: 0.5, fontSize: 'small', flexShrink: 0 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
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
        </Box>
      }
      onClick={handleClick}
    />
  );
};

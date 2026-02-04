import { ArticleOutlined, PushPin, PushPinOutlined } from '@mui/icons-material';
import { Box, IconButton, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';
import React, { useCallback } from 'react';
import { FileTreeItem } from './types';

interface FileTreeItemViewProps {
  fileItem: FileTreeItem;
  onFileSelect: (path: string) => void;
  onTogglePin: (path: string) => void;
  isPinned: boolean;
  getStatusColor: (status: string) => string;
}

export const FileTreeItemView: React.FC<FileTreeItemViewProps> = ({
  fileItem,
  onFileSelect,
  onTogglePin,
  isPinned,
  getStatusColor
}) => {
  const fileName = fileItem.path.split('/').pop();
  const handleClick = useCallback(() => onFileSelect(fileItem.path), [fileItem, onFileSelect]);
  const handlePinClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onTogglePin(fileItem.path);
  }, [fileItem.path, onTogglePin]);

  return (
    <TreeItem
      key={fileItem.path}
      itemId={fileItem.path}
      sx={{
        '& .MuiTreeItem-content': {
          alignItems: 'flex-start',
        },
        '& .MuiTreeItem-label': {
          whiteSpace: 'normal',
        },
      }}
      label={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            width: '100%',
            pr: 0,
            gap: 0.5,
            position: 'relative',
            '& .pin-action': {
              opacity: isPinned ? 1 : 0,
              transition: 'opacity 0.2s ease',
              pointerEvents: isPinned ? 'auto' : 'none',
            },
            '&:hover .pin-action': {
              opacity: 1,
              pointerEvents: 'auto',
            },
          }}
        >
          <ArticleOutlined sx={{ mr: 1, mt: 0.2, fontSize: 'small' }} />
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              color: getStatusColor(fileItem.status),
              flexGrow: 1,
              minWidth: 0,
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              overflowWrap: 'anywhere',
              lineHeight: 1.3,
            }}
          >
            {fileName}
          </Typography>
          <IconButton
            className="pin-action"
            size="small"
            onClick={handlePinClick}
            aria-label={isPinned ? 'unpin file' : 'pin file'}
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              mt: -0.1,
              backgroundColor: 'transparent',
            }}
          >
            {isPinned ? <PushPin sx={{ fontSize: '0.9rem' }} color="primary" /> : <PushPinOutlined sx={{ fontSize: '0.9rem' }} />}
          </IconButton>
        </Box>
      }
      onClick={handleClick}
    />
  );
};

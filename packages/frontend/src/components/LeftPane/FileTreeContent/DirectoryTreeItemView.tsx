import { FolderOutlined } from '@mui/icons-material';
import { Box, Typography } from '@mui/material';
import { TreeItem } from '@mui/x-tree-view';
import React from 'react';

interface DirectoryTreeItemViewProps {
  directoryName: string;
  children: React.ReactNode;
  currentPath: string;
}

export const DirectoryTreeItemView: React.FC<DirectoryTreeItemViewProps> = ({
  directoryName,
  children,
  currentPath
}) => (
  <TreeItem
    key={currentPath}
    itemId={currentPath}
    sx={{
      '& .MuiTreeItem-content': {
        alignItems: 'flex-start',
      },
      '& .MuiTreeItem-label': {
        whiteSpace: 'normal',
      },
    }}
    label={
      <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <FolderOutlined sx={{ mr: 1, mt: 0.2, fontSize: 'small' }} color="primary" />
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            minWidth: 0,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            lineHeight: 1.3,
          }}
        >
          {directoryName}
        </Typography>
      </Box>
    }
  >
    {children}
  </TreeItem>
);

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
    label={
      <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 1 }}>
        <FolderOutlined sx={{ mt: 0.5, fontSize: 'small', color: 'primary', flexShrink: 0 }} />
        <Typography 
          variant="body2" 
          sx={{ 
            fontSize: '0.875rem',
            wordBreak: 'break-word',
            whiteSpace: 'normal',
            overflowWrap: 'break-word',
            lineHeight: 1.3,
          }}
          title={directoryName}
        >
          {directoryName}
        </Typography>
      </Box>
    }
  >
    {children}
  </TreeItem>
);

import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { Box, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip, Typography } from '@mui/material';
import React, { useCallback } from 'react';
import { FileTreeItem } from '../../store/slices/fileTreeSlice';

interface PinnedFilesProps {
  items: FileTreeItem[];
  onFileSelect: (path: string) => void;
  onTogglePin: (path: string) => void;
}

const getFileName = (path: string) => path.split('/').pop() || path;

const getDirectoryLabel = (path: string) => {
  if (!path.includes('/')) return '';
  return path.split('/').slice(0, -1).join('/');
};

const PinnedFiles: React.FC<PinnedFilesProps> = ({ items, onFileSelect, onTogglePin }) => {
  const handlePinToggle = useCallback((event: React.MouseEvent, path: string) => {
    event.stopPropagation();
    onTogglePin(path);
  }, [onTogglePin]);

  if (items.length === 0) return null;

  return (
    <Box px={2} pb={1.5}>
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
        Pinned
      </Typography>
      <List dense disablePadding>
        {items.map((item) => {
          const fileName = getFileName(item.path);
          const directoryLabel = getDirectoryLabel(item.path);
          return (
            <ListItem
              key={item.path}
              disablePadding
              secondaryAction={
                <Tooltip title="Unpin">
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(event) => handlePinToggle(event, item.path)}
                    aria-label="unpin file"
                  >
                    <PushPinOutlinedIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemButton onClick={() => onFileSelect(item.path)} sx={{ borderRadius: 1, py: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <PushPinIcon color="primary" sx={{ fontSize: '1rem' }} />
                </ListItemIcon>
                <ListItemText
                  primary={fileName}
                  secondary={directoryLabel || undefined}
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    sx: {
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    },
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    sx: {
                      whiteSpace: 'normal',
                      wordBreak: 'break-word',
                      overflowWrap: 'anywhere',
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default PinnedFiles;

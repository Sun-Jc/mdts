import { ArticleOutlined, FolderOutlined, PushPin, PushPinOutlined } from '@mui/icons-material';
import { IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FileTreeItem, togglePinnedPath } from '../../../store/slices/fileTreeSlice';
import { RootState } from '../../../store/store';

export interface FileTreeListProps {
  fileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
  handleItemClick: (itemPath: string, isDirectory: boolean) => void;
}

export const FileTreeList: React.FC<FileTreeListProps> = ({ fileTree, handleItemClick }) => {
  return (
    <List sx={{ mr: -2, ml: -2 }}>
      {fileTree.map((item, index) => (
        <FileTreeListItem key={index} item={item} handleItemClick={handleItemClick} />
      ))}
    </List>
  );
};

interface FileTreeListItemProps {
  item: FileTreeItem | { [key: string]: (FileTreeItem | object)[] };
  handleItemClick: (itemPath: string, isDirectory: boolean) => void;
}

const FileTreeListItem: React.FC<FileTreeListItemProps> = ({ item, handleItemClick }) => {
  const dispatch = useDispatch();
  const { currentPath } = useSelector((state: RootState) => state.history);
  const { pinnedPaths } = useSelector((state: RootState) => state.fileTree);

  const isDirectory = !('path' in item);
  const name = isDirectory ? Object.keys(item)[0] : (item as FileTreeItem).path.split('/').pop();
  const itemPath = currentPath === '' ? name : `${currentPath}/${name}`;
  const isPinned = !isDirectory && pinnedPaths.includes(itemPath);

  const handleClick = useCallback(() => {
    handleItemClick(itemPath, isDirectory);
  }, [handleItemClick, itemPath, isDirectory]);

  const handlePinClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dispatch(togglePinnedPath(itemPath));
  }, [dispatch, itemPath]);

  return (
    <ListItem
      key={itemPath}
      disablePadding
      secondaryAction={!isDirectory ? (
        <Tooltip title={isPinned ? 'Unpin' : 'Pin'}>
          <IconButton
            edge="end"
            size="small"
            onClick={handlePinClick}
            aria-label={isPinned ? 'unpin file' : 'pin file'}
          >
            {isPinned ? <PushPin sx={{ fontSize: '1rem' }} color="primary" /> : <PushPinOutlined sx={{ fontSize: '1rem' }} />}
          </IconButton>
        </Tooltip>
      ) : null}
    >
      <ListItemButton onClick={handleClick}>
        <ListItemIcon sx={{ minWidth: '38px' }}>
          {isDirectory ? <FolderOutlined color="primary" /> : <ArticleOutlined />}
        </ListItemIcon>
        <ListItemText primary={name} />
      </ListItemButton>
    </ListItem>
  );
};

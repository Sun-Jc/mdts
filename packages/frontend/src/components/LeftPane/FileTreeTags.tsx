import React, { useMemo } from 'react';
import { Box, Chip } from '@mui/material';
import { FileTreeItem } from '../../store/slices/fileTreeSlice';

interface FileTreeTagsProps {
  fileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
}

const collectAllTags = (
  tree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[]
): string[] => {
  const tagsSet = new Set<string>();

  const traverse = (items: any[]) => {
    items.forEach(item => {
      if ('path' in item && item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => tagsSet.add(tag));
      } else if (typeof item === 'object' && !('path' in item)) {
        const key = Object.keys(item)[0];
        const children = item[key];
        if (Array.isArray(children)) {
          traverse(children);
        }
      }
    });
  };

  traverse(tree);
  return Array.from(tagsSet).sort();
};

const FileTreeTags: React.FC<FileTreeTagsProps> = ({ fileTree, selectedTags, onToggleTag }) => {
  const allTags = useMemo(() => collectAllTags(fileTree), [fileTree]);

  if (allTags.length === 0) {
    return null;
  }

  return (
    <Box sx={{ px: 2, pb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
      {allTags.map((tag) => (
        <Chip
          key={tag}
          label={tag}
          size="small"
          color={selectedTags.includes(tag) ? 'primary' : 'default'}
          onClick={() => onToggleTag(tag)}
          sx={{
            fontSize: '0.75rem',
            height: '24px',
            cursor: 'pointer',
          }}
        />
      ))}
    </Box>
  );
};

export default FileTreeTags;

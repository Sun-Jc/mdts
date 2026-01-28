import React, { useMemo, useState } from 'react';
import { Box, Chip, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
  const [isExpanded, setIsExpanded] = useState(false);
  const allTags = useMemo(() => collectAllTags(fileTree), [fileTree]);

  if (allTags.length === 0) {
    return null;
  }

  const displayTags = isExpanded ? allTags : allTags.filter(tag => selectedTags.includes(tag));
  const hasHiddenTags = !isExpanded && allTags.length > selectedTags.length;

  return (
    <Box sx={{ px: 2, pb: 1 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'flex-start',
        gap: 0.5,
        minHeight: '32px'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexWrap: isExpanded ? 'wrap' : 'nowrap',
          gap: 0.5,
          flex: 1,
          overflow: isExpanded ? 'visible' : 'hidden',
          minWidth: 0
        }}>
          {displayTags.length > 0 ? (
            displayTags.map((tag) => (
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
                  flexShrink: isExpanded ? 1 : 0,
                }}
              />
            ))
          ) : (
            !isExpanded && (
              <Box sx={{ 
                fontSize: '0.75rem', 
                color: 'text.secondary',
                lineHeight: '24px'
              }}>
                No tags selected
              </Box>
            )
          )}
        </Box>
        <IconButton
          size="small"
          onClick={() => setIsExpanded(!isExpanded)}
          sx={{ 
            padding: '4px',
            flexShrink: 0
          }}
          aria-label={isExpanded ? 'collapse tags' : 'expand tags'}
        >
          {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      {hasHiddenTags && !isExpanded && (
        <Box sx={{ 
          fontSize: '0.7rem', 
          color: 'text.secondary',
          mt: 0.5,
          pl: 0.5
        }}>
          +{allTags.length - selectedTags.length} more tags
        </Box>
      )}
    </Box>
  );
};

export default FileTreeTags;

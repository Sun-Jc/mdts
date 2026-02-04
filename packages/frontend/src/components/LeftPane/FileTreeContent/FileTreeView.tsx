import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import React, { useMemo } from 'react';
import { RecursiveTreeItems } from './RecursiveTreeItems';
import { FileTree } from './types';

interface FileTreeViewProps {
  filteredFileTree: FileTree | null;
  expandedNodes: string[];
  pinnedPaths: string[];
  onFileSelect: (path: string) => void;
  onExpandedItemsChange: (event: React.SyntheticEvent, itemIds: string[]) => void;
  onTogglePin: (path: string) => void;
  getStatusColor: (status: string) => string;
}

export const FileTreeView: React.FC<FileTreeViewProps> = ({
  filteredFileTree,
  expandedNodes,
  pinnedPaths,
  onFileSelect,
  onExpandedItemsChange,
  onTogglePin,
  getStatusColor
}) => {
  const pinnedSet = useMemo(() => new Set(pinnedPaths), [pinnedPaths]);

  return (
    <SimpleTreeView
      className="custom-scrollbar"
      defaultCollapseIcon={<ExpandMoreIcon sx={{ fontSize: 18 }} />}
      defaultExpandIcon={<ChevronRightIcon sx={{ fontSize: 18 }} />}
      expandedItems={expandedNodes}
      onExpandedItemsChange={onExpandedItemsChange}
      sx={{
        flexGrow: 1,
        overflowY: 'auto',
        height: '100%',
        pl: 2,
        pr: 0.25,
        pb: 0,
        width: '100%',
        '& .MuiTreeItem-content': {
          pr: 0,
        },
      }}
    >
      <RecursiveTreeItems
        tree={filteredFileTree}
        onFileSelect={onFileSelect}
        onTogglePin={onTogglePin}
        pinnedSet={pinnedSet}
        getStatusColor={getStatusColor}
      />
    </SimpleTreeView>
  );
};

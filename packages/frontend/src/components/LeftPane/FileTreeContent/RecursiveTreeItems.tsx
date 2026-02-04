import React from 'react';
import { DirectoryTreeItemView } from './DirectoryTreeItemView';
import { FileTreeItemView } from './FileTreeItemView';
import { FileTreeItem, FileTree } from './types';

interface RecursiveTreeItemsProps {
  tree: FileTree | null;
  onFileSelect: (path: string) => void;
  onTogglePin: (path: string) => void;
  pinnedSet: Set<string>;
  parentPath?: string;
  getStatusColor: (status: string) => string;
}

export const RecursiveTreeItems: React.FC<RecursiveTreeItemsProps> = ({
  tree,
  onFileSelect,
  onTogglePin,
  pinnedSet,
  parentPath = '',
  getStatusColor
}) => {
  if (!tree) return null;

  const pinnedFiles: FileTreeItem[] = [];
  const directories: { [key: string]: (FileTreeItem | object)[] }[] = [];
  const unpinnedFiles: FileTreeItem[] = [];

  tree.forEach((item) => {
    if ('path' in item) {
      if (pinnedSet.has(item.path)) {
        pinnedFiles.push(item as FileTreeItem);
      } else {
        unpinnedFiles.push(item as FileTreeItem);
      }
    } else {
      directories.push(item as { [key: string]: (FileTreeItem | object)[] });
    }
  });

  const orderedItems: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] = [
    ...pinnedFiles,
    ...directories,
    ...unpinnedFiles,
  ];

  return orderedItems.map((item) => {
    if ('path' in item) {
      return <FileTreeItemView
        key={item.path}
        fileItem={item as FileTreeItem}
        getStatusColor={getStatusColor}
        isPinned={pinnedSet.has(item.path)}
        onTogglePin={onTogglePin}
        onFileSelect={onFileSelect} />;
    } else {
      const key = Object.keys(item)[0];
      const value = item[key];
      const currentPath = parentPath ? `${parentPath}/${key}` : key;
      return (
        <DirectoryTreeItemView key={key} directoryName={key} currentPath={currentPath}>
          {Array.isArray(value) && value.length > 0 && (
            <RecursiveTreeItems
              tree={value}
              parentPath={currentPath}
              getStatusColor={getStatusColor}
              onTogglePin={onTogglePin}
              pinnedSet={pinnedSet}
              onFileSelect={onFileSelect} />
          )}
        </DirectoryTreeItemView>
      );
    }
  });
};

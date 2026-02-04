export interface FileTreeItem {
  path: string;
  status: string;
  tags?: string[];
}

export type FileTree = (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchData } from '../../api';

export interface FileTreeItem {
  path: string;
  status: string;
  tags?: string[];
  mtime?: number;
  ctime?: number;
}

export type SortMode = 'name' | 'mtime' | 'ctime' | 'mtime_desc' | 'ctime_desc';

interface FileTreeState {
  fileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
  filteredFileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
  searchQuery: string;
  selectedTags: string[];
  expandedNodes: string[];
  mountedDirectoryPath: string;
  sortMode: SortMode;
  starredFiles: string[];
  loading: boolean;
  error: string | null;
}

const initialState: FileTreeState = {
  fileTree: [],
  filteredFileTree: [],
  searchQuery: '',
  selectedTags: [],
  expandedNodes: [],
  mountedDirectoryPath: '',
  sortMode: 'name',
  starredFiles: [],
  loading: true,
  error: null,
};

const LOCAL_STORAGE_KEY_PREFIX = 'mdts_expanded_nodes_';
const LOCAL_STORAGE_RECENT_PATHS_KEY = 'mdts_recent_paths';
const LOCAL_STORAGE_SORT_MODE_KEY = 'mdts_sort_mode';
const LOCAL_STORAGE_STARRED_FILES_KEY = 'mdts_starred_files';
const MAX_RECENT_PATHS = 10;

const saveExpandedNodes = (path: string, nodes: string[]) => {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY_PREFIX}${path}`,
      JSON.stringify(nodes)
    );
    let recentPaths: string[] = JSON.parse(
      localStorage.getItem(LOCAL_STORAGE_RECENT_PATHS_KEY) || '[]'
    );
    recentPaths = recentPaths.filter(p => p !== path);
    recentPaths.unshift(path);
    if (recentPaths.length > MAX_RECENT_PATHS) {
      const oldPath = recentPaths.pop();
      if (oldPath) {
        localStorage.removeItem(`${LOCAL_STORAGE_KEY_PREFIX}${oldPath}`);
      }
    }
    localStorage.setItem(
      LOCAL_STORAGE_RECENT_PATHS_KEY,
      JSON.stringify(recentPaths)
    );
  } catch (e) {
    console.error('Failed to save expanded nodes to local storage', e);
  }
};

const loadExpandedNodes = (path: string): string[] => {
  try {
    const storedNodes = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${path}`);
    return storedNodes ? JSON.parse(storedNodes) : [];
  } catch (e) {
    console.error('Failed to load expanded nodes from local storage', e);
    return [];
  }
};

const saveSortMode = (mode: SortMode) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_SORT_MODE_KEY, mode);
  } catch (e) {
    console.error('Failed to save sort mode to local storage', e);
  }
};

const loadSortMode = (): SortMode => {
  try {
    const storedMode = localStorage.getItem(LOCAL_STORAGE_SORT_MODE_KEY);
    return (storedMode as SortMode) || 'name';
  } catch (e) {
    console.error('Failed to load sort mode from local storage', e);
    return 'name';
  }
};

const saveStarredFiles = (files: string[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_STARRED_FILES_KEY, JSON.stringify(files));
  } catch (e) {
    console.error('Failed to save starred files to local storage', e);
  }
};

const loadStarredFiles = (): string[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_STARRED_FILES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load starred files from local storage', e);
    return [];
  }
};

const getFilePathsFromTree = (
  tree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
): string[] => {
  const paths: string[] = [];
  
  const traverse = (items: any[]) => {
    items.forEach(item => {
      if ('path' in item) {
        paths.push((item as FileTreeItem).path);
      } else {
        const key = Object.keys(item)[0];
        paths.push(key);
        const children = item[key];
        if (Array.isArray(children)) {
          traverse(children);
        }
      }
    });
  };
  
  traverse(tree);
  return paths;
};

const cleanupStarredFiles = (starred: string[], existingPaths: string[]): string[] => {
  const pathSet = new Set(existingPaths);
  return starred.filter(starredPath => pathSet.has(starredPath));
};

const filterTree = (
  tree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
  searchQuery: string,
  selectedTags: string[]
): (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] => {
  if (!searchQuery && selectedTags.length === 0) return tree;

  return tree
    .reduce((acc: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[], item) => {
      if ('path' in item) {
        const fileItem = item as FileTreeItem;
        const fileName = fileItem.path.split('/').pop() || '';
        
        // Apply search query filter
        const matchesSearch = !searchQuery || fileName.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Apply tags filter (file matches if it has ANY of the selected tags)
        const matchesTags = selectedTags.length === 0 || 
          (fileItem.tags && fileItem.tags.some(tag => selectedTags.includes(tag)));
        
        return matchesSearch && matchesTags
          ? [...acc, item]
          : acc;
      } else {
        const key = Object.keys(item)[0];
        const value = item[key];

        const children = Array.isArray(value)
          ? filterTree(value, searchQuery, selectedTags)
          : [];

        return children.length > 0
          ? [...acc, { [key]: children } as { [key: string]: (FileTreeItem | object)[] }]
          : acc;
      }
    }, []);
};

export const fetchFileTree = createAsyncThunk(
  'fileTree/fetchFileTree',
  async (_, { getState }) => {
    const state = getState() as any;
    const sortMode = state.fileTree?.sortMode || 'name';
    const data = await fetchData<{
      fileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
      mountedDirectoryPath: string;
    }>(`/api/filetree?sort=${sortMode}`, 'json');
    return { fileTree: data?.fileTree || [], mountedDirectoryPath: data?.mountedDirectoryPath };
  }
);

const fileTreeSlice = createSlice({
  name: 'fileTree',
  initialState,
  reducers: {
    setSearchQuery: (state, action: { payload: string }) => {
      state.searchQuery = action.payload;
      state.filteredFileTree = filterTree(state.fileTree, action.payload, state.selectedTags);
    },
    setSelectedTags: (state, action: { payload: string[] }) => {
      state.selectedTags = action.payload;
      state.filteredFileTree = filterTree(state.fileTree, state.searchQuery, action.payload);
    },
    toggleTag: (state, action: { payload: string }) => {
      const tag = action.payload;
      const index = state.selectedTags.indexOf(tag);
      if (index > -1) {
        state.selectedTags.splice(index, 1);
      } else {
        state.selectedTags.push(tag);
      }
      state.filteredFileTree = filterTree(state.fileTree, state.searchQuery, state.selectedTags);
    },
    setSortMode: (state, action: { payload: SortMode }) => {
      state.sortMode = action.payload;
      saveSortMode(action.payload);
    },
    toggleStarred: (state, action: { payload: string }) => {
      const filePath = action.payload;
      const index = state.starredFiles.indexOf(filePath);
      if (index > -1) {
        state.starredFiles.splice(index, 1);
      } else {
        state.starredFiles.push(filePath);
      }
      saveStarredFiles(state.starredFiles);
    },
    toggleNode: (state, action: { payload: string }) => {
      const path = action.payload;
      if (state.expandedNodes.includes(path)) {
        state.expandedNodes = state.expandedNodes.filter((nodePath) => nodePath !== path);
      } else {
        state.expandedNodes.push(path);
      }
      saveExpandedNodes(state.mountedDirectoryPath, state.expandedNodes);
    },
    setExpandedNodes: (state, action: { payload: string[] }) => {
      state.expandedNodes = action.payload;
      saveExpandedNodes(state.mountedDirectoryPath, state.expandedNodes);
    },
    expandAllNodes: (
      state, action: { payload: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] | null }
    ) => {
      const allItemIds: string[] = [];
      const collectIds = (items: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[], parentPath: string = '') => {
        items.forEach(item => {
          if (!('path' in item)) {
            const key = Object.keys(item)[0];
            const currentPath = parentPath ? `${parentPath}/${key}` : key;
            allItemIds.push(currentPath);
            collectIds(item[key] as (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[], currentPath);
          }
        });
      };
      if (action.payload) {
        collectIds(action.payload);
      }
      state.expandedNodes = allItemIds;
      saveExpandedNodes(state.mountedDirectoryPath, state.expandedNodes);
    },
    setMountedDirectoryPath: (state, action: { payload: string }) => {
      state.mountedDirectoryPath = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFileTree.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFileTree.fulfilled, (state, action) => {
        state.loading = false;
        state.fileTree = action.payload.fileTree;
        state.mountedDirectoryPath = action.payload.mountedDirectoryPath;
        state.filteredFileTree = filterTree(action.payload.fileTree, state.searchQuery, state.selectedTags);
        state.expandedNodes = loadExpandedNodes(action.payload.mountedDirectoryPath);
        state.sortMode = loadSortMode();
        
        // Load and cleanup starred files
        let starredFiles = loadStarredFiles();
        const fileTreePaths = getFilePathsFromTree(action.payload.fileTree);
        const cleanedStarred = cleanupStarredFiles(starredFiles, fileTreePaths);
        if (cleanedStarred.length !== starredFiles.length) {
          saveStarredFiles(cleanedStarred);
        }
        state.starredFiles = cleanedStarred;
      })
      .addCase(fetchFileTree.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch file tree';
      });
  },
});

export const selectFilteredFileTree = (
  fullFileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
  targetPath: string
): (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] => {
  if (targetPath === '') {
    const result: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] = [];
    fullFileTree.forEach(item => {
      if ('path' in item) {
        result.push({
          path: (item as FileTreeItem).path.split('/').pop() || (item as FileTreeItem).path,
          status: (item as FileTreeItem).status,
        });
      } else {
        const key = Object.keys(item)[0];
        const newObject: { [key: string]: (FileTreeItem | object)[] } = {};
        newObject[key.split('/').pop() || key] = item[key];
        result.push(newObject);
      }
    });
    return result;
  }

  const findChildren = (
    currentTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
    pathSegments: string[],
    currentSegmentIndex: number
  ): (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] | null => {
    if (currentSegmentIndex === pathSegments.length) {
      return currentTree;
    }

    const segment = pathSegments[currentSegmentIndex];

    for (const item of currentTree) {
      if (!('path' in item)) {
        const key = Object.keys(item)[0];
        const itemSegments = key.split('/');
        if (itemSegments[itemSegments.length - 1] === segment) {
          const children = item[key];
          if (Array.isArray(children)) {
            return findChildren(children, pathSegments, currentSegmentIndex + 1);
          }
        }
      }
    }
    return null;
  };

  const pathSegments = targetPath.split('/').filter(s => s !== '');
  const children = findChildren(fullFileTree, pathSegments, 0);

  if (children) {
    const result: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] = [];
    children.forEach(item => {
      if ('path' in item) {
        result.push({ path: (item as FileTreeItem).path.split('/').pop() || (item as FileTreeItem).path, status: (item as FileTreeItem).status });
      } else {
        const key = Object.keys(item)[0];
        const newObject: { [key: string]: (FileTreeItem | object)[] } = {};
        newObject[key.split('/').pop() || key] = item[key];
        result.push(newObject);
      }
    });
    return result;
  }

  return [];
};

export const {
  setSearchQuery,
  setSelectedTags,
  toggleTag,
  setSortMode,
  toggleStarred,
  toggleNode,
  setExpandedNodes,
  expandAllNodes,
  setMountedDirectoryPath,
} = fileTreeSlice.actions;

export default fileTreeSlice.reducer;

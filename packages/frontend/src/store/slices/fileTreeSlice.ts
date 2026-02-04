import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchData } from '../../api';

export interface FileTreeItem {
  path: string;
  status: string;
  tags?: string[];
}

interface FileTreeState {
  fileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
  filteredFileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
  searchQuery: string;
  tagFilter: string[];
  expandedNodes: string[];
  pinnedPaths: string[];
  mountedDirectoryPath: string;
  sortOption: FileTreeSortOption;
  sortOrder: FileTreeSortOrder;
  loading: boolean;
  error: string | null;
}

export type FileTreeSortOption = 'name' | 'modified' | 'created';
export type FileTreeSortOrder = 'asc' | 'desc';

const LOCAL_STORAGE_KEY_PREFIX = 'mdts_expanded_nodes_';
const LOCAL_STORAGE_RECENT_PATHS_KEY = 'mdts_recent_paths';
const LOCAL_STORAGE_SORT_OPTION_KEY = 'mdts_filetree_sort_option';
const LOCAL_STORAGE_SORT_ORDER_KEY = 'mdts_filetree_sort_order';
const LOCAL_STORAGE_PINNED_PATHS_KEY_PREFIX = 'mdts_pinned_paths_';
const MAX_RECENT_PATHS = 10;

const getInitialSortOption = (): FileTreeSortOption => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_SORT_OPTION_KEY);
    if (stored === 'name' || stored === 'modified' || stored === 'created') {
      return stored;
    }
  } catch (e) {
    console.error('Failed to load sort option from local storage', e);
  }
  return 'name';
};

const getInitialSortOrder = (): FileTreeSortOrder => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_SORT_ORDER_KEY);
    if (stored === 'asc' || stored === 'desc') {
      return stored;
    }
  } catch (e) {
    console.error('Failed to load sort order from local storage', e);
  }
  return 'asc';
};

const initialState: FileTreeState = {
  fileTree: [],
  filteredFileTree: [],
  searchQuery: '',
  tagFilter: [],
  expandedNodes: [],
  pinnedPaths: [],
  mountedDirectoryPath: '',
  sortOption: getInitialSortOption(),
  sortOrder: getInitialSortOrder(),
  loading: true,
  error: null,
};

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

const savePinnedPaths = (path: string, pinnedPaths: string[]) => {
  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_PINNED_PATHS_KEY_PREFIX}${path}`,
      JSON.stringify(pinnedPaths)
    );
  } catch (e) {
    console.error('Failed to save pinned paths to local storage', e);
  }
};

const loadPinnedPaths = (path: string): string[] => {
  try {
    const stored = localStorage.getItem(`${LOCAL_STORAGE_PINNED_PATHS_KEY_PREFIX}${path}`);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load pinned paths from local storage', e);
    return [];
  }
};

const collectFileItems = (
  tree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
  items: FileTreeItem[] = []
): FileTreeItem[] => {
  tree.forEach((item) => {
    if ('path' in item) {
      items.push(item as FileTreeItem);
      return;
    }
    const key = Object.keys(item)[0];
    const value = item[key];
    if (Array.isArray(value)) {
      collectFileItems(value as (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[], items);
    }
  });
  return items;
};

const filterPinnedPaths = (
  tree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
  pinnedPaths: string[]
): string[] => {
  if (pinnedPaths.length === 0) return [];
  const existingPaths = new Set(collectFileItems(tree).map((item) => item.path));
  return pinnedPaths.filter((path) => existingPaths.has(path));
};

const parseRegexLiteral = (value: string, defaultFlags: string): RegExp | null => {
  if (!value.startsWith('/')) return null;
  const lastSlash = value.lastIndexOf('/');
  if (lastSlash <= 0) return null;
  const pattern = value.slice(1, lastSlash);
  const flags = value.slice(lastSlash + 1) || defaultFlags;
  try {
    return new RegExp(pattern, flags);
  } catch (error) {
    console.warn('Invalid regex search pattern', error);
    return null;
  }
};

const buildSearchRegex = (query: string): RegExp | null => {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const prefixMatch = trimmed.match(/^re:(.*)$/i);
  if (prefixMatch) {
    const raw = prefixMatch[1].trim();
    if (!raw) return null;
    const literal = parseRegexLiteral(raw, '');
    if (literal) return literal;
    try {
      return new RegExp(raw, 'i');
    } catch (error) {
      console.warn('Invalid regex search pattern', error);
      return null;
    }
  }

  return parseRegexLiteral(trimmed, '');
};

const testRegex = (regex: RegExp, value: string): boolean => {
  if (regex.global || regex.sticky) {
    regex.lastIndex = 0;
  }
  return regex.test(value);
};

const filterTree = (
  tree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
  searchQuery: string,
  tagFilter: string[]
): (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] => {
  const trimmedQuery = searchQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const searchRegex = buildSearchRegex(trimmedQuery);
  const normalizedTags = tagFilter.map((tag) => tag.trim().toLowerCase()).filter(Boolean);
  const tagSet = new Set(normalizedTags);

  if (!trimmedQuery && tagSet.size === 0) return tree;

  const matchesTags = (tags?: string[]): boolean => {
    if (tagSet.size === 0) return true;
    if (!tags || tags.length === 0) return false;
    return tags.some((tag) => tagSet.has(tag.toLowerCase()));
  };

  const filterRecursive = (
    items: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[]
  ): (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[] => {
    return items.reduce((acc: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[], item) => {
      if ('path' in item) {
        const fileItem = item as FileTreeItem;
        const fileName = fileItem.path.split('/').pop() || '';
        const matchesSearch = !trimmedQuery
          || (searchRegex
            ? testRegex(searchRegex, fileName)
            : fileName.toLowerCase().includes(normalizedQuery));
        const matchesTag = matchesTags(fileItem.tags);
        return matchesSearch && matchesTag
          ? [...acc, item]
          : acc;
      } else {
        const key = Object.keys(item)[0];
        const value = item[key];

        const children = Array.isArray(value)
          ? filterRecursive(value)
          : [];

        return children.length > 0
          ? [...acc, { [key]: children } as { [key: string]: (FileTreeItem | object)[] }]
          : acc;
      }
    }, []);
  };

  return filterRecursive(tree);
};

export const fetchFileTree = createAsyncThunk(
  'fileTree/fetchFileTree',
  async (params: { sortOption?: FileTreeSortOption; sortOrder?: FileTreeSortOrder } | undefined) => {
    const sortOption = params?.sortOption;
    const sortOrder = params?.sortOrder;
    const query = new URLSearchParams();
    if (sortOption) query.set('sort', sortOption);
    if (sortOrder) query.set('order', sortOrder);
    const queryString = query.toString();
    const data = await fetchData<{
      fileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[];
      mountedDirectoryPath: string;
    }>(`/api/filetree${queryString ? `?${queryString}` : ''}`, 'json');
    return { fileTree: data?.fileTree || [], mountedDirectoryPath: data?.mountedDirectoryPath };
  }
);

const fileTreeSlice = createSlice({
  name: 'fileTree',
  initialState,
  reducers: {
    setSearchQuery: (state, action: { payload: string }) => {
      state.searchQuery = action.payload;
      state.filteredFileTree = filterTree(state.fileTree, action.payload, state.tagFilter);
    },
    setTagFilter: (state, action: { payload: string[] }) => {
      state.tagFilter = action.payload;
      state.filteredFileTree = filterTree(state.fileTree, state.searchQuery, action.payload);
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
    togglePinnedPath: (state, action: { payload: string }) => {
      const path = action.payload;
      if (state.pinnedPaths.includes(path)) {
        state.pinnedPaths = state.pinnedPaths.filter((pinnedPath) => pinnedPath !== path);
      } else {
        state.pinnedPaths = [path, ...state.pinnedPaths.filter((pinnedPath) => pinnedPath !== path)];
      }
      savePinnedPaths(state.mountedDirectoryPath, state.pinnedPaths);
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
    setSortOption: (state, action: { payload: FileTreeSortOption }) => {
      state.sortOption = action.payload;
      try {
        localStorage.setItem(LOCAL_STORAGE_SORT_OPTION_KEY, action.payload);
      } catch (e) {
        console.error('Failed to save sort option to local storage', e);
      }
    },
    setSortOrder: (state, action: { payload: FileTreeSortOrder }) => {
      state.sortOrder = action.payload;
      try {
        localStorage.setItem(LOCAL_STORAGE_SORT_ORDER_KEY, action.payload);
      } catch (e) {
        console.error('Failed to save sort order to local storage', e);
      }
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
        state.filteredFileTree = filterTree(action.payload.fileTree, state.searchQuery, state.tagFilter);
        state.expandedNodes = loadExpandedNodes(action.payload.mountedDirectoryPath);
        const loadedPinned = loadPinnedPaths(action.payload.mountedDirectoryPath);
        const validPinned = filterPinnedPaths(action.payload.fileTree, loadedPinned);
        state.pinnedPaths = validPinned;
        if (validPinned.length !== loadedPinned.length) {
          savePinnedPaths(action.payload.mountedDirectoryPath, validPinned);
        }
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
  setTagFilter,
  toggleNode,
  setExpandedNodes,
  togglePinnedPath,
  expandAllNodes,
  setMountedDirectoryPath,
  setSortOption,
  setSortOrder,
} = fileTreeSlice.actions;

export const selectPinnedFileItems = (
  fullFileTree: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[],
  pinnedPaths: string[]
): FileTreeItem[] => {
  if (pinnedPaths.length === 0) return [];
  const items = collectFileItems(fullFileTree);
  const itemMap = new Map(items.map((item) => [item.path, item]));
  return pinnedPaths
    .map((path) => itemMap.get(path))
    .filter((item): item is FileTreeItem => Boolean(item));
};

export default fileTreeSlice.reducer;

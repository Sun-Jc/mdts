import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateFrontmatterTags } from '../../../api';
import { fetchContent } from '../../../store/slices/contentSlice';
import { fetchFileTree, FileTreeItem } from '../../../store/slices/fileTreeSlice';
import { AppDispatch, RootState } from '../../../store/store';
import MarkdownRenderer from './MarkdownRenderer/MarkdownRenderer';

interface MarkdownContentViewProps {
  loading: boolean;
  viewMode: 'preview' | 'frontmatter' | 'raw';
  content: string | null;
  markdownContent: string;
  frontmatter: Record<string, unknown>;
}

const formatFrontmatterValue = (value: unknown): string => {
  if (value instanceof Date) {
    const iso = value.toISOString();
    const dateOnly = iso.slice(0, 10);
    const time = iso.slice(11, 19);
    if (time === '00:00:00') {
      return dateOnly;
    }
    return iso.replace('.000Z', 'Z');
  }
  return String(value);
};

const parseTagsValue = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return inner.split(',');
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',');
    }
    return [trimmed];
  }
  return [];
};

const normalizeTags = (tags: string[]): string[] => {
  const expanded = tags.flatMap((tag) => String(tag).split(','));
  const cleaned = expanded
    .map((tag) => tag.trim().replace(/^['"](.+)['"]$/, '$1').trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
};

const MarkdownContentView: React.FC<MarkdownContentViewProps> = (
  { loading, viewMode, markdownContent, frontmatter, content }
) => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentPath } = useSelector((state: RootState) => state.history);
  const { fileTree, sortOption, sortOrder } = useSelector((state: RootState) => state.fileTree);
  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    const collectTags = (items: (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[]) => {
      items.forEach((item) => {
        if ('path' in item) {
          const fileItem = item as FileTreeItem;
          fileItem.tags?.forEach((tag) => tags.add(tag));
          return;
        }
        const key = Object.keys(item)[0];
        const value = item[key];
        if (Array.isArray(value)) {
          collectTags(value as (FileTreeItem | { [key: string]: (FileTreeItem | object)[] })[]);
        }
      });
    };
    collectTags(fileTree);
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [fileTree]);
  const originalTags = useMemo(
    () => normalizeTags(parseTagsValue(frontmatter.tags)),
    [frontmatter]
  );
  const [tagDraft, setTagDraft] = useState<string[]>(originalTags);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setTagDraft(originalTags);
  }, [originalTags]);

  useEffect(() => {
    if (!saveSuccess) return;
    const timer = window.setTimeout(() => setSaveSuccess(false), 1500);
    return () => window.clearTimeout(timer);
  }, [saveSuccess]);

  const hasTagChanges = useMemo(() => {
    return normalizeTags(tagDraft).join('|') !== originalTags.join('|');
  }, [originalTags, tagDraft]);

  const handleTagChange = useCallback((_event: React.SyntheticEvent, value: string[]) => {
    setTagDraft(normalizeTags(value.map((item) => String(item))));
  }, []);

  const handleSaveTags = useCallback(async () => {
    if (!currentPath) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const nextTags = normalizeTags(tagDraft);
      await updateFrontmatterTags(currentPath, nextTags);
      setTagDraft(nextTags);
      setSaveSuccess(true);
      dispatch(fetchContent(currentPath));
      dispatch(fetchFileTree({ sortOption, sortOrder }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update tags';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [currentPath, dispatch, sortOption, sortOrder, tagDraft]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }

  switch (viewMode) {
    case 'preview':
      return <MarkdownRenderer content={markdownContent} selectedFilePath={currentPath} />;
    case 'frontmatter': {
      const frontmatterEntries = Object.entries(frontmatter)
        .filter(([key]) => key.toLowerCase() !== 'tags');

      return (
        <Box sx={{ my: 4 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Tags
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            >
              <Autocomplete<string, true, false, true>
                multiple
                freeSolo
                size="small"
                options={availableTags}
                value={tagDraft}
                onChange={handleTagChange}
                disabled={!currentPath || isSaving}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option}
                      label={option}
                      size="small"
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={currentPath ? 'Add tags...' : 'Open a file to edit tags'}
                    inputProps={{
                      ...params.inputProps,
                      'aria-label': 'edit tags',
                    }}
                  />
                )}
                sx={{ flex: 1 }}
              />
              <Button
                size="small"
                variant="contained"
                onClick={handleSaveTags}
                disabled={!currentPath || !hasTagChanges || isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </Stack>
            {saveError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                {saveError}
              </Typography>
            )}
            {saveSuccess && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                Tags saved.
              </Typography>
            )}
          </Box>
          <List sx={{ p: 0 }}>
            {frontmatterEntries.map(([key, value]) => (
              <ListItem key={key} sx={{ px: 0, py: 1 }}>
                <ListItemText primary={key} secondary={formatFrontmatterValue(value)} />
              </ListItem>
            ))}
          </List>
        </Box>
      );
    }
    case 'raw':
      return (
        <MarkdownRenderer content={['`````markdown', content, '``````'].join('\n')} selectedFilePath={currentPath} />
      );
    default:
      return null;
  }
};

export default MarkdownContentView;

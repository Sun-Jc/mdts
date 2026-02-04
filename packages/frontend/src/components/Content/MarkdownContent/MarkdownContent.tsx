import { ArticleOutlined } from '@mui/icons-material';
import { Box, Chip, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFrontmatter } from '../../../hooks/useFrontmatter';
import { useViewMode } from '../../../hooks/useViewMode';
import { fetchContent } from '../../../store/slices/contentSlice';
import { AppDispatch, RootState } from '../../../store/store';
import ErrorView from '../../ErrorView';
import BreadCrumb from '../BreadCrumb';
import MarkdownContentTabs from './MarkdownContentTabs';
import MarkdownContentView from './MarkdownContentView';

interface MarkdownContentProps {
  onDirectorySelect?: (directoryPath: string) => void;
}

const parseDateValue = (value: unknown): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const formatDateValue = (value: unknown, includeTime: boolean): string | null => {
  if (value === null || value === undefined) return null;
  const parsed = parseDateValue(value);
  if (parsed) {
    if (includeTime) {
      return new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(parsed);
    }
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(parsed);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  return null;
};

const MarkdownContent: React.FC<MarkdownContentProps> = ({ onDirectorySelect }) => {
  const dispatch = useDispatch<AppDispatch>();

  const { currentPath } = useSelector((state: RootState) => state.history);
  const { contentMode } = useSelector((state: RootState) => state.appSetting);
  const { content, loading: contentLoading, error, lastModified } = useSelector((state: RootState) => state.content);
  const { loading: fileTreeLoading } = useSelector((state: RootState) => state.fileTree);
  const { fontFamily } = useSelector((state: RootState) => state.config);

  const { frontmatter, markdownContent } = useFrontmatter(content);
  const viewMode = useViewMode();
  const loading = contentLoading || fileTreeLoading;
  const frontmatterDate = formatDateValue(frontmatter.date ?? frontmatter.Date, false);
  const updateTime = formatDateValue(lastModified, true);
  const hasMetadata = Boolean(frontmatterDate || updateTime);

  useEffect(() => {
    dispatch(fetchContent(currentPath));
  }, [dispatch, currentPath]);

  const displayFileName = frontmatter.title
    ? String(frontmatter.title)
    : currentPath
      ? currentPath.split('/').pop()
      : loading
        ? ''
        : '🎉 Welcome to mdts!';

  const hasFrontmatter = Object.keys(frontmatter).length > 0;

  if (error) {
    return <ErrorView error={error} />;
  }

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100%',
        m: 0,
        p: 4,
        bgcolor: 'background.paper',
        ...(contentMode === 'compact' && {
          px: { xs: 3, md: 5 },
        })
      }}
    >
      <BreadCrumb onDirectorySelect={onDirectorySelect} />
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <ArticleOutlined sx={{ mr: 1, fontSize: 22 }} />
        <Typography
          variant="subtitle1"
          gutterBottom
          sx={{ mb: 0, fontSize: '1.4rem', fontWeight: 600 }}
        >
          {displayFileName}
        </Typography>
      </Box>
      {hasMetadata && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2, color: 'text.secondary' }}>
          {updateTime && (
            <Typography variant="body2">Update: {updateTime}</Typography>
          )}
          {frontmatterDate && (
            <Typography variant="body2">Date: {frontmatterDate}</Typography>
          )}
        </Box>
      )}
      {frontmatter.tags && Array.isArray(frontmatter.tags) && frontmatter.tags.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {frontmatter.tags.map((tag) => (
            <Chip key={tag} label={tag} size='small' />
          ))}
        </Box>
      )}
      {frontmatter.categories && Array.isArray(frontmatter.categories) && frontmatter.categories.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {frontmatter.categories.map((category) => (
            <Chip key={category} label={category} size='small' />
          ))}
        </Box>
      )}
      <MarkdownContentTabs viewMode={viewMode} hasFrontmatter={hasFrontmatter} />
      <Box sx={{ fontFamily: fontFamily }}>
        <MarkdownContentView
          loading={loading}
          viewMode={viewMode}
          content={content}
          frontmatter={frontmatter}
          markdownContent={markdownContent}
        />
      </Box>
    </Box>
  );
};

export default MarkdownContent;

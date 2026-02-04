import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  InputAdornment,
  List,
  ListItemButton,
  TextField,
  Typography
} from '@mui/material';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface SearchMatch {
  line: number;
  preview: string;
}

interface SearchResult {
  path: string;
  matches: SearchMatch[];
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  truncated: boolean;
}

interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  onFileSelect: (path: string) => void;
}

const DEBOUNCE_MS = 200;
const PREVIEW_MAX_LENGTH = 160;

const SearchDialog: React.FC<SearchDialogProps> = ({ open, onClose, onFileSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const focusInput = () => inputRef.current?.focus();
    focusInput();
    const timeoutId = window.setTimeout(focusInput, 0);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setTruncated(false);
      setLoading(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setTruncated(false);
      setLoading(false);
      setError(null);
      controllerRef.current?.abort();
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Search failed: ${response.status}`);
        }
        const data = await response.json() as SearchResponse;
        setResults(data.results || []);
        setTruncated(Boolean(data.truncated));
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Search failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [query, open]);

  const handleSelect = (path: string) => {
    onFileSelect(path);
    onClose();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && results.length > 0) {
      event.preventDefault();
      handleSelect(results[0].path);
    }
  };

  const highlightParts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (text: string) => {
      if (!normalizedQuery) return [text];

      const lowerText = text.toLowerCase();
      const segments: React.ReactNode[] = [];
      let start = 0;
      let index = lowerText.indexOf(normalizedQuery);

      while (index !== -1) {
        if (index > start) {
          segments.push(text.slice(start, index));
        }
        segments.push(
          <Box
            component="span"
            key={`match-${index}`}
            sx={{ backgroundColor: 'action.selected', borderRadius: 0.5, px: 0.25 }}
          >
            {text.slice(index, index + normalizedQuery.length)}
          </Box>
        );
        start = index + normalizedQuery.length;
        index = lowerText.indexOf(normalizedQuery, start);
      }

      if (start < text.length) {
        segments.push(text.slice(start));
      }

      return segments;
    };
  }, [query]);

  const truncatePreview = (preview: string) => {
    if (preview.length <= PREVIEW_MAX_LENGTH) return preview;
    return `${preview.slice(0, PREVIEW_MAX_LENGTH)}...`;
  };

  const showEmptyState = Boolean(query.trim()) && !loading && results.length === 0 && !error;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Full-text search</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <TextField
          fullWidth
          placeholder="Search all markdown files..."
          size="small"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          inputRef={inputRef}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Box sx={{ mt: 2, maxHeight: '60vh', overflowY: 'auto' }} className="custom-scrollbar">
          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2">Searching...</Typography>
            </Box>
          )}
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          {!query.trim() && !loading && !error && (
            <Typography variant="body2" color="text.secondary">
              Type to search across all markdown files.
            </Typography>
          )}
          {showEmptyState && (
            <Typography variant="body2" color="text.secondary">
              No results found.
            </Typography>
          )}
          {results.length > 0 && (
            <List disablePadding>
              {results.map((result, index) => (
                <Box key={result.path} sx={{ mb: 1 }}>
                  <ListItemButton
                    onClick={() => handleSelect(result.path)}
                    sx={{ borderRadius: 1, px: 1 }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {result.path}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {result.matches.length} match{result.matches.length === 1 ? '' : 'es'}
                      </Typography>
                    </Box>
                  </ListItemButton>
                  <Box sx={{ pl: 3, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {result.matches.map((match, matchIndex) => (
                      <Typography key={`${result.path}-${matchIndex}`} variant="body2" color="text.secondary">
                        <Box component="span" sx={{ fontFamily: 'monospace', mr: 1 }}>
                          L{match.line}
                        </Box>
                        {highlightParts(truncatePreview(match.preview))}
                      </Typography>
                    ))}
                  </Box>
                  {index < results.length - 1 && <Divider sx={{ mt: 1 }} />}
                </Box>
              ))}
            </List>
          )}
          {truncated && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Results truncated. Refine the query for more specific matches.
            </Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;

import React from 'react';
import { Box, IconButton, Select, MenuItem } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { SortMode } from '../../store/slices/fileTreeSlice';

interface FileTreeHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  onExpandAllClick: () => void;
  onCollapseAll: () => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
}

const SORT_OPTIONS = [
  { value: 'name' as SortMode, label: 'File name (A→Z)' },
  { value: 'mtime' as SortMode, label: 'Modified (oldest)' },
  { value: 'mtime_desc' as SortMode, label: 'Modified (newest)' },
  { value: 'ctime' as SortMode, label: 'Created (oldest)' },
  { value: 'ctime_desc' as SortMode, label: 'Created (newest)' },
];

const FileTreeHeader: React.FC<FileTreeHeaderProps> = ({
  isOpen,
  onToggle,
  onExpandAllClick,
  onCollapseAll,
  sortMode,
  onSortModeChange,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '34px',
        marginBottom: 2,
        px: isOpen ? 2 : 0.5
      }}
    >
      {isOpen && (
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, gap: 1 }}>
          <Select
            value={sortMode}
            onChange={(e) => onSortModeChange(e.target.value as SortMode)}
            size="small"
            sx={{
              fontSize: '0.75rem',
              height: '28px',
              minWidth: '120px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'divider',
              },
            }}
          >
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <IconButton onClick={onExpandAllClick} size="small" aria-label="expand all">
            <UnfoldMoreIcon />
          </IconButton>
          <IconButton onClick={onCollapseAll} size="small" aria-label="collapse all">
            <UnfoldLessIcon />
          </IconButton>
        </Box>
      )}
      <IconButton onClick={onToggle} size="small" sx={{ marginBottom: 0, marginLeft: isOpen ? '0' : '12px' }} aria-label="toggle file tree">
        {isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
      </IconButton>
    </Box>
  );
};

export default FileTreeHeader;

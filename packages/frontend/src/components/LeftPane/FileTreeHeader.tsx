import React from 'react';
import { Box, IconButton, FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

interface FileTreeHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  onToggleExpandCollapse: () => void;
  isAllExpanded: boolean;
  sortValue: string;
  onSortChange: (event: SelectChangeEvent) => void;
}

const FileTreeHeader: React.FC<FileTreeHeaderProps> = ({
  isOpen,
  onToggle,
  onToggleExpandCollapse,
  isAllExpanded,
  sortValue,
  onSortChange
}) => {
  const iconButtonSx = {
    width: 24,
    height: 24,
    padding: 0,
    marginTop: '-2px',
    '& .MuiSvgIcon-root': {
      fontSize: 18,
    },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 1,
        marginBottom: 2,
        px: isOpen ? 2 : 0.5
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '32px' }}>
        {isOpen ? (
          <>
            <FormControl size="small" fullWidth sx={{ flex: 1, minWidth: 0 }}>
              <Select
                value={sortValue}
                onChange={onSortChange}
                inputProps={{ 'aria-label': 'Sort' }}
                sx={{
                  minHeight: 32,
                  '& .MuiSelect-select': {
                    padding: '6px 10px',
                    minHeight: 'unset',
                  },
                }}
              >
                <MenuItem value="name:asc">File name (A–Z)</MenuItem>
                <MenuItem value="name:desc">File name (Z–A)</MenuItem>
                <MenuItem value="modified:desc">Modified time (new → old)</MenuItem>
                <MenuItem value="modified:asc">Modified time (old → new)</MenuItem>
                <MenuItem value="created:desc">Created time (new → old)</MenuItem>
                <MenuItem value="created:asc">Created time (old → new)</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
              <IconButton
                onClick={onToggleExpandCollapse}
                size="small"
                sx={iconButtonSx}
                aria-label={isAllExpanded ? 'collapse all' : 'expand all'}
              >
                {isAllExpanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
              </IconButton>
              <IconButton onClick={onToggle} size="small" sx={iconButtonSx} aria-label="toggle file tree">
                <ChevronLeftIcon />
              </IconButton>
            </Box>
          </>
        ) : (
          <IconButton onClick={onToggle} size="small" sx={iconButtonSx} aria-label="toggle file tree">
            <ChevronRightIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default FileTreeHeader;

import React from 'react';
import { Autocomplete, Box, Chip, TextField } from '@mui/material';

interface FileTreeTagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagChange: (tags: string[]) => void;
}

const FileTreeTagFilter: React.FC<FileTreeTagFilterProps> = ({
  availableTags,
  selectedTags,
  onTagChange,
}) => {
  const hasTags = availableTags.length > 0;

  return (
    <Box mb={2} px={2}>
      <Autocomplete
        multiple
        fullWidth
        size="small"
        options={availableTags}
        value={selectedTags}
        onChange={(_event, value) => onTagChange(value)}
        disableCloseOnSelect
        disabled={!hasTags}
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
            placeholder={hasTags ? 'Filter tags...' : 'No tags found'}
            inputProps={{
              ...params.inputProps,
              'aria-label': 'filter tags',
            }}
          />
        )}
        sx={{
          '& .MuiInputBase-root': {
            fontSize: '0.875rem',
            borderRadius: '4px',
          },
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'divider',
          },
        }}
      />
    </Box>
  );
};

export default FileTreeTagFilter;

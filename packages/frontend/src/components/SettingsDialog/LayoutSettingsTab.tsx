import {
  Box,
  FormControlLabel,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useCallback } from 'react';

interface LayoutSettingsTabProps {
  contentMode: 'full' | 'compact';
  handleToggleContentMode: (mode: 'full' | 'compact') => void;
  enableFullTextSearch: boolean;
  handleToggleFullTextSearch: (enabled: boolean) => void;
}

const LayoutSettingsTab: React.FC<LayoutSettingsTabProps> = ({
  contentMode,
  handleToggleContentMode,
  enableFullTextSearch,
  handleToggleFullTextSearch,
}) => {
  const theme = useTheme();

  const handleChange = useCallback((_, newMode) => {
    if (newMode)
      handleToggleContentMode(newMode);
  } , [handleToggleContentMode]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 2 }}>Content Width</Typography>
      <ToggleButtonGroup
        value={contentMode}
        exclusive
        onChange={handleChange}
        aria-label="content width"
        fullWidth
        size="small"
        sx={{ mb: 2 }}
      >
        <ToggleButton
          value="full"
          aria-label="full"
          sx={{
            flexGrow: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            },
          }}
        >
          Full
        </ToggleButton>
        <ToggleButton
          value="compact"
          aria-label="compact"
          sx={{
            flexGrow: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            },
          }}
        >
          Compact
        </ToggleButton>
      </ToggleButtonGroup>
      <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>Search</Typography>
      <FormControlLabel
        control={
          <Switch
            checked={enableFullTextSearch}
            onChange={(event) => handleToggleFullTextSearch(event.target.checked)}
          />
        }
        label="Enable full-text search (Ctrl+K)"
      />
      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
        Search across all markdown files in the mounted directory.
      </Typography>
    </Box>
  );
};

export default LayoutSettingsTab;

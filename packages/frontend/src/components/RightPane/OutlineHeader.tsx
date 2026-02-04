import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, IconButton, Typography } from '@mui/material';
import React from 'react';

interface OutlineHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
}

const OutlineHeader: React.FC<OutlineHeaderProps> = ({ isOpen, onToggle }) => {
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
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        height: '28px',
        marginBottom: 2,
        px: isOpen ? 2 : 0.5,
      }}
    >
      <IconButton
        onClick={onToggle}
        size="small"
        sx={{ ...iconButtonSx, marginBottom: 0, marginLeft: isOpen ? '0' : '12px' }}
        aria-label="toggle outline"
      >
        {isOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </IconButton>
      {isOpen && (
        <Typography variant="h6" gutterBottom sx={{ marginLeft: 1, marginBottom: 0 }}>
          Outline
        </Typography>
      )}
    </Box>
  );
};

export default OutlineHeader;

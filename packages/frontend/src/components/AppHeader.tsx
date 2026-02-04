import GitHubIcon from '@mui/icons-material/GitHub';
import SettingsIcon from '@mui/icons-material/Settings';
import { AppBar, Box, IconButton, Link, Toolbar, Tooltip } from '@mui/material';
import React, { useCallback } from 'react';

import Logo from './Logo';

interface AppHeaderProps {
  handleFileSelect: (path: string) => void;
  onSettingsClick: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  handleFileSelect,
  onSettingsClick,
}) => {
  const handleFileSelectClick = useCallback(() => {
    handleFileSelect('');
  }, [handleFileSelect]);

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid ',
        borderColor: 'divider',
        height: 40,
      }}
    >
      <Toolbar sx={{ minHeight: 40, height: 40, px: 1, alignItems: 'center' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Tooltip title="Top page">
            <IconButton disableRipple onClick={handleFileSelectClick} color="inherit" size="small" sx={{ p: 0.5 }}>
              <div style={{ height: '28px', marginTop: '0', marginLeft: '-8px' }}>
                <Logo />
              </div>
            </IconButton>
          </Tooltip>
        </Box>
        <Tooltip title="Settings">
          <IconButton sx={{ mr: 1, p: 0.5 }} onClick={onSettingsClick} color="inherit" size="small">
            <SettingsIcon sx={{ fontSize: 14, position: 'relative', top: -1 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="GitHub Repository">
          <IconButton
            color="inherit"
            href="https://github.com/unhappychoice/mdts"
            target="_blank"
            rel="noopener"
            sx={{ mr: 1, p: 0.5 }}
            size="small"
          >
            <GitHubIcon sx={{ fontSize: 14, position: 'relative', top: -1 }} />
          </IconButton>
        </Tooltip>
        <Box sx={{ fontSize: '11px', pt: '0', fontFamily: 'monospace', lineHeight: 1 }}>
          <Tooltip title="Changelog">
            <Link href="https://github.com/unhappychoice/mdts/blob/main/CHANGELOG.md" target="_blank" rel="noopener">
              v{process.env.APP_VERSION}
            </Link>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default AppHeader;

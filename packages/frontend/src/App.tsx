import { CssBaseline, ThemeProvider } from '@mui/material';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import SettingsDialog from './components/SettingsDialog/SettingsDialog';
import SearchDialog from './components/SearchDialog/SearchDialog';
import { AnnotationEditor } from './components/AnnotationEditor';
import { useTheme } from './hooks/useTheme';
import { useWebSocket } from './hooks/useWebSocket';
import Layout from './Layout';
import { saveAppSetting } from './store/slices/appSettingSlice';
import { fetchConfig } from './store/slices/configSlice';
import { fetchFileTree } from './store/slices/fileTreeSlice';
import { updateHistoryFromLocation } from './store/slices/historySlice';
import { AppDispatch, RootState } from './store/store';

const App: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const location = useLocation();
  const navigate = useNavigate();

  const { currentPath } = useSelector((state: RootState) => state.history);
  const { darkMode, contentMode } = useSelector((state: RootState) => state.appSetting);
  const { fontSize, enableFullTextSearch } = useSelector((state: RootState) => state.config);
  const { sortOption, sortOrder } = useSelector((state: RootState) => state.fileTree);
  const theme = useTheme();

  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  const handleSettingsClick = useCallback(() => {
    setIsSettingsDialogOpen(true);
  }, []);

  const handleCloseSettingsDialog = useCallback(() => {
    setIsSettingsDialogOpen(false);
  }, []);

  const handleCloseSearchDialog = useCallback(() => {
    setIsSearchDialogOpen(false);
  }, []);

  const handleSearchResultSelect = useCallback((path: string) => {
    navigate(`/${path}`);
  }, [navigate]);

  useWebSocket(currentPath);

  useEffect(() => {
    dispatch(fetchFileTree({ sortOption, sortOrder }));
  }, [dispatch, location, sortOption, sortOrder]);

  useEffect(() => {
    dispatch(updateHistoryFromLocation(location.pathname));
  }, [location, dispatch]);

  useEffect(() => {
    dispatch(fetchConfig());
  }, [dispatch]);

  useEffect(() => {
    const actualSize = Math.floor(fontSize / 0.875);
    document.documentElement.style.fontSize = `${actualSize}px`;
  }, [fontSize]);

  useEffect(() => {
    if (!(['dark', 'light', 'auto'].includes(darkMode))) {
      dispatch(saveAppSetting({ darkMode: 'auto', contentMode: 'compact' }));
    } else {
      dispatch(saveAppSetting({ darkMode, contentMode }));
    }
  }, []);

  useEffect(() => {
    if (!enableFullTextSearch) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key !== 'k') return;
      if (!event.ctrlKey && !event.metaKey) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) {
          return;
        }
      }

      event.preventDefault();
      setIsSearchDialogOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enableFullTextSearch]);

  useEffect(() => {
    if (!enableFullTextSearch) {
      setIsSearchDialogOpen(false);
    }
  }, [enableFullTextSearch]);

  const isAnnotationRoute = location.pathname.startsWith('/annotate/');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isAnnotationRoute ? (
        <Routes>
          <Route path="/annotate/*" element={<AnnotationEditor />} />
        </Routes>
      ) : (
        <>
          <Layout onSettingsClick={handleSettingsClick} />
          <SettingsDialog open={isSettingsDialogOpen} onClose={handleCloseSettingsDialog} />
          <SearchDialog
            open={isSearchDialogOpen}
            onClose={handleCloseSearchDialog}
            onFileSelect={handleSearchResultSelect}
          />
        </>
      )}
    </ThemeProvider>
  );
};

export default App;

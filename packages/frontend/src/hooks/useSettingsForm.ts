import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { WEB_SAFE_FONTS, WEB_SAFE_MONOSPACE_FONTS } from '../constants';
import { saveAppSetting } from '../store/slices/appSettingSlice';
import { saveConfigToBackend } from '../store/slices/configSlice';
import { AppDispatch, RootState } from '../store/store';

interface UseSettingsFormReturn {
  darkMode: 'dark' | 'light' | 'auto';
  contentMode: 'full' | 'compact';
  themeType: string;
  fontFamily: string;
  fontFamilyMonospace: string;
  fontSize: number;
  syntaxHighlighterTheme: string;
  enableFullTextSearch: boolean;
  fontInputMode: 'select' | 'text';
  fontInputModeMonospace: 'select' | 'text';
  setDarkMode: (mode: 'dark' | 'light' | 'auto') => void;
  setContentMode: (mode: 'full' | 'compact') => void;
  setThemeType: (theme: string) => void;
  setFontFamily: (font: string) => void;
  setFontFamilyMonospace: (font: string) => void;
  setFontSize: (size: number) => void;
  setSyntaxHighlighterTheme: (theme: string) => void;
  setEnableFullTextSearch: (enabled: boolean) => void;
  setFontInputMode: (mode: 'select' | 'text') => void;
  setFontInputModeMonospace: (mode: 'select' | 'text') => void;
  handleSave: () => void;
  handleCancel: () => void;
  handleToggleDarkMode: (mode: 'dark' | 'light' | 'auto') => void;
  handleToggleTheme: (theme: string) => void;
  handleToggleContentMode: (mode: 'full' | 'compact') => void;
  handleToggleFullTextSearch: (enabled: boolean) => void;
  handleFontInputModeChange: (_: React.MouseEvent<HTMLElement>, newMode: 'select' | 'text' | null) => void;
  handleFontInputModeMonospaceChange: (_: React.MouseEvent<HTMLElement>, newMode: 'select' | 'text' | null) => void;
  handleReset: () => void;
}

export const useSettingsForm = (): UseSettingsFormReturn => {
  const dispatch: AppDispatch = useDispatch();
  const {
    darkMode: initialDarkMode,
    contentMode: initialContentMode
  } = useSelector((state: RootState) => state.appSetting);

  const {
    theme: initialTheme,
    syntaxHighlighterTheme: initialSyntaxHighlighterTheme,
    fontFamily: initialFontFamily,
    fontFamilyMonospace: initialFontFamilyMonospace,
    fontSize: initialFontSize,
    enableFullTextSearch: initialEnableFullTextSearch,
  } = useSelector((state: RootState) => state.config);

  const [darkMode, setDarkMode] = useState(initialDarkMode);
  const [contentMode, setContentMode] = useState(initialContentMode);
  const [theme, setTheme] = useState(initialTheme);
  const [fontFamily, setFontFamily] = useState(initialFontFamily);
  const [fontFamilyMonospace, setFontFamilyMonospace] = useState(initialFontFamilyMonospace);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [syntaxHighlighterTheme, setSyntaxHighlighterTheme] = useState(initialSyntaxHighlighterTheme);
  const [enableFullTextSearch, setEnableFullTextSearch] = useState(initialEnableFullTextSearch);
  const [fontInputMode, setFontInputMode] = useState<'select' | 'text'>(WEB_SAFE_FONTS.includes(initialFontFamily) ? 'select' : 'text');
  const [fontInputModeMonospace, setFontInputModeMonospace] = useState<'select' | 'text'>(
    WEB_SAFE_MONOSPACE_FONTS.includes(initialFontFamilyMonospace) ? 'select' : 'text'
  );

  useEffect(() => {
    setContentMode(initialContentMode);
    setDarkMode(initialDarkMode);
    setTheme(initialTheme);
    setSyntaxHighlighterTheme(initialSyntaxHighlighterTheme);
    setFontFamily(initialFontFamily);
    setFontFamilyMonospace(initialFontFamilyMonospace);
    setFontSize(initialFontSize);
    setEnableFullTextSearch(initialEnableFullTextSearch);
    setFontInputMode(WEB_SAFE_FONTS.includes(initialFontFamily) ? 'select' : 'text');
    setFontInputModeMonospace(WEB_SAFE_MONOSPACE_FONTS.includes(initialFontFamilyMonospace) ? 'select' : 'text');
  }, [
    initialContentMode,
    initialDarkMode,
    initialTheme,
    initialSyntaxHighlighterTheme,
    initialFontFamily,
    initialFontFamilyMonospace,
    initialFontSize,
    initialEnableFullTextSearch,
  ]);

  const handleSave = useCallback(() => {
    dispatch(saveConfigToBackend({
      theme: theme,
      syntaxHighlighterTheme,
      fontFamily,
      fontFamilyMonospace,
      fontSize,
      enableFullTextSearch,
    }));
    dispatch(saveAppSetting({ darkMode, contentMode }));
  }, [contentMode, darkMode, theme, dispatch, fontFamily, fontFamilyMonospace, fontSize, syntaxHighlighterTheme, enableFullTextSearch]);

  const handleCancel = useCallback(() => {
    setDarkMode(initialDarkMode);
    setContentMode(initialContentMode);
    setTheme(initialTheme);
    setFontFamily(initialFontFamily);
    setFontFamilyMonospace(initialFontFamilyMonospace);
    setFontSize(initialFontSize);
    setSyntaxHighlighterTheme(initialSyntaxHighlighterTheme);
    setEnableFullTextSearch(initialEnableFullTextSearch);
    setFontInputMode(WEB_SAFE_FONTS.includes(initialFontFamily) ? 'select' : 'text');
    setFontInputModeMonospace(WEB_SAFE_MONOSPACE_FONTS.includes(initialFontFamilyMonospace) ? 'select' : 'text');
  }, [
    initialContentMode,
    initialDarkMode,
    initialTheme,
    initialFontFamily,
    initialFontFamilyMonospace,
    initialFontSize,
    initialSyntaxHighlighterTheme,
    initialEnableFullTextSearch,
  ]);

  const handleToggleDarkMode = useCallback((mode: 'dark' | 'light' | 'auto') => {
    setDarkMode(mode);
  }, []);

  const handleToggleTheme = useCallback((theme: string) => {
    setTheme(theme);
  }, []);

  const handleToggleContentMode = useCallback((mode: 'full' | 'compact') => {
    setContentMode(mode);
  }, []);

  const handleToggleFullTextSearch = useCallback((enabled: boolean) => {
    setEnableFullTextSearch(enabled);
  }, []);

  const handleFontInputModeChange = useCallback((_: React.MouseEvent<HTMLElement>, newMode: 'select' | 'text' | null) => {
    if (newMode) {
      setFontInputMode(newMode);
      if (newMode === 'select' && !WEB_SAFE_FONTS.includes(fontFamily)) {
        setFontFamily(WEB_SAFE_FONTS[0]); // Reset to first web-safe font if current is not in list
      }
    }
  }, [fontFamily]);

  const handleFontInputModeMonospaceChange = useCallback((_: React.MouseEvent<HTMLElement>, newMode: 'select' | 'text' | null) => {
    if (newMode) {
      setFontInputModeMonospace(newMode);
      if (newMode === 'select' && !WEB_SAFE_MONOSPACE_FONTS.includes(fontFamilyMonospace)) {
        setFontFamilyMonospace(WEB_SAFE_MONOSPACE_FONTS[0]); // Reset to first web-safe monospace font if current is not in list
      }
    }
  }, [fontFamilyMonospace]);

  const handleReset = useCallback(() => {
    const defaultDarkMode = 'auto';
    const defaultContentMode = 'compact';
    const defaultTheme = 'default';
    const defaultFontFamily = 'Roboto';
    const defaultFontFamilyMonospace = 'monospace';
    const defaultFontSize = 14;
    const defaultSyntaxHighlighterTheme = 'auto';
    const defaultEnableFullTextSearch = true;

    setDarkMode(defaultDarkMode);
    setContentMode(defaultContentMode);
    setTheme(defaultTheme);
    setFontFamily(defaultFontFamily);
    setFontFamilyMonospace(defaultFontFamilyMonospace);
    setFontSize(defaultFontSize);
    setSyntaxHighlighterTheme(defaultSyntaxHighlighterTheme);
    setEnableFullTextSearch(defaultEnableFullTextSearch);
    setFontInputMode(WEB_SAFE_FONTS.includes(defaultFontFamily) ? 'select' : 'text');
    setFontInputModeMonospace(WEB_SAFE_MONOSPACE_FONTS.includes(defaultFontFamilyMonospace) ? 'select' : 'text');

    dispatch(saveConfigToBackend({
      theme: defaultTheme,
      syntaxHighlighterTheme: defaultSyntaxHighlighterTheme,
      fontFamily: defaultFontFamily,
      fontFamilyMonospace: defaultFontFamilyMonospace,
      fontSize: defaultFontSize,
      enableFullTextSearch: defaultEnableFullTextSearch,
    }));
    dispatch(saveAppSetting({ darkMode: defaultDarkMode, contentMode: defaultContentMode }));
  }, [dispatch]);

  return {
    darkMode,
    contentMode,
    themeType: theme,
    fontFamily,
    fontFamilyMonospace,
    fontSize,
    syntaxHighlighterTheme,
    enableFullTextSearch,
    fontInputMode,
    fontInputModeMonospace,
    setDarkMode,
    setContentMode,
    setThemeType: setTheme,
    setFontFamily,
    setFontFamilyMonospace,
    setFontSize,
    setSyntaxHighlighterTheme,
    setEnableFullTextSearch,
    setFontInputMode,
    setFontInputModeMonospace,
    handleSave,
    handleCancel,
    handleToggleDarkMode,
    handleToggleTheme,
    handleToggleContentMode,
    handleToggleFullTextSearch,
    handleFontInputModeChange,
    handleFontInputModeMonospaceChange,
    handleReset,
  };
};

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type DarkMode = 'dark' | 'light' | 'auto';
type ContentMode = 'full' | 'compact';

interface AppSettingState {
  darkMode: DarkMode;
  contentMode: ContentMode;
  fileTreeOpen: boolean;
  outlineOpen: boolean;
  showAnnotations: boolean;
}

const initialState: AppSettingState = {
  darkMode: 'auto',
  contentMode: 'compact',
  fileTreeOpen: true,
  outlineOpen: true,
  showAnnotations: true
};

const appSettingSlice = createSlice({
  name: 'appSetting',
  initialState,
  reducers: {
    saveAppSetting: (
      state,
      action: PayloadAction<{ darkMode: DarkMode; contentMode: ContentMode }>
    ) => {
      state.darkMode = action.payload.darkMode;
      state.contentMode = action.payload.contentMode;
    },
    toggleFileTree: (state) => {
      state.fileTreeOpen = !state.fileTreeOpen;
    },
    toggleOutline: (state) => {
      state.outlineOpen = !state.outlineOpen;
    },
    toggleAnnotations: (state) => {
      state.showAnnotations = !state.showAnnotations;
    },
  },
});

export const { saveAppSetting, toggleFileTree, toggleOutline, toggleAnnotations } = appSettingSlice.actions;

export default appSettingSlice.reducer;

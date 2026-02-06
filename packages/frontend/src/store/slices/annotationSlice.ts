import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AnnotationItem, AnnotationFile } from '../../types/annotations';

interface AnnotationState {
  annotations: AnnotationItem[];
  globalComment: string;
  originalContent: string;
  hashMismatch: boolean;
  currentContent: string;
  filePath: string | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

const initialState: AnnotationState = {
  annotations: [],
  globalComment: '',
  originalContent: '',
  hashMismatch: false,
  currentContent: '',
  filePath: null,
  loading: false,
  error: null,
  saving: false,
};

export const fetchAnnotations = createAsyncThunk(
  'annotations/fetchAnnotations',
  async (path: string) => {
    const response = await fetch(`/api/annotations/${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { 
      annotations: data.annotations || [], 
      globalComment: data.globalComment || '', 
      originalContent: data.originalContent || '',
      hashMismatch: data.hashMismatch || false,
      currentContent: data.currentContent || '',
      filePath: path 
    };
  }
);

export const saveAnnotations = createAsyncThunk(
  'annotations/saveAnnotations',
  async ({ path, annotations, globalComment, currentContent }: { path: string; annotations: AnnotationItem[]; globalComment: string; currentContent: string }) => {
    const response = await fetch(`/api/annotations/${encodeURIComponent(path)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ annotations, globalComment, currentContent }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return { path, annotations, globalComment };
  }
);

const annotationSlice = createSlice({
  name: 'annotations',
  initialState,
  reducers: {
    addAnnotation: (state, action: PayloadAction<AnnotationItem>) => {
      state.annotations.push(action.payload);
    },
    removeAnnotation: (state, action: PayloadAction<number>) => {
      state.annotations.splice(action.payload, 1);
    },
    updateAnnotation: (state, action: PayloadAction<{ index: number; annotation: AnnotationItem }>) => {
      state.annotations[action.payload.index] = action.payload.annotation;
    },
    updateAnnotationFeedback: (state, action: PayloadAction<{ index: number; feedback: string }>) => {
      const ann = state.annotations[action.payload.index];
      if (ann && ann.type === 'comment') {
        (ann as { feedback: string }).feedback = action.payload.feedback;
      }
    },
    clearAnnotations: (state) => {
      state.annotations = [];
      state.globalComment = '';
      state.hashMismatch = false;
      state.originalContent = '';
      state.currentContent = '';
    },
    setGlobalComment: (state, action: PayloadAction<string>) => {
      state.globalComment = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnnotations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAnnotations.fulfilled, (state, action) => {
        state.loading = false;
        state.annotations = action.payload.annotations;
        state.globalComment = action.payload.globalComment;
        state.originalContent = action.payload.originalContent;
        state.hashMismatch = action.payload.hashMismatch;
        state.currentContent = action.payload.currentContent;
        state.filePath = action.payload.filePath;
      })
      .addCase(fetchAnnotations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch annotations';
      })
      .addCase(saveAnnotations.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveAnnotations.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(saveAnnotations.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to save annotations';
      });
  },
});

export const { addAnnotation, removeAnnotation, updateAnnotation, updateAnnotationFeedback, clearAnnotations, setGlobalComment } = annotationSlice.actions;

export default annotationSlice.reducer;

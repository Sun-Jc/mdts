import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tabs,
  Tab,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import CommentIcon from '@mui/icons-material/Comment';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import CodeIcon from '@mui/icons-material/Code';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CompareIcon from '@mui/icons-material/Compare';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Diff from 'diff';
import type { RootState, AppDispatch } from '../../store/store';
import type { AnnotationItem, CommentAnnotation, DeleteAnnotation } from '../../types/annotations';
import { isCommentAnnotation } from '../../types/annotations';
import { fetchAnnotations, saveAnnotations, addAnnotation, removeAnnotation, updateAnnotationFeedback, setGlobalComment, clearAnnotations } from '../../store/slices/annotationSlice';
import { AnnotatedMarkdownRenderer } from '../AnnotatedMarkdownRenderer';
import { AnnotatedMarkdownPreview, type AnnotatedMarkdownPreviewHandle } from '../AnnotatedMarkdownRenderer/AnnotatedMarkdownPreview';

interface SelectionInfo {
  start: number;
  end: number;
  text: string;
}

export const AnnotationEditor: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { '*': filePath } = useParams();

  const { annotations, globalComment, loading, saving, hashMismatch, originalContent, currentContent: storeCurrentContent } = useSelector((state: RootState) => state.annotations);

  const [content, setContent] = useState<string>('');
  const [contentLoading, setContentLoading] = useState(true);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [pendingSelection, setPendingSelection] = useState<SelectionInfo | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'source' | 'preview'>('preview');
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [hoveredAnnotationIndex, setHoveredAnnotationIndex] = useState<number | null>(null);
  const [clearConfirmStep, setClearConfirmStep] = useState(0);
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);

  const contentRef = useRef<HTMLPreElement>(null);
  const previewRef = useRef<AnnotatedMarkdownPreviewHandle>(null);

  useEffect(() => {
    if (filePath) {
      dispatch(fetchAnnotations(filePath));
      fetch(`/api/markdown/${encodeURIComponent(filePath)}`)
        .then(res => res.text())
        .then(text => {
          setContent(text);
          setContentLoading(false);
        })
        .catch(err => {
          console.error('Failed to load content:', err);
          setContentLoading(false);
        });
    }
  }, [filePath, dispatch]);

  const getSelectionOffset = useCallback((container: HTMLElement): SelectionInfo | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    const selectedText = sel.toString();
    if (!selectedText.trim()) return null;

    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;

    return {
      start,
      end: start + selectedText.length,
      text: selectedText,
    };
  }, []);

  const handleMouseUp = useCallback(() => {
    let selInfo: SelectionInfo | null = null;

    if (viewMode === 'source') {
      const container = contentRef.current;
      if (!container) return;
      selInfo = getSelectionOffset(container);
    } else {
      if (!previewRef.current) return;
      selInfo = previewRef.current.getSelectionInRawContent();
    }

    if (selInfo) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setToolbarPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
        });
        setSelection(selInfo);
        setShowToolbar(true);
      }
    } else {
      setShowToolbar(false);
      setSelection(null);
    }
  }, [getSelectionOffset, viewMode]);

  const handleAddComment = useCallback(() => {
    if (selection) {
      setPendingSelection(selection);
      setCommentDialogOpen(true);
      setShowToolbar(false);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection]);

  const handleConfirmComment = useCallback(() => {
    if (editingIndex === -1) {
      dispatch(setGlobalComment(commentText.trim()));
    } else if (editingIndex !== null && commentText.trim()) {
      dispatch(updateAnnotationFeedback({ index: editingIndex, feedback: commentText.trim() }));
    } else if (pendingSelection && commentText.trim()) {
      const newAnnotation: CommentAnnotation = {
        type: 'comment',
        source: { start: pendingSelection.start, end: pendingSelection.end },
        feedback: commentText.trim(),
      };
      dispatch(addAnnotation(newAnnotation));
    }
    setCommentDialogOpen(false);
    setCommentText('');
    setPendingSelection(null);
    setEditingIndex(null);
  }, [pendingSelection, commentText, dispatch, editingIndex]);

  const handleEditAnnotation = useCallback((index: number) => {
    const ann = annotations[index];
    if (isCommentAnnotation(ann)) {
      setEditingIndex(index);
      setCommentText(ann.feedback);
      setPendingSelection({
        start: ann.source.start,
        end: ann.source.end,
        text: content.substring(ann.source.start, ann.source.end),
      });
      setCommentDialogOpen(true);
    }
  }, [annotations, content]);

  const handleAddDelete = useCallback(() => {
    if (selection) {
      const newAnnotation: DeleteAnnotation = {
        type: 'delete',
        source: { start: selection.start, end: selection.end },
      };
      dispatch(addAnnotation(newAnnotation));
      setShowToolbar(false);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  }, [selection, dispatch]);

  const handleRemoveAnnotation = useCallback((index: number) => {
    dispatch(removeAnnotation(index));
  }, [dispatch]);

  const handleSave = useCallback(async () => {
    if (filePath) {
      try {
        await dispatch(saveAnnotations({ path: filePath, annotations, globalComment, currentContent: content })).unwrap();
        setSnackbar({ open: true, message: 'Annotations saved successfully', severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: 'Failed to save annotations', severity: 'error' });
      }
    }
  }, [filePath, annotations, globalComment, content, dispatch]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  if (contentLoading || loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: 0,
        }}
      >
        <IconButton onClick={handleBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flex: 1 }}>
          Annotating: {filePath}
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
            <Tabs
              value={viewMode}
              onChange={(_, v) => setViewMode(v)}
              sx={{ minHeight: 42 }}
            >
              <Tab
                value="source"
                label="Source"
                icon={<CodeIcon fontSize="small" />}
                iconPosition="start"
                sx={{ minHeight: 42, textTransform: 'none' }}
              />
              <Tab
                value="preview"
                label="Preview"
                icon={<VisibilityIcon fontSize="small" />}
                iconPosition="start"
                sx={{ minHeight: 42, textTransform: 'none' }}
              />
            </Tabs>
          </Box>

          <Box
            sx={{ flex: 1, overflow: 'auto', p: 2 }}
            onMouseUp={handleMouseUp}
          >
            {viewMode === 'source' ? (
              <Paper sx={{ p: 2 }}>
                <pre
                  ref={contentRef}
                  style={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    fontSize: '14px',
                    lineHeight: '1.6',
                    userSelect: 'text',
                  }}
                >
                  <AnnotatedMarkdownRenderer
                    content={content}
                    annotations={annotations}
                  />
                </pre>
              </Paper>
            ) : (
              <Paper sx={{ p: 2 }} className="markdown-body">
                <AnnotatedMarkdownPreview
                  ref={previewRef}
                  content={content}
                  annotations={annotations}
                  onHoverAnnotation={setHoveredAnnotationIndex}
                />
              </Paper>
            )}
          </Box>
        </Box>

        <Paper
          sx={{
            width: 300,
            overflow: 'auto',
            borderRadius: 0,
            borderLeft: 1,
            borderColor: 'divider',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              Annotations ({annotations.length + (globalComment ? 1 : 0)})
            </Typography>
            <List dense>
              <ListItem
                sx={{
                  bgcolor: globalComment ? 'action.hover' : 'transparent',
                  mb: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  border: globalComment ? 'none' : '1px dashed',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
                onClick={() => {
                  setEditingIndex(-1);
                  setCommentText(globalComment);
                  setPendingSelection(null);
                  setCommentDialogOpen(true);
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        size="small"
                        label="GLOBAL"
                        color="info"
                      />
                    </Box>
                  }
                  secondary={
                    globalComment ? (
                      <Typography variant="caption" color="primary" component="div">
                        {globalComment.length > 80 ? globalComment.substring(0, 80) + '...' : globalComment}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary" component="div" sx={{ fontStyle: 'italic' }}>
                        Click to add global comment...
                      </Typography>
                    )
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
                {globalComment && (
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(setGlobalComment(''));
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
              {annotations.map((ann, index) => (
                <ListItem
                  key={index}
                  sx={{
                    bgcolor: hoveredAnnotationIndex === index ? 'primary.light' : 'action.hover',
                    mb: 1,
                    borderRadius: 1,
                    cursor: isCommentAnnotation(ann) ? 'pointer' : 'default',
                    '&:hover': isCommentAnnotation(ann) ? { bgcolor: 'action.selected' } : {},
                    transition: 'background-color 0.2s',
                    ...(hoveredAnnotationIndex === index && {
                      boxShadow: 2,
                      border: '2px solid',
                      borderColor: 'primary.main',
                    }),
                  }}
                  onClick={() => isCommentAnnotation(ann) && handleEditAnnotation(index)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          label={ann.type.toUpperCase()}
                          color={isCommentAnnotation(ann) ? 'warning' : 'error'}
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" component="span">
                          {content.substring(ann.source.start, Math.min(ann.source.end, ann.source.start + 50))}
                          {ann.source.end - ann.source.start > 50 ? '...' : ''}
                        </Typography>
                        {isCommentAnnotation(ann) && (
                          <Typography variant="caption" color="primary" component="div">
                            {(ann as CommentAnnotation).feedback}
                          </Typography>
                        )}
                      </>
                    }
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      size="small"
                      onClick={() => handleRemoveAnnotation(index)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            {(annotations.length > 0 || globalComment) && (
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setClearConfirmStep(1)}
                fullWidth
                sx={{ mt: 1 }}
              >
                Clear All
              </Button>
            )}
          </Box>
        </Paper>
      </Box>

      {showToolbar && (
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            left: toolbarPosition.x,
            top: toolbarPosition.y,
            transform: 'translate(-50%, -100%)',
            display: 'flex',
            gap: 0.5,
            p: 0.5,
            zIndex: 1000,
          }}
        >
          <Tooltip title="Add Comment">
            <Fab size="small" color="warning" onClick={handleAddComment}>
              <CommentIcon />
            </Fab>
          </Tooltip>
          <Tooltip title="Mark for Deletion">
            <Fab size="small" color="error" onClick={handleAddDelete}>
              <DeleteForeverIcon />
            </Fab>
          </Tooltip>
        </Paper>
      )}

      <Dialog open={commentDialogOpen} onClose={() => { setCommentDialogOpen(false); setEditingIndex(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex === -1
            ? (globalComment ? 'Edit Global Comment' : 'Add Global Comment')
            : (editingIndex !== null ? 'Edit Comment' : 'Add Comment')}
        </DialogTitle>
        <DialogContent>
          {editingIndex !== -1 && pendingSelection && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Selected text: "{pendingSelection.text.substring(0, 100)}{pendingSelection.text.length > 100 ? '...' : ''}"
            </Typography>
          )}
          {editingIndex === -1 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This comment applies to the entire document (no anchor).
            </Typography>
          )}
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            label="Your comment"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCommentDialogOpen(false); setEditingIndex(null); }}>Cancel</Button>
          <Button onClick={handleConfirmComment} variant="contained" disabled={editingIndex !== -1 && !commentText.trim()}>
            {editingIndex === -1
              ? 'Save Global Comment'
              : (editingIndex !== null ? 'Save Changes' : 'Add Comment')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={clearConfirmStep > 0}
        onClose={() => setClearConfirmStep(0)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main' }}>
          {clearConfirmStep === 1 && '⚠️ Clear All Annotations?'}
          {clearConfirmStep === 2 && '⚠️⚠️ Are you really sure?'}
          {clearConfirmStep === 3 && '⚠️⚠️⚠️ Final Confirmation'}
        </DialogTitle>
        <DialogContent>
          {clearConfirmStep === 1 && (
            <Typography>
              This will remove all {annotations.length} annotation(s){globalComment ? ' and the global comment' : ''} from this document.
            </Typography>
          )}
          {clearConfirmStep === 2 && (
            <Typography color="error">
              This action cannot be undone. All your annotations will be permanently deleted.
            </Typography>
          )}
          {clearConfirmStep === 3 && (
            <Typography color="error" fontWeight="bold">
              LAST WARNING: Click "Delete Everything" to permanently remove all annotations.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearConfirmStep(0)}>Cancel</Button>
          {clearConfirmStep < 3 ? (
            <Button
              color="error"
              variant="outlined"
              onClick={() => setClearConfirmStep(prev => prev + 1)}
            >
              {clearConfirmStep === 1 ? 'Yes, Continue' : 'Yes, I\'m Sure'}
            </Button>
          ) : (
            <Button
              color="error"
              variant="contained"
              onClick={() => {
                dispatch(clearAnnotations());
                setClearConfirmStep(0);
                setSnackbar({ open: true, message: 'All annotations cleared', severity: 'success' });
              }}
            >
              Delete Everything
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={hashMismatch && annotations.length > 0}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: 'warning.main' }}>
          ⚠️ Document Has Changed
        </DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            The document content has changed since annotations were created. Existing annotations may no longer be accurate.
          </Typography>
          <Typography color="error" fontWeight="bold">
            You must clear all annotations before continuing.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<CompareIcon />}
            onClick={() => setDiffDialogOpen(true)}
          >
            View Changes
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              dispatch(clearAnnotations());
              setSnackbar({ open: true, message: 'Annotations cleared due to document changes', severity: 'success' });
            }}
          >
            Clear All Annotations
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={diffDialogOpen}
        onClose={() => setDiffDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          Document Changes
        </DialogTitle>
        <DialogContent sx={{ overflow: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Chip label="Removed" sx={{ bgcolor: '#ffecec', color: '#a00' }} />
            <Chip label="Added" sx={{ bgcolor: '#e6ffec', color: '#0a0' }} />
          </Box>
          <Box
            component="pre"
            sx={{
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              m: 0,
              p: 2,
              bgcolor: '#fafafa',
              borderRadius: 1,
            }}
          >
            {Diff.diffLines(originalContent || '', storeCurrentContent || content).map((part, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: part.added ? '#e6ffec' : part.removed ? '#ffecec' : 'transparent',
                  color: part.added ? '#22863a' : part.removed ? '#cb2431' : 'inherit',
                  textDecoration: part.removed ? 'line-through' : 'none',
                  display: 'block',
                }}
              >
                {part.value}
              </span>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiffDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AnnotationEditor;

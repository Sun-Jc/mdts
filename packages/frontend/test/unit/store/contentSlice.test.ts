import contentReducer, { fetchContent, setScrollPosition } from '../../../src/store/slices/contentSlice';

jest.mock('../../../src/api', () => ({
  fetchTextWithMetadata: jest.fn(),
}));

describe('contentSlice', () => {
  const initialState = {
    content: '',
    lastModified: null,
    loading: true,
    error: null,
    scrollPosition: 0,
  };

  it('should return the initial state', () => {
    expect(contentReducer(undefined, { type: '' })).toEqual(initialState);
  });

  describe('fetchContent.pending', () => {
    it('should set loading to true when content is empty', () => {
      const previousState = { ...initialState, loading: false, content: '' };
      expect(contentReducer(previousState, fetchContent.pending('requestId', null))).toEqual({
        ...initialState,
        loading: true,
        content: '',
      });
    });

    it('should not set loading to true when content exists', () => {
      const previousState = {
        ...initialState,
        loading: false,
        content: 'old content',
      };
      expect(contentReducer(previousState, fetchContent.pending('requestId', null))).toEqual({
        ...initialState,
        loading: false,
        content: 'old content',
      });
    });
  });

  it('should handle fetchContent.fulfilled', () => {
    const previousState = {
      ...initialState,
      content: 'old content',
      loading: true,
    };
    expect(contentReducer(previousState, fetchContent.fulfilled({
      content: 'new content',
      lastModified: 'Wed, 01 Jan 2025 12:00:00 GMT',
    }, 'requestId', null))).toEqual({
      ...initialState,
      content: 'new content',
      lastModified: 'Wed, 01 Jan 2025 12:00:00 GMT',
      loading: false,
    });
  });

  it('should handle fetchContent.rejected', () => {
    const previousState = {
      ...initialState,
      content: 'old content',
      loading: true,
    };
    const error = new Error('Failed to fetch');
    expect(contentReducer(previousState, fetchContent.rejected(error, 'requestId', null))).toEqual({
      ...initialState,
      content: 'old content',
      loading: false,
      error: 'Failed to fetch',
    });
  });

  it('should handle setScrollPosition', () => {
    const previousState = { ...initialState };
    expect(contentReducer(previousState, setScrollPosition(100))).toEqual({
      ...initialState,
      scrollPosition: 100,
    });
  });
});

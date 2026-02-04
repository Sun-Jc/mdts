export const fetchData = async <T>(url: string, responseType: 'json' | 'text'): Promise<T | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    if (responseType === 'json') {
      return await response.json();
    } else {
      return await response.text() as T;
    }
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
};

export const fetchTextWithMetadata = async (
  url: string
): Promise<{ text: string; lastModified: string | null }> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    const lastModified = response.headers.get('last-modified');
    return { text, lastModified };
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    throw error;
  }
};

export const updateFrontmatterTags = async (path: string, tags: string[]): Promise<void> => {
  const response = await fetch('/api/frontmatter/tags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, tags }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

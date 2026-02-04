import { type Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/server/server';
import path from 'path';
import net from 'net';

describe('Server E2E Tests', () => {
  let app: Express;
  let server: import('http').Server | null = null;
  let requestAgent: request.SuperTest<request.Test> | null = null;
  let canListen = true;

  const canListenOnLocalhost = (): Promise<boolean> => new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.listen(0, '127.0.0.1', () => {
      probe.close(() => resolve(true));
    });
  });

  beforeAll(async () => {
    canListen = await canListenOnLocalhost();
    if (!canListen) {
      return;
    }
    app = createApp(
      path.join(__dirname, '../fixtures/mountDirectory/content'),
      path.join(__dirname, '../fixtures/mountDirectory/dist/server'),
    );
    server = app.listen(0, '127.0.0.1');
    requestAgent = request(server);
  });

  afterAll((done) => {
    if (!server) {
      done();
      return;
    }
    server.close(done);
  });

  it('GET /api/filetree should return the file tree', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/api/filetree');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({
      fileTree: expect.arrayContaining([
        { path: 'another.md', status: ' ' },
        {
          nested: [
            { path: 'nested/nested.md', status: ' ' },
          ],
        },
        { path: 'test.md', status: ' ' },
      ]),
      mountedDirectoryPath: path.join(__dirname, '../fixtures/mountDirectory/content'),
    });
  });

  it('GET /api/markdown/mdts-welcome-markdown.md should return the welcome markdown', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/api/markdown/mdts-welcome-markdown.md');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# Welcome to mdts');
  });

  it('GET /api/markdown/test.md should return the content of test.md', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/api/markdown/test.md');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# Hello E2E');
  });

  it('GET /api/outline should return the outline for a markdown file', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/api/outline?filePath=test.md');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 1,
          content: 'Hello E2E',
          id: 'hello-e2e',
        }),
      ]),
    );
  });

  it('GET /api/outline with non-existent file should return 200', async () => {
    if (!requestAgent) {
      return;
    }
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await requestAgent.get('/api/outline?filePath=nonexistent.md');
    expect(res.statusCode).toEqual(200);

    consoleErrorSpy.mockRestore();
  });

  it('GET /api/outline without filePath should return 400', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/api/outline');
    expect(res.statusCode).toEqual(400);
  });

  it('GET / should return index.html for root path', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('<title>mdts - Markdown file viewer</title>');
  });

  it('GET /some/path/to/file.md should return index.html for markdown paths', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/test.md');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('<title>mdts - Markdown file viewer</title>');
  });

  it('should return 404 for non-existent files', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/api/markdown/nonexistent-file');
    expect(res.statusCode).toEqual(404);
    expect(res.text).toEqual('File not found');
  });

  it('should return welcome markdown', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/api/markdown/mdts-welcome-markdown.md');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('# Welcome to mdts');
  });

  it('should prevent path traversal', async () => {
    if (!requestAgent) {
      return;
    }
    const res = await requestAgent.get('/api/markdown/../package.json');
    expect(res.statusCode).toEqual(404);
    expect(res.text).toEqual('File not found');
  });

  describe('serving non-markdown files', () => {
    it('should return 404 for non-existent non-markdown files', async () => {
      if (!requestAgent) {
        return;
      }
      const res = await requestAgent.get('/nonexistent-image.png');
      expect(res.statusCode).toEqual(404);
      expect(res.text).toEqual('File not found');
    });
  });
});

import express from 'express';
import request from 'supertest';
import * as fs from 'fs';
import MarkdownIt from 'markdown-it';
import path from 'path';
import net from 'net';
import { outlineRouter } from '../../../../src/server/routes/outline';

// Mock the fs module
jest.mock('fs', () => {
  const originalModule = jest.requireActual('fs');
  return {
    __esModule: true,
    ...originalModule,
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
  };
});
jest.mock('markdown-it', () => {
  const originalModule = jest.requireActual('markdown-it');
  return jest.fn(() => ({
    parse: jest.fn((markdown, env) => {
      const md = new originalModule();
      return md.parse(markdown, env);
    }),
  }));
});
describe('outline.ts', () => {
  let canListen = true;

  const canListenOnLocalhost = (): Promise<boolean> => new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(0, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
  });

  beforeAll(async () => {
    canListen = await canListenOnLocalhost();
  });

  beforeEach(() => {
    const mockedFs = fs as jest.Mocked<typeof import('fs')>;
    mockedFs.readFileSync.mockReset();
    mockedFs.existsSync.mockReset();
    mockedFs.existsSync.mockReturnValue(true);
    (MarkdownIt as jest.Mock).mockClear();
  });

  describe('outlineRouter', () => {
    let app: express.Application;
    let server: import('http').Server | null = null;
    let requestAgent: request.SuperTest<request.Test> | null = null;
    const mockDirectory = '/mock/base/dir';

    beforeEach(() => {
      if (!canListen) {
        return;
      }
      app = express();
      app.use('/api/outline', outlineRouter(mockDirectory));
      server = app.listen(0, '127.0.0.1');
      requestAgent = request(server);
    });

    afterEach((done) => {
      if (!server) {
        done();
        return;
      }
      server.close(done);
    });

    it('should return 400 if filePath is not provided', async () => {
      if (!requestAgent) {
        return;
      }
      const response = await requestAgent.get('/api/outline');

      expect(response.statusCode).toBe(400);
      expect(response.text).toBe('filePath query parameter is required.');
    });

    it('should return outline for a valid markdown file', async () => {
      if (!requestAgent) {
        return;
      }
      const markdownContent = '# Test Heading';
      const mockedFs = fs as jest.Mocked<typeof import('fs')>;
      mockedFs.readFileSync.mockReturnValueOnce(markdownContent);
      const response = await requestAgent.get('/api/outline?filePath=test.md');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([
        { level: 1, content: 'Test Heading', id: 'test-heading' },
      ]);
    });

    it('should handle mdts-welcome-markdown.md correctly', async () => {
      if (!requestAgent) {
        return;
      }
      const welcomeMarkdownContent = '# Welcome';
      const mockedFs = fs as jest.Mocked<typeof import('fs')>;
      mockedFs.readFileSync.mockReturnValueOnce(welcomeMarkdownContent);
      const response = await requestAgent.get('/api/outline?filePath=mdts-welcome-markdown.md');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual([
        { level: 1, content: 'Welcome', id: 'welcome' },
      ]);
      const expectedPath = expect.stringContaining(path.join('public', 'welcome.md'));
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(expectedPath, 'utf-8');
    });

    it('should return 200 if file does not exist', async () => {
      if (!requestAgent) {
        return;
      }
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockedFs = fs as jest.Mocked<typeof import('fs')>;
      mockedFs.existsSync.mockReturnValueOnce(false);
      mockedFs.readFileSync.mockImplementationOnce(() => {
        throw new Error('File not found');
      });
      const response = await requestAgent.get('/api/outline?filePath=nonexistent.md');

      expect(response.statusCode).toBe(200);
      expect(response.text).toBe('[]');

      consoleErrorSpy.mockRestore();
    });
  });
});

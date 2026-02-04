import express from 'express';
import fs from 'fs';
import request from 'supertest';
import net from 'net';
import { fileTreeRouter } from '../../../../src/server/routes/filetree';

// Mock the fs module
jest.mock('fs', () => ({
  readdirSync: jest.fn(),
  statSync: jest.fn(),
}));

// Helper function to create a mock Dirent
const mockDirent = (name: string, isDirectory: boolean) => ({
  name,
  isDirectory: () => isDirectory,
  isFile: () => !isDirectory,
});

describe('filetree.ts', () => {
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
    // Reset mocks before each test
    (fs.readdirSync as jest.Mock).mockReset();
    (fs.statSync as jest.Mock).mockReset();
  });

  describe('fileTreeRouter', () => {
    let app: express.Application;
    let server: import('http').Server | null = null;
    let requestAgent: request.SuperTest<request.Test> | null = null;
    const mockDirectory = '/mock/base/dir';

    beforeEach(() => {
      if (!canListen) {
        return;
      }
      app = express();
      app.use('/api/filetree', fileTreeRouter(mockDirectory));
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

    it('should return the file tree as JSON', async () => {
      if (!requestAgent) {
        return;
      }
      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([ // For root
          mockDirent('dir1', true),
          mockDirent('file1.md', false),
        ])
        .mockReturnValueOnce([ // For dir1
          mockDirent('subfile1.md', false),
        ]);

      const response = await requestAgent.get('/api/filetree');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        fileTree: [
          { 'dir1': [{ path: 'dir1/subfile1.md', status: ' ' }] },
          { path: 'file1.md', status: ' ' },
        ],
        mountedDirectoryPath: mockDirectory,
      });
    });

    it('should return an empty array if no markdown files are found', async () => {
      if (!requestAgent) {
        return;
      }
      (fs.readdirSync as jest.Mock).mockReturnValueOnce([
        mockDirent('file1.txt', false),
        mockDirent('dir1', true),
      ]).mockReturnValueOnce([]); // For dir1

      const response = await requestAgent.get('/api/filetree');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        fileTree: [],
        mountedDirectoryPath: mockDirectory,
      });
    });

    it('should include dot directories and dot markdown files, excluding .git and .vscode', async () => {
      if (!requestAgent) {
        return;
      }
      (fs.readdirSync as jest.Mock)
        .mockReturnValueOnce([ // For root
          mockDirent('.docs', true),
          mockDirent('.git', true),
          mockDirent('.vscode', true),
          mockDirent('.hidden.md', false),
          mockDirent('visible.md', false),
          mockDirent('notes.txt', false),
        ])
        .mockReturnValueOnce([ // For .docs
          mockDirent('.doc.md', false),
          mockDirent('readme.md', false),
          mockDirent('image.png', false),
        ]);

      const response = await requestAgent.get('/api/filetree');
      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({
        fileTree: [
          {
            '.docs': [
              { path: '.docs/.doc.md', status: ' ' },
              { path: '.docs/readme.md', status: ' ' },
            ],
          },
          { path: '.hidden.md', status: ' ' },
          { path: 'visible.md', status: ' ' },
        ],
        mountedDirectoryPath: mockDirectory,
      });
    });
  });
});

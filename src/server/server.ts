import express from 'express';
import * as fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { fileTreeRouter } from './routes/filetree';
import { outlineRouter } from './routes/outline';
import { getConfig, saveConfig } from './config';
import { setupWatcher } from './watcher';
import { plantumlRouter } from './routes/plantuml';
import { searchRouter } from './routes/search';
import { frontmatterRouter } from './routes/frontmatter';

const getServerPort = (server: import('http').Server, fallbackPort: number): number => {
  const address = server.address();
  if (address && typeof address === 'object' && 'port' in address && typeof address.port === 'number') {
    return address.port;
  }
  return fallbackPort;
};

export const serve = (directory: string, port: number, host: string): import('http').Server => {
  const app = createApp(directory);
  const server = app.listen(port, host);
  server.on('listening', () => {
    const actualPort = getServerPort(server, port);
    logger.log('Server', `📁 Mounted directory: ${directory}`);
    logger.log('Server', `🚀 Server listening at http://${host}:${actualPort}`);
    setupWatcher(directory, server, actualPort);
  });

  return server;
};

export const createApp = (
  directory: string,
  currentLocation: string = __dirname,
): express.Express => {
  const app = express();

  // JSON middleware - must be before routes that need it
  app.use(express.json());

  // Mount library static files
  app.use(express.static(path.join(currentLocation, './public')));
  app.use(express.static(path.join(currentLocation, '../frontend')));

  // Define API
  app.use('/api/filetree', fileTreeRouter(directory));
  app.use('/api/outline', outlineRouter(directory));
  app.use('/api/plantuml', plantumlRouter());
  app.use('/api/search', searchRouter(directory));
  app.use('/api/frontmatter', frontmatterRouter(directory));
  app.get('/api/config', (req, res) => {
    res.json(getConfig());
  });
  app.post('/api/config', (req, res) => {
    try {
      saveConfig(req.body);
      res.status(200).send('Config saved');
    } catch (error) {
      logger.error('Failed to save config:', error);
      res.status(500).send('Failed to save config');
    }
  });

  app.get('/api/markdown/mdts-welcome-markdown.md', (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.sendFile('welcome.md', { root: path.join(currentLocation, './public') });
  });

  app.use('/api/markdown', (req, res, next) => {
    // Decode the URI component to handle encoded characters in the path
    const decodedPath = decodeURIComponent(req.path);
    // Normalize the path to resolve '..' and '.' segments
    const normalizedPath = path.normalize(decodedPath);

    // Construct the full file path
    const filePath = path.join(directory, normalizedPath);

    // Security check: Ensure the resolved path is within the designated directory
    // This prevents path traversal attacks (e.g., accessing files outside 'directory')
    if (!filePath.startsWith(directory)) {
      logger.error(`🚫 Attempted path traversal: ${filePath}`);
      return res.status(403).send('Forbidden');
    }

    if (!fs.existsSync(filePath)) {
      logger.error(`🚫 File not found: ${filePath}`);
      return res.status(404).send('File not found');
    }
    next();
  });
  app.use('/api/markdown', express.static(directory, { dotfiles: 'allow' }));

  // Catch-all route to serve index.html for any other requests
  app.get('*splat', async (req, res) => {
    const filePath = path.join(directory, req.path);
    let isDirectory = false;
    try {
      const stats = fs.statSync(filePath);
      isDirectory = stats.isDirectory();
    } catch {
      // File or directory does not exist, proceed as if it's a file
    }

    if (
      isDirectory ||
      req.path.toLowerCase().endsWith('.md') ||
      req.path.toLowerCase().endsWith('.markdown')
    ) {
      return res.sendFile('index.html', { root: path.join(currentLocation, '../frontend') });
    } else {
      return res.sendFile(req.path, { root: directory }, (err) => {
        if (err) {
          if ('code' in err && err.code === 'ENOENT') {
            logger.error(`🚫 File not found: ${path.join(directory, req.path)}`);
            res.status(404).send('File not found');
          } else {
            logger.error(`🚫 Error serving file ${path.join(directory, req.path)}:`, err);
            res.status(500).send('Internal Server Error');
          }
        }
      });
    }
  });

  return app;
};

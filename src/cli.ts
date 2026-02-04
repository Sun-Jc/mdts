import { Command } from 'commander';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import net from 'net';
import { serve } from './server/server';
import { logger } from './utils/logger';

const DEFAULT_PORT = 8521;
const DEFAULT_DIRECTORY = '.';
const AUTO_PORT_VALUE = 0;

const resolvePort = (portInput: string): number => {
  const normalized = portInput.trim().toLowerCase();
  if (normalized === 'auto') {
    return AUTO_PORT_VALUE;
  }
  return parseInt(portInput, 10);
};

const getActualPort = (server: import('http').Server, fallbackPort: number): number => {
  const address = server.address();
  if (address && typeof address === 'object' && 'port' in address && typeof address.port === 'number') {
    return address.port;
  }
  return fallbackPort;
};

const isPortAvailable = (port: number, host: string): Promise<boolean> => new Promise((resolve) => {
  const tester = net.createServer()
    .once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    })
    .once('listening', () => {
      tester.close(() => resolve(true));
    })
    .listen(port, host);
});

const getPreferredPort = async (requestedPort: number, host: string): Promise<number> => {
  if (requestedPort === AUTO_PORT_VALUE) {
    return AUTO_PORT_VALUE;
  }

  const available = await isPortAvailable(requestedPort, host);
  if (available) {
    return requestedPort;
  }

  logger.log('CLI', `⚠️  Port ${requestedPort} is in use. Falling back to an available port.`);
  return AUTO_PORT_VALUE;
};

export class CLI {
  run(): Promise<void> {
    return this.requireOpen()
      .then((open) => {
        const program = new Command();

        const packageJsonPath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

        program
          .version(packageJson.version)
          .option('-H, --host <host>', 'Host to listen on', 'localhost')
          .option('-p, --port <port>', 'Port to serve on (use "auto" or 0 for a random open port)', String(DEFAULT_PORT))
          .option('-s, --silent', 'Suppress server logs', false)
          .option('--no-open', 'Do not open the browser automatically')
          .argument('[directory]', 'Directory to serve', DEFAULT_DIRECTORY)
          .action(async (directory, options) => {
            logger.setSilent(options.silent);

            logger.showLogo();
            logger.log('Announcement', '🎉 Thanks for using mdts!');
            logger.log('Announcement', '✨ Like it? Star it on GitHub: https://github.com/unhappychoice/mdts');

            logger.log('CLI', '⚙  Options: ' + JSON.stringify(options));
            const requestedPort = resolvePort(String(options.port));
            const host = options.host;
            const absoluteDirectory = path.resolve(process.cwd(), directory);
            const readmePath = path.join(absoluteDirectory, 'README.md');
            const initialPath = existsSync(readmePath) ? '/README.md' : '';
            const displayHost = (host === '0.0.0.0' || host === '::') ? 'localhost' : host;

            const port = await getPreferredPort(requestedPort, host);
            const server = serve(absoluteDirectory, port, host);
            server.once('listening', () => {
              const actualPort = getActualPort(server, port);
              if (options.open) {
                logger.log('CLI', `🌐 Opening browser at http://${displayHost}:${actualPort}${initialPath}`);
                open(`http://${displayHost}:${actualPort}${initialPath}`);
              } else {
                logger.log('CLI', `🌐 Server running at http://${displayHost}:${actualPort}${initialPath}`);
              }
            });
          });

        program.parse(process.argv);
      });
  }

  requireOpen(): Promise<(file: string) => void> {
    return import('open').then((module) => module.default);
  }
}

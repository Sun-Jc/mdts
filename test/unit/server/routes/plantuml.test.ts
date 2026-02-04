import express from 'express';
import request from 'supertest';
import { PassThrough } from 'stream';
import net from 'net';
import { plantumlRouter } from '../../../../src/server/routes/plantuml';

const createPlantumlModule = (svg: string) => ({
  generate: jest.fn(() => {
    const inputStream = new PassThrough();
    const outputStream = new PassThrough();

    inputStream.on('finish', () => {
      outputStream.end(svg);
    });

    return { in: inputStream, out: outputStream };
  }),
});

describe('plantuml.ts', () => {
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

  let app: express.Application;
  let server: import('http').Server | null = null;
  let requestAgent: request.SuperTest<request.Test> | null = null;
  let plantumlModule: ReturnType<typeof createPlantumlModule>;

  beforeEach(() => {
    if (!canListen) {
      return;
    }
    plantumlModule = createPlantumlModule('<svg>diagram</svg>');
    app = express();
    app.use(express.json());
    app.use('/api/plantuml', plantumlRouter(plantumlModule));
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

  describe('POST /svg', () => {
    it('should return 400 if diagram is not provided', async () => {
      if (!requestAgent) {
        return;
      }
      const response = await requestAgent
        .post('/api/plantuml/svg')
        .send({});

      expect(response.statusCode).toBe(400);
      expect(response.text).toBe('diagram body parameter is required.');
    });

    it('should return 400 if diagram is empty string', async () => {
      if (!requestAgent) {
        return;
      }
      const response = await requestAgent
        .post('/api/plantuml/svg')
        .send({ diagram: '' });

      expect(response.statusCode).toBe(400);
      expect(response.text).toBe('diagram body parameter is required.');
    });

    it('should return generated SVG when diagram is provided', async () => {
      if (!requestAgent) {
        return;
      }
      const diagram = '@startuml\nA --> B\n@enduml';
      const response = await requestAgent
        .post('/api/plantuml/svg')
        .send({ diagram });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('image/svg+xml');
      const payload = response.text ?? response.body;
      const svgBody = Buffer.isBuffer(payload) ? payload.toString() : payload;
      expect(svgBody).toBe('<svg>diagram</svg>');
      expect(plantumlModule.generate).toHaveBeenCalledWith({ format: 'svg' });
    });
  });
});

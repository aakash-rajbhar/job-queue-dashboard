import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
// import { describe, it } from 'node:test';

const PREFIX = 'api';
const URL = `/${PREFIX}/jobs`;

describe('Jobs (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdIds: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix(PREFIX);
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    const ids = createdIds.filter(Boolean);
    if (ids.length > 0) {
      await prisma.job.deleteMany({ where: { id: { in: ids } } });
    }
    await app.close();
  });

  const createJob = async (title: string, type: string) => {
    const res = await request(app.getHttpServer())
      .post(URL)
      .send({ title, type });
    if (res.status === 201) createdIds.push(res.body.id);
    return res;
  };

  describe('POST /api/jobs', () => {
    it('creates a job starting in pending', async () => {
      const res = await createJob('E2E create job', 'email');

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        title: 'E2E create job',
        type: 'email',
        status: 'pending',
        version: 0,
      });
      expect(res.body.id).toBeDefined();
    });

    it('rejects an empty title (after trim)', async () => {
      const res = await request(app.getHttpServer())
        .post(URL)
        .send({ title: '   ', type: 'email' });

      expect(res.status).toBe(400);
    });

    it('rejects an unknown type', async () => {
      const res = await request(app.getHttpServer())
        .post(URL)
        .send({ title: 'Bad type', type: 'bogus' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/jobs', () => {
    it('returns the paginated envelope', async () => {
      const res = await request(app.getHttpServer())
        .get(`${URL}?page=1&pageSize=1`);

      expect(res.status).toBe(200);
      expect(res.body.meta).toMatchObject({
        page: 1,
        pageSize: 1,
        totalPages: expect.any(Number),
        total: expect.any(Number),
      });
      expect(res.body.data.length).toBeLessThanOrEqual(1);
    });

    it('filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get(`${URL}?status=pending`);

      expect(res.status).toBe(200);
      expect(
        res.body.data.every((job: { status: string }) => job.status === 'pending'),
      ).toBe(true);
    });

    it('rejects an invalid status', async () => {
      const res = await request(app.getHttpServer())
        .get(`${URL}?status=bogus`);

      expect(res.status).toBe(400);
    });

    it('rejects page = 0', async () => {
      const res = await request(app.getHttpServer()).get(`${URL}?page=0`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/jobs/counts', () => {
    it('returns all four status keys with numeric values', async () => {
      const res = await request(app.getHttpServer()).get(`/${PREFIX}/jobs/counts`);

      expect(res.status).toBe(200);
      for (const status of ['pending', 'running', 'completed', 'failed']) {
        expect(res.body[status]).toEqual(expect.any(Number));
      }
    });
  });

  describe('PATCH /api/jobs/:id/status', () => {
    it('transitions pending -> running -> completed incrementing version', async () => {
      const created = await createJob('Transition job', 'report');
      const id: string = created.body.id;

      const running = await request(app.getHttpServer())
        .patch(`/${PREFIX}/jobs/${id}/status`)
        .send({ status: 'running' });
      expect(running.status).toBe(200);
      expect(running.body).toMatchObject({ status: 'running', version: 1 });

      const completed = await request(app.getHttpServer())
        .patch(`/${PREFIX}/jobs/${id}/status`)
        .send({ status: 'completed' });
      expect(completed.status).toBe(200);
      expect(completed.body).toMatchObject({ status: 'completed', version: 2 });
    });

    it('rejects an illegal transition (running -> running) with 400', async () => {
      const created = await createJob('Illegal transition', 'sync');
      const id: string = created.body.id;

      await request(app.getHttpServer())
        .patch(`/${PREFIX}/jobs/${id}/status`)
        .send({ status: 'running' });

      const res = await request(app.getHttpServer())
        .patch(`/${PREFIX}/jobs/${id}/status`)
        .send({ status: 'running' });
      expect(res.status).toBe(400);
    });

    it('returns 404 for a missing job', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/${PREFIX}/jobs/00000000-0000-0000-0000-000000000000/status`)
        .send({ status: 'running' });

      expect(res.status).toBe(404);
    });
  });

  describe('concurrency', () => {
    it('two simultaneous pending -> running: one 200, one 409', async () => {
      const created = await createJob('Race condition job', 'sync');
      const id: string = created.body.id;

      const req1 = request(app.getHttpServer())
        .patch(`/${PREFIX}/jobs/${id}/status`)
        .send({ status: 'running' });
      const req2 = request(app.getHttpServer())
        .patch(`/${PREFIX}/jobs/${id}/status`)
        .send({ status: 'running' });

      const [res1, res2] = await Promise.all([req1, req2]);

      expect([res1.status, res2.status].sort()).toEqual([200, 409]);

      const updated = await prisma.job.findUnique({ where: { id } });
      expect(updated?.status).toBe('RUNNING');
      expect(updated?.version).toBe(1);
    });
  });

  describe('DELETE /api/jobs/:id', () => {
    it('returns 204 on delete and 404 on second delete', async () => {
      const created = await createJob('Delete me', 'export');
      const id: string = created.body.id;

      const first = await request(app.getHttpServer()).delete(`/${PREFIX}/jobs/${id}`);
      expect(first.status).toBe(204);

      const second = await request(app.getHttpServer()).delete(`/${PREFIX}/jobs/${id}`);
      expect(second.status).toBe(404);
    });
  });
});
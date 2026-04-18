const request = require('supertest');
const app = require('../backend/app');

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/analyze — validation', () => {
  it('returns 400 when no file is uploaded', async () => {
    const res = await request(app).post('/api/analyze');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 when a non-PDF file is uploaded', async () => {
    const res = await request(app)
      .post('/api/analyze')
      .attach('resume', Buffer.from('hello world'), {
        filename: 'test.txt',
        contentType: 'text/plain',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/PDF/i);
  });

  it('returns 400 when file exceeds 5MB', async () => {
    const bigBuffer = Buffer.alloc(6 * 1024 * 1024, 'x');
    const res = await request(app)
      .post('/api/analyze')
      .attach('resume', bigBuffer, {
        filename: 'big.pdf',
        contentType: 'application/pdf',
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/large/i);
  });
});

describe('parseClaudeResponse', () => {
  const { parseClaudeResponse } = require('../backend/analyzer');

  it('parses clean JSON', () => {
    const json = JSON.stringify({ score: 75 });
    expect(parseClaudeResponse(json)).toEqual({ score: 75 });
  });

  it('strips markdown code fences', () => {
    const wrapped = '```json\n{"score":80}\n```';
    expect(parseClaudeResponse(wrapped)).toEqual({ score: 80 });
  });

  it('strips bare code fences', () => {
    const wrapped = '```\n{"score":65}\n```';
    expect(parseClaudeResponse(wrapped)).toEqual({ score: 65 });
  });

  it('throws on invalid JSON', () => {
    expect(() => parseClaudeResponse('not json')).toThrow();
  });
});

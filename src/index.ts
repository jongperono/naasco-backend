import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import 'dotenv/config';

const app = new Hono();

// Middleware
app.use('/*', cors());

// Test routes
app.get('/', (c) => {
  return c.json({
    message: 'NAASCO Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/api/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (c) => {
  return c.json({
    message: 'Test endpoint working!',
    data: {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    }
  });
});

// Test POST endpoint
app.post('/api/test', async (c) => {
  const body = await c.req.json();
  return c.json({
    message: 'POST request received',
    receivedData: body,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    path: c.req.path
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message
  }, 500);
});

const port = parseInt(process.env.PORT || '3001');

console.log(`🚀 Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});

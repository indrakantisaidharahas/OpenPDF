import { createClient } from 'redis';

const client = createClient({
  socket: {
    host: '127.0.0.1',
    port: 6379
  }
});

client.on('error', (err) => console.error('Redis error:', err));

async function run() {
  await client.connect();
  console.log('Connected to Redis1');

  await client.set('key', '123');
  const value = await client.get('key');
  console.log('VALUE:', value);

  await client.quit();
}

run();

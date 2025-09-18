import { database } from '../src/services/Database';
import { redis } from '../src/services/Redis';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://chat_user:chat_password@localhost:5432/chat_db_test';
process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use database 1 for tests

// Global test setup
beforeAll(async () => {
  // Connect to test databases
  await redis.connect();
  await database.testConnection();
});

// Clean up between tests
beforeEach(async () => {
  // Clear Redis test database
  await redis.flushAll();
});

// Global test teardown
afterAll(async () => {
  // Clean up connections
  await redis.disconnect();
  await database.close();
});

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
});
// Jest test setup file
import dotenv from 'dotenv';

// Load environment variables for testing
dotenv.config();

// Set default test environment variables
process.env.NODE_ENV = 'test';
// Avoid db.ts throwing when loading modules (unit tests mock databaseService)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ai_agent_chat_test';
}


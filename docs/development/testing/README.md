# Testing Documentation

## 🎯 Overview

Backend testing documentation for the AI Agent Chat project. Tests are implemented with Jest to ensure quality and reliability.

> **Frontend testing** documentation lives in the [ao-chat](https://github.com/orsinialberto/ao-chat) repository.

## 📚 Available Documentation

### Backend Testing
- **[Complete Guide](./backend-testing.md)** - How to test the backend with Jest
- Unit tests for services
- E2E tests for the API

## 🚀 Quick Start

### Run All Tests
```bash
cd backend && npm test
```

### Run Tests in Watch Mode
```bash
cd backend && npm run test:watch
```

## 📊 Test Statistics

### Backend (Jest)
- **Framework**: Jest + ts-jest
- **Test files**: 8
  - `gemini.test.ts` - Gemini service tests
  - `e2e.test.ts` - E2E tests
  - `controllers/chatController.test.ts` - Chat controller tests
  - `controllers/healthController.test.ts` - Health controller tests
  - `middleware/errorHandler.test.ts` - Error handler tests
  - `middleware/logger.test.ts` - Request logger tests
  - `services/mcpClient.test.ts` - MCP client tests
  - `services/mcpContextService.test.ts` - MCP context tests
- **Test cases**: ~50+
- **Coverage**: In development

## 🎯 Best Practices

### Writing Tests
1. **Use descriptive names**: `it('should handle empty message content')`
2. **Isolated tests**: Each test must be independent
3. **AAA Pattern**: Arrange, Act, Assert
4. **Appropriate mocking**: Mock only what is necessary

### Organization
```
backend/
  src/
    test/              # Test files
      controllers/     # Controller tests
        chatController.test.ts
        healthController.test.ts
      middleware/      # Middleware tests
        errorHandler.test.ts
        logger.test.ts
      services/        # Service tests
        mcpClient.test.ts
        mcpContextService.test.ts
      gemini.test.ts   # Gemini service tests
      e2e.test.ts      # E2E tests
      setup.ts         # Jest setup
```

### Configuration - jest.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
};
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Best Practices](./../best-practices.md)

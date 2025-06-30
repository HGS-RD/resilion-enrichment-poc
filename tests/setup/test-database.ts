import { randomUUID } from 'crypto'

let testDbUrl: string | null = null

export async function createTestDatabase(): Promise<string> {
  // For integration tests, we'll use the existing test database
  // In a real scenario, you might create a separate test database
  const baseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db'
  
  // Add a unique identifier to avoid conflicts
  const testId = randomUUID().slice(0, 8)
  testDbUrl = `${baseUrl}?test_id=${testId}`
  
  return testDbUrl
}

export async function cleanupTestDatabase(): Promise<void> {
  // In a real scenario, you would clean up the test database here
  // For now, we'll just reset the URL
  testDbUrl = null
}

export function getTestDatabaseUrl(): string | null {
  return testDbUrl
}

export async function resetTestData(): Promise<void> {
  // This would typically truncate tables or reset to known state
  // Implementation depends on your database setup
  console.log('Resetting test data...')
}

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * Health Check Endpoint
 * 
 * Checks the health of the application and its dependencies.
 * Used by DigitalOcean App Platform for health monitoring.
 */

export async function GET(request: NextRequest) {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'unknown',
      environment_variables: 'unknown'
    }
  };

  try {
    // Check database connection
    if (process.env.DATABASE_URL) {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        await pool.end();
        healthCheck.checks.database = 'healthy';
      } catch (dbError) {
        console.error('Database health check failed:', dbError);
        healthCheck.checks.database = 'unhealthy';
        healthCheck.status = 'degraded';
      }
    } else {
      healthCheck.checks.database = 'not_configured';
      healthCheck.status = 'degraded';
    }

    // Check required environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'OPENAI_API_KEY',
      'PINECONE_API_KEY',
      'PINECONE_INDEX_NAME'
    ];

    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length === 0) {
      healthCheck.checks.environment_variables = 'healthy';
    } else {
      healthCheck.checks.environment_variables = 'unhealthy';
      healthCheck.status = 'degraded';
      console.warn('Missing environment variables:', missingEnvVars);
    }

    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 503;
    
    return NextResponse.json(healthCheck, { status: statusCode });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: healthCheck.checks
    }, { status: 503 });
  }
}

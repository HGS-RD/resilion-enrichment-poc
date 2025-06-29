#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Coverage threshold checker for Resilion Enrichment POC
 * Enforces 99% global coverage with 100% for critical components
 */

const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');
const THRESHOLDS = {
  global: {
    branches: 99,
    functions: 99,
    lines: 99,
    statements: 99
  },
  services: {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100
  },
  api: {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100
  }
};

function checkCoverage() {
  console.log('🔍 Checking test coverage thresholds...\n');

  // Check if coverage file exists
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage file not found. Run tests with coverage first.');
    process.exit(1);
  }

  // Read coverage data
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const { total } = coverage;

  let hasFailures = false;

  // Check global coverage
  console.log('📊 Global Coverage:');
  const globalChecks = [
    { name: 'Branches', actual: total.branches.pct, threshold: THRESHOLDS.global.branches },
    { name: 'Functions', actual: total.functions.pct, threshold: THRESHOLDS.global.functions },
    { name: 'Lines', actual: total.lines.pct, threshold: THRESHOLDS.global.lines },
    { name: 'Statements', actual: total.statements.pct, threshold: THRESHOLDS.global.statements }
  ];

  globalChecks.forEach(check => {
    const status = check.actual >= check.threshold ? '✅' : '❌';
    const color = check.actual >= check.threshold ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`  ${status} ${check.name}: ${color}${check.actual}%${reset} (threshold: ${check.threshold}%)`);
    
    if (check.actual < check.threshold) {
      hasFailures = true;
    }
  });

  // Check specific file patterns
  console.log('\n🎯 Component-Specific Coverage:');
  
  const serviceFiles = Object.keys(coverage).filter(file => 
    file.includes('/lib/services/') || file.includes('/services/')
  );
  
  const apiFiles = Object.keys(coverage).filter(file => 
    file.includes('/app/api/') || file.includes('/api/')
  );

  // Check services coverage
  if (serviceFiles.length > 0) {
    console.log('\n  📦 Services:');
    serviceFiles.forEach(file => {
      const fileCoverage = coverage[file];
      const checks = [
        { name: 'Branches', actual: fileCoverage.branches.pct, threshold: THRESHOLDS.services.branches },
        { name: 'Functions', actual: fileCoverage.functions.pct, threshold: THRESHOLDS.services.functions },
        { name: 'Lines', actual: fileCoverage.lines.pct, threshold: THRESHOLDS.services.lines },
        { name: 'Statements', actual: fileCoverage.statements.pct, threshold: THRESHOLDS.services.statements }
      ];

      const fileName = path.basename(file);
      const hasFileFailures = checks.some(check => check.actual < check.threshold);
      
      if (hasFileFailures) {
        console.log(`    ❌ ${fileName}:`);
        checks.forEach(check => {
          if (check.actual < check.threshold) {
            console.log(`      - ${check.name}: ${check.actual}% (needs ${check.threshold}%)`);
          }
        });
        hasFailures = true;
      } else {
        console.log(`    ✅ ${fileName}: All thresholds met`);
      }
    });
  }

  // Check API routes coverage
  if (apiFiles.length > 0) {
    console.log('\n  🌐 API Routes:');
    apiFiles.forEach(file => {
      const fileCoverage = coverage[file];
      const checks = [
        { name: 'Branches', actual: fileCoverage.branches.pct, threshold: THRESHOLDS.api.branches },
        { name: 'Functions', actual: fileCoverage.functions.pct, threshold: THRESHOLDS.api.functions },
        { name: 'Lines', actual: fileCoverage.lines.pct, threshold: THRESHOLDS.api.lines },
        { name: 'Statements', actual: fileCoverage.statements.pct, threshold: THRESHOLDS.api.statements }
      ];

      const fileName = path.basename(file);
      const hasFileFailures = checks.some(check => check.actual < check.threshold);
      
      if (hasFileFailures) {
        console.log(`    ❌ ${fileName}:`);
        checks.forEach(check => {
          if (check.actual < check.threshold) {
            console.log(`      - ${check.name}: ${check.actual}% (needs ${check.threshold}%)`);
          }
        });
        hasFailures = true;
      } else {
        console.log(`    ✅ ${fileName}: All thresholds met`);
      }
    });
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  
  if (hasFailures) {
    console.log('❌ Coverage check FAILED');
    console.log('\n💡 Tips to improve coverage:');
    console.log('  • Add tests for uncovered branches and functions');
    console.log('  • Test error handling paths');
    console.log('  • Add edge case testing');
    console.log('  • Use `npm run test:coverage` to see detailed report');
    console.log('  • Open coverage/index.html for visual coverage report');
    process.exit(1);
  } else {
    console.log('✅ All coverage thresholds met!');
    console.log(`\n🎉 Global coverage: ${total.lines.pct}% lines, ${total.branches.pct}% branches`);
    console.log('📈 Ready for deployment!');
    process.exit(0);
  }
}

// Run the coverage check
try {
  checkCoverage();
} catch (error) {
  console.error('❌ Error checking coverage:', error.message);
  process.exit(1);
}

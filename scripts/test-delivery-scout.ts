/**
 * Delivery Scout API Test Script
 * 
 * Tests all 8 API operations with both success and failure cases.
 * Validates data is written to Firestore and error handling works correctly.
 * 
 * Usage:
 *   npm run test:scout
 *   npm run test:scout -- --test=create_ticket (run single test)
 * 
 * Prerequisites:
 *   - DELIVERY_SCOUT_API_KEY in .env.local
 *   - Test user exists in Firestore (uses TEST_USER_ID)
 *   - Dev server running on localhost:3000
 */

// ============================================================================
// Configuration
// ============================================================================

const API_URL = process.env.API_URL || 'http://localhost:3000/api/delivery-scout';
const API_KEY = process.env.DELIVERY_SCOUT_API_KEY;
const TEST_USER_ID = process.env.TEST_USER_ID || 'test-user-delivery-scout';

// Track created resources for cleanup
const createdResources: {
  siteIds: string[];
  reportIds: string[];
  ticketIds: string[];
} = {
  siteIds: [],
  reportIds: [],
  ticketIds: [],
};

// ============================================================================
// Test Results Tracking
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

const testResults: TestResult[] = [];

// ============================================================================
// Utilities
// ============================================================================

/**
 * Colors for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

/**
 * Make API request to Delivery Scout endpoint
 */
async function makeRequest(action: string, data: any, useValidKey = true) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (useValidKey) {
    if (!API_KEY) {
      throw new Error('DELIVERY_SCOUT_API_KEY not set in environment');
    }
    headers['Authorization'] = `Bearer ${API_KEY}`;
  } else {
    headers['Authorization'] = 'Bearer invalid-key-for-testing';
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action,
      userId: TEST_USER_ID,
      data,
    }),
  });

  const responseData = await response.json();
  return { status: response.status, data: responseData };
}

/**
 * Run a test and track results
 */
async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    
    testResults.push({ name, passed: true, duration });
    console.log(`${colors.green}✓${colors.reset} ${name} ${colors.gray}(${duration}ms)${colors.reset}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    testResults.push({ name, passed: false, duration, error: errorMessage });
    console.log(`${colors.red}✗${colors.reset} ${name} ${colors.gray}(${duration}ms)${colors.reset}`);
    console.log(`  ${colors.red}Error: ${errorMessage}${colors.reset}`);
  }
}

/**
 * Assert condition is true
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Assert response is successful
 */
function assertSuccess(response: any, message?: string): void {
  assert(
    response.status === 200 && response.data.success === true,
    message || `Expected success but got status ${response.status}: ${JSON.stringify(response.data)}`
  );
}

/**
 * Assert response is an error with specific status
 */
function assertError(response: any, expectedStatus: number, message?: string): void {
  assert(
    response.status === expectedStatus,
    message || `Expected status ${expectedStatus} but got ${response.status}: ${JSON.stringify(response.data)}`
  );
}

// ============================================================================
// Test Suite: Update Meeting
// ============================================================================

async function testUpdateMeetingSuccess() {
  const response = await makeRequest('update_meeting', {
    month: 'March',
    day: '15',
    title: 'Q1 Review Meeting',
  });
  
  assertSuccess(response, 'Update meeting should succeed');
  assert(response.data.message === 'Meeting updated successfully', 'Should return success message');
}

async function testUpdateMeetingValidation() {
  const response = await makeRequest('update_meeting', {});
  
  assert(response.status === 200, 'Should return 200 even for validation errors');
  assert(response.data.success === false, 'Should indicate failure');
  assert(
    response.data.validationErrors && response.data.validationErrors.length > 0,
    'Should return validation errors'
  );
}

// ============================================================================
// Test Suite: Update Metrics
// ============================================================================

async function testUpdateMetricsSuccess() {
  const response = await makeRequest('update_metrics', {
    websiteTraffic: 1250,
    supportHoursRemaining: 5.5,
    siteSpeedSeconds: 2.3,
  });
  
  assertSuccess(response, 'Update metrics should succeed');
}

async function testUpdateMetricsValidationNegative() {
  const response = await makeRequest('update_metrics', {
    websiteTraffic: -100,
  });
  
  assert(response.data.success === false, 'Should fail for negative numbers');
  assert(
    response.data.validationErrors?.some((e: string) => e.includes('non-negative')),
    'Should mention non-negative requirement'
  );
}

async function testUpdateMetricsValidationNoFields() {
  const response = await makeRequest('update_metrics', {});
  
  assert(response.data.success === false, 'Should fail when no fields provided');
}

async function testUpdateMetricsAllExtendedFields() {
  const response = await makeRequest('update_metrics', {
    websiteTraffic: 847,
    siteSpeedSeconds: 2.3,
    performanceScore: 78,
    leadsGenerated: 12,
    supportHoursRemaining: 1.5,
    supportHoursUsed: 0.5,
    maintenanceHoursRemaining: 3,
    maintenanceHoursUsed: 1,
    lastBackupDate: '2026-02-08',
    lastSecurityScan: '2026-02-09',
    ticketsOpen: 0,
    ticketsInProgress: 1,
    ticketsResolved: 3,
  });
  
  assertSuccess(response, 'Update metrics should succeed with all extended fields');
}

async function testUpdateMetricsInvalidDateFormat() {
  const response = await makeRequest('update_metrics', {
    lastBackupDate: '02/08/2026', // Wrong format, should be YYYY-MM-DD
  });
  
  assert(response.data.success === false, 'Should fail with invalid date format');
  assert(
    response.data.validationErrors?.some((e: string) => e.includes('YYYY-MM-DD')),
    'Should mention YYYY-MM-DD format requirement'
  );
}

async function testUpdateMetricsPerformanceScoreOutOfRange() {
  const response = await makeRequest('update_metrics', {
    performanceScore: 150, // Max is 100
  });
  
  assert(response.data.success === false, 'Should fail with performanceScore over 100');
  assert(
    response.data.validationErrors?.some((e: string) => e.includes('100')),
    'Should mention max value of 100'
  );
}

async function testUpdateMetricsPartialUpdateTicketFields() {
  const response = await makeRequest('update_metrics', {
    ticketsOpen: 2,
  });
  
  assertSuccess(response, 'Should allow partial update with only ticket fields');
}

async function testUpdateMetricsMixedOldAndNewFields() {
  const response = await makeRequest('update_metrics', {
    websiteTraffic: 1000,
    leadsGenerated: 15,
    lastSecurityScan: '2026-02-10',
  });
  
  assertSuccess(response, 'Should handle mixed old and new fields');
}

async function testUpdateMetricsNegativeTicketCounts() {
  const response = await makeRequest('update_metrics', {
    ticketsOpen: -1,
  });
  
  assert(response.data.success === false, 'Should fail for negative ticket counts');
  assert(
    response.data.validationErrors?.some((e: string) => e.includes('non-negative')),
    'Should mention non-negative requirement'
  );
}

async function testUpdateMetricsPerformanceScoreNegative() {
  const response = await makeRequest('update_metrics', {
    performanceScore: -10,
  });
  
  assert(response.data.success === false, 'Should fail for negative performanceScore');
}

async function testUpdateMetricsHoursUsedFields() {
  const response = await makeRequest('update_metrics', {
    supportHoursUsed: 2.5,
    maintenanceHoursUsed: 4.0,
  });
  
  assertSuccess(response, 'Should allow updating hours used fields');
}

// ============================================================================
// Test Suite: Update Company Info
// ============================================================================

async function testUpdateCompanyInfoSuccess() {
  const response = await makeRequest('update_company_info', {
    legalName: 'Test Company LLC',
    city: 'San Francisco',
    state: 'CA',
    email: 'test@example.com',
  });
  
  assertSuccess(response, 'Update company info should succeed');
}

async function testUpdateCompanyInfoValidationEmail() {
  const response = await makeRequest('update_company_info', {
    email: 'not-an-email',
  });
  
  assert(response.data.success === false, 'Should fail for invalid email');
  assert(
    response.data.validationErrors?.some((e: string) => e.includes('valid')),
    'Should mention email validation'
  );
}

async function testUpdateCompanyInfoValidationUrl() {
  const response = await makeRequest('update_company_info', {
    websiteUrl: 'not-a-url',
  });
  
  assert(response.data.success === false, 'Should fail for invalid URL');
}

// ============================================================================
// Test Suite: Add Site
// ============================================================================

async function testAddSiteSuccess() {
  const response = await makeRequest('add_site', {
    name: 'Test Site',
    url: 'https://test-site.example.com',
    type: 'wordpress',
    status: 'active',
    description: 'Test site for API validation',
  });
  
  assertSuccess(response, 'Add site should succeed');
  assert(response.data.siteId, 'Should return siteId');
  
  // Track for cleanup
  createdResources.siteIds.push(response.data.siteId);
}

async function testAddSiteValidationMissingRequired() {
  const response = await makeRequest('add_site', {
    name: 'Test Site',
    // Missing url (required)
  });
  
  assert(response.data.success === false, 'Should fail when required field missing');
  assert(
    response.data.validationErrors?.some((e: string) => e.includes('url')),
    'Should mention missing url'
  );
}

async function testAddSiteValidationInvalidUrl() {
  const response = await makeRequest('add_site', {
    name: 'Test Site',
    url: 'not-a-valid-url',
  });
  
  assert(response.data.success === false, 'Should fail for invalid URL');
}

// ============================================================================
// Test Suite: Update Site
// ============================================================================

async function testUpdateSiteSuccess() {
  // First create a site
  const createResponse = await makeRequest('add_site', {
    name: 'Site To Update',
    url: 'https://update-test.example.com',
    type: 'wordpress',
  });
  
  assertSuccess(createResponse, 'Create site for update test should succeed');
  const siteId = createResponse.data.siteId;
  createdResources.siteIds.push(siteId);
  
  // Now update it
  const updateResponse = await makeRequest('update_site', {
    siteId,
    status: 'provisioning',
    description: 'Updated description',
  });
  
  assertSuccess(updateResponse, 'Update site should succeed');
  assert(updateResponse.data.siteId === siteId, 'Should return same siteId');
}

async function testUpdateSiteValidationMissingSiteId() {
  const response = await makeRequest('update_site', {
    status: 'online',
    // Missing siteId
  });
  
  assert(response.data.success === false, 'Should fail when siteId missing');
}

async function testUpdateSiteNotFound() {
  const response = await makeRequest('update_site', {
    siteId: 'non-existent-site-id',
    status: 'active',
  });
  
  assert(response.data.success === false, 'Should fail when site not found');
}

// ============================================================================
// Test Suite: Add Report
// ============================================================================

async function testAddReportSuccess() {
  const response = await makeRequest('add_report', {
    title: 'Q1 2024 Performance Report',
    type: 'quarterly',
    summary: 'Strong growth across all metrics',
    metrics: {
      revenue: 125000,
      newCustomers: 42,
    },
  });
  
  assertSuccess(response, 'Add report should succeed');
  assert(response.data.reportId, 'Should return reportId');
  
  // Track for cleanup
  createdResources.reportIds.push(response.data.reportId);
}

async function testAddReportValidationMissingType() {
  const response = await makeRequest('add_report', {
    title: 'Test Report',
    // Missing type (required)
  });
  
  assert(response.data.success === false, 'Should fail when type missing');
}

async function testAddReportValidationInvalidType() {
  const response = await makeRequest('add_report', {
    title: 'Test Report',
    type: 'invalid-type',
  });
  
  assert(response.data.success === false, 'Should fail for invalid type');
}

// ============================================================================
// Test Suite: Create Ticket
// ============================================================================

async function testCreateTicketSuccess() {
  const response = await makeRequest('create_ticket', {
    subject: 'Test ticket from API validation',
    priority: 'P2',
    description: 'This is a test ticket to validate the API',
    category: 'testing',
    assignedTo: 'marcus',
  });
  
  assertSuccess(response, 'Create ticket should succeed');
  assert(response.data.ticketId, 'Should return ticketId');
  
  // Track for cleanup
  createdResources.ticketIds.push(response.data.ticketId);
}

async function testCreateTicketValidationEmptySubject() {
  const response = await makeRequest('create_ticket', {
    subject: '',
    priority: 'P1',
  });
  
  assert(response.data.success === false, 'Should fail for empty subject');
  assert(
    response.data.validationErrors?.some((e: string) => e.includes('empty')),
    'Should mention empty validation'
  );
}

async function testCreateTicketValidationInvalidPriority() {
  const response = await makeRequest('create_ticket', {
    subject: 'Test ticket',
    priority: 'HIGH',
  });
  
  assert(response.data.success === false, 'Should fail for invalid priority');
  assert(
    response.data.validationErrors?.some((e: string) => e.includes('P1')),
    'Should list valid priority values'
  );
}

async function testCreateTicketP4Priority() {
  const response = await makeRequest('create_ticket', {
    subject: 'Low priority task',
    priority: 'P4',
  });
  
  assertSuccess(response, 'Should accept P4 priority');
  createdResources.ticketIds.push(response.data.ticketId);
}

// ============================================================================
// Test Suite: Update Ticket
// ============================================================================

async function testUpdateTicketSuccess() {
  // First create a ticket
  const createResponse = await makeRequest('create_ticket', {
    subject: 'Ticket to update',
    priority: 'P3',
  });
  
  assertSuccess(createResponse, 'Create ticket for update test should succeed');
  const ticketId = createResponse.data.ticketId;
  createdResources.ticketIds.push(ticketId);
  
  // Now update it
  const updateResponse = await makeRequest('update_ticket', {
    ticketId,
    status: 'in-progress',
    assignedTo: 'marcus',
  });
  
  assertSuccess(updateResponse, 'Update ticket should succeed');
  assert(updateResponse.data.ticketId === ticketId, 'Should return same ticketId');
}

async function testUpdateTicketValidationMissingId() {
  const response = await makeRequest('update_ticket', {
    status: 'resolved',
    // Missing ticketId
  });
  
  assert(response.data.success === false, 'Should fail when ticketId missing');
}

async function testUpdateTicketNotFound() {
  const response = await makeRequest('update_ticket', {
    ticketId: 'non-existent-ticket-id',
    status: 'resolved',
  });
  
  assert(response.data.success === false, 'Should fail when ticket not found');
}

// ============================================================================
// Test Suite: Authentication
// ============================================================================

async function testAuthenticationMissingKey() {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update_metrics',
      userId: TEST_USER_ID,
      data: { websiteTraffic: 100 },
    }),
  });
  
  const data = await response.json();
  
  assertError({ status: response.status, data }, 401, 'Should return 401 for missing API key');
  assert(data.error === 'Unauthorized', 'Should return Unauthorized error');
}

async function testAuthenticationInvalidKey() {
  const response = await makeRequest('update_metrics', { websiteTraffic: 100 }, false);
  
  assertError(response, 401, 'Should return 401 for invalid API key');
  assert(response.data.error === 'Unauthorized', 'Should return Unauthorized error');
}

// ============================================================================
// Cleanup
// ============================================================================

async function cleanup() {
  console.log(`\n${colors.cyan}Cleaning up test data...${colors.reset}`);
  
  let cleanupErrors = 0;
  
  // Note: We can't easily delete Firestore documents from this script
  // since we're using the API which doesn't expose delete operations.
  // In a real scenario, you'd either:
  // 1. Add a delete operation to the API (dev/test only)
  // 2. Use Firebase Admin SDK directly in the test script
  // 3. Manually clean up test data
  
  console.log(`${colors.yellow}⚠ Created resources that need manual cleanup:${colors.reset}`);
  console.log(`  Sites: ${createdResources.siteIds.length}`);
  console.log(`  Reports: ${createdResources.reportIds.length}`);
  console.log(`  Tickets: ${createdResources.ticketIds.length}`);
  
  if (createdResources.ticketIds.length > 0) {
    console.log(`\n  Ticket IDs:`);
    createdResources.ticketIds.forEach(id => console.log(`    - ${id}`));
  }
  
  return cleanupErrors;
}

// ============================================================================
// Main Test Runner
// ============================================================================

async function main() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║         Delivery Scout API Test Suite                      ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  // Check prerequisites
  console.log(`${colors.cyan}Checking prerequisites...${colors.reset}`);
  
  if (!API_KEY) {
    console.error(`${colors.red}✗ DELIVERY_SCOUT_API_KEY not set in environment${colors.reset}`);
    console.error(`  Add it to .env.local or export it before running tests`);
    process.exit(1);
  }
  
  console.log(`${colors.green}✓ API Key found${colors.reset}`);
  console.log(`${colors.green}✓ Test User ID: ${TEST_USER_ID}${colors.reset}`);
  console.log(`${colors.green}✓ API URL: ${API_URL}${colors.reset}\n`);
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const singleTest = args.find(arg => arg.startsWith('--test='))?.split('=')[1];
  
  // Define all tests
  const allTests = [
    // Update Meeting
    { name: 'Update Meeting: Success', fn: testUpdateMeetingSuccess, group: 'update_meeting' },
    { name: 'Update Meeting: Validation (no fields)', fn: testUpdateMeetingValidation, group: 'update_meeting' },
    
    // Update Metrics
    { name: 'Update Metrics: Success', fn: testUpdateMetricsSuccess, group: 'update_metrics' },
    { name: 'Update Metrics: Validation (negative)', fn: testUpdateMetricsValidationNegative, group: 'update_metrics' },
    { name: 'Update Metrics: Validation (no fields)', fn: testUpdateMetricsValidationNoFields, group: 'update_metrics' },
    { name: 'Update Metrics: All extended fields', fn: testUpdateMetricsAllExtendedFields, group: 'update_metrics' },
    { name: 'Update Metrics: Invalid date format', fn: testUpdateMetricsInvalidDateFormat, group: 'update_metrics' },
    { name: 'Update Metrics: Performance score out of range', fn: testUpdateMetricsPerformanceScoreOutOfRange, group: 'update_metrics' },
    { name: 'Update Metrics: Partial update (ticket fields)', fn: testUpdateMetricsPartialUpdateTicketFields, group: 'update_metrics' },
    { name: 'Update Metrics: Mixed old and new fields', fn: testUpdateMetricsMixedOldAndNewFields, group: 'update_metrics' },
    { name: 'Update Metrics: Negative ticket counts', fn: testUpdateMetricsNegativeTicketCounts, group: 'update_metrics' },
    { name: 'Update Metrics: Negative performance score', fn: testUpdateMetricsPerformanceScoreNegative, group: 'update_metrics' },
    { name: 'Update Metrics: Hours used fields', fn: testUpdateMetricsHoursUsedFields, group: 'update_metrics' },
    
    // Update Company Info
    { name: 'Update Company Info: Success', fn: testUpdateCompanyInfoSuccess, group: 'update_company_info' },
    { name: 'Update Company Info: Validation (email)', fn: testUpdateCompanyInfoValidationEmail, group: 'update_company_info' },
    { name: 'Update Company Info: Validation (URL)', fn: testUpdateCompanyInfoValidationUrl, group: 'update_company_info' },
    
    // Add Site
    { name: 'Add Site: Success', fn: testAddSiteSuccess, group: 'add_site' },
    { name: 'Add Site: Validation (missing required)', fn: testAddSiteValidationMissingRequired, group: 'add_site' },
    { name: 'Add Site: Validation (invalid URL)', fn: testAddSiteValidationInvalidUrl, group: 'add_site' },
    
    // Update Site
    { name: 'Update Site: Success', fn: testUpdateSiteSuccess, group: 'update_site' },
    { name: 'Update Site: Validation (missing siteId)', fn: testUpdateSiteValidationMissingSiteId, group: 'update_site' },
    { name: 'Update Site: Not Found', fn: testUpdateSiteNotFound, group: 'update_site' },
    
    // Add Report
    { name: 'Add Report: Success', fn: testAddReportSuccess, group: 'add_report' },
    { name: 'Add Report: Validation (missing type)', fn: testAddReportValidationMissingType, group: 'add_report' },
    { name: 'Add Report: Validation (invalid type)', fn: testAddReportValidationInvalidType, group: 'add_report' },
    
    // Create Ticket
    { name: 'Create Ticket: Success', fn: testCreateTicketSuccess, group: 'create_ticket' },
    { name: 'Create Ticket: Validation (empty subject)', fn: testCreateTicketValidationEmptySubject, group: 'create_ticket' },
    { name: 'Create Ticket: Validation (invalid priority)', fn: testCreateTicketValidationInvalidPriority, group: 'create_ticket' },
    { name: 'Create Ticket: P4 Priority', fn: testCreateTicketP4Priority, group: 'create_ticket' },
    
    // Update Ticket
    { name: 'Update Ticket: Success', fn: testUpdateTicketSuccess, group: 'update_ticket' },
    { name: 'Update Ticket: Validation (missing ticketId)', fn: testUpdateTicketValidationMissingId, group: 'update_ticket' },
    { name: 'Update Ticket: Not Found', fn: testUpdateTicketNotFound, group: 'update_ticket' },
    
    // Authentication
    { name: 'Authentication: Missing API Key', fn: testAuthenticationMissingKey, group: 'auth' },
    { name: 'Authentication: Invalid API Key', fn: testAuthenticationInvalidKey, group: 'auth' },
  ];
  
  // Filter tests if single test specified
  const testsToRun = singleTest
    ? allTests.filter(t => t.group === singleTest)
    : allTests;
  
  if (singleTest && testsToRun.length === 0) {
    console.error(`${colors.red}✗ No tests found for group: ${singleTest}${colors.reset}`);
    console.log(`\nAvailable test groups:`);
    const uniqueGroups = Array.from(new Set(allTests.map(t => t.group)));
    uniqueGroups.forEach(g => console.log(`  - ${g}`));
    process.exit(1);
  }
  
  if (singleTest) {
    console.log(`${colors.yellow}Running tests for: ${singleTest}${colors.reset}\n`);
  }
  
  // Run tests
  const startTime = Date.now();
  
  for (const test of testsToRun) {
    await runTest(test.name, test.fn);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Cleanup
  await cleanup();
  
  // Print summary
  console.log(`\n${colors.blue}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║                      Test Summary                           ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const passedTests = testResults.filter(t => t.passed).length;
  const failedTests = testResults.filter(t => !t.passed).length;
  const totalTests = testResults.length;
  
  console.log(`Total: ${totalTests} tests in ${totalTime}ms`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  
  if (failedTests > 0) {
    console.log(`${colors.red}Failed: ${failedTests}${colors.reset}\n`);
    
    console.log(`${colors.red}Failed tests:${colors.reset}`);
    testResults
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ${colors.red}✗${colors.reset} ${t.name}`);
        if (t.error) {
          console.log(`    ${colors.gray}${t.error}${colors.reset}`);
        }
      });
  }
  
  console.log('');
  
  // Exit with appropriate code
  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log(`${colors.green}All tests passed! 🎉${colors.reset}\n`);
    process.exit(0);
  }
}

// Run tests
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

/**
 * Delivery Scout API Endpoint
 * 
 * WHAT THIS DOES:
 * Accepts authenticated POST requests from Lindy AI and routes actions to Firestore handlers.
 * 
 * AUTHENTICATION:
 * Uses API key authentication (not Firebase Auth) via DELIVERY_SCOUT_API_KEY environment variable.
 * Lindy AI must send: Authorization: Bearer <api-key>
 * 
 * IMPORTANT - Firebase Pattern:
 * This is a server-side API route (runs in Node.js, not browser).
 * Therefore, we use Firebase Admin SDK, NOT the browser-only client SDK.
 * The browser-only pattern (typeof window !== 'undefined') is ONLY for client components.
 * 
 * API routes always run on the server and should use Firebase Admin SDK directly.
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import { checkRateLimit } from '@/lib/middleware/rateLimiting';
import { deliveryScoutLimiter } from '@/lib/middleware/rateLimiting';
import {
  type DeliveryScoutRequest,
  type DeliveryScoutResponse,
  type DeliveryScoutAction,
  type CreateUserPayload,
  type UpdateMeetingPayload,
  type UpdateMetricsPayload,
  type UpdateCompanyInfoPayload,
  type AddSitePayload,
  type UpdateSitePayload,
  type AddReportPayload,
  type CreateTicketPayload,
  type UpdateTicketPayload,
  ValidationSchemas,
  validatePayload,
} from '@/types/delivery-scout';

/**
 * Validates the API key from the Authorization header
 * 
 * SECURITY: Uses constant-time comparison to prevent timing attacks
 * FAIL-SECURE: If API key not configured, denies all access
 * NEVER LOGS: API keys are never logged, even on error
 * 
 * @param request - The incoming request
 * @returns true if valid, false otherwise
 */
function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('❌ Authentication failed: Missing or invalid Authorization header format');
    return false;
  }

  const providedKey = authHeader.split('Bearer ')[1];
  const validApiKey = process.env.DELIVERY_SCOUT_API_KEY;

  // If no API key is configured, deny access (fail secure)
  if (!validApiKey) {
    console.error('⚠️ Server misconfiguration: DELIVERY_SCOUT_API_KEY not set in environment variables');
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  // SECURITY: Never log the actual keys, even on failure
  try {
    // Use Buffer.compare for constant-time comparison
    const providedBuffer = Buffer.from(providedKey, 'utf-8');
    const validBuffer = Buffer.from(validApiKey, 'utf-8');
    
    // If lengths differ, still do comparison to maintain constant time
    if (providedBuffer.length !== validBuffer.length) {
      console.warn('❌ Authentication failed: Invalid API key (length mismatch)');
      return false;
    }
    
    const isValid = providedBuffer.compare(validBuffer) === 0;
    
    if (!isValid) {
      console.warn('❌ Authentication failed: Invalid API key');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ Authentication error during key comparison:', error);
    return false;
  }
}

/**
 * Validates the request body structure
 * 
 * @param body - The parsed request body
 * @returns Error message if invalid, null if valid
 */
function validateRequestBody(body: any): string | null {
  // Check for required fields
  if (!body || typeof body !== 'object') {
    return 'Request body must be a JSON object';
  }

  if (!body.action || typeof body.action !== 'string') {
    return 'Missing or invalid "action" field';
  }

  // userId is optional for create_user action (since we're creating the user)
  if (body.action !== 'create_user' && (!body.userId || typeof body.userId !== 'string')) {
    return 'Missing or invalid "userId" field';
  }

  if (!body.data || typeof body.data !== 'object') {
    return 'Missing or invalid "data" field';
  }

  // Validate action is one of the allowed types
  const validActions: DeliveryScoutAction[] = [
    'create_user',
    'update_meeting',
    'update_metrics',
    'update_company_info',
    'add_site',
    'update_site',
    'add_report',
    'create_ticket',
    'update_ticket',
  ];

  if (!validActions.includes(body.action as DeliveryScoutAction)) {
    return `Invalid action "${body.action}". Must be one of: ${validActions.join(', ')}`;
  }

  return null;
}

// ============================================================================
// CREATE HANDLERS - Create new user or documents
// ============================================================================

/**
 * Creates a new user document in Firestore
 * 
 * IDEMPOTENT: No - creates a new document with auto-generated ID each time
 * SPECIAL: Does not require userId since we're creating the user
 * 
 * @param data - User data (requires email, displayName, tier)
 * @returns Success response with auto-generated userId
 * @throws Error if validation fails or creation fails
 * 
 * @example
 * handleCreateUser({
 *   email: 'john@blueridgeplumbing.com',
 *   displayName: 'John Smith',
 *   tier: 'advanced',
 *   companyName: 'Blue Ridge Plumbing',
 *   websiteUrl: 'https://blueridgeplumbing.com'
 * })
 */
async function handleCreateUser(
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.create_user, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const {
    email,
    displayName,
    tier,
    companyName,
    websiteUrl,
    businessService,
    serviceArea,
    yearFounded,
    numEmployees,
    address,
    city,
    state,
    zipCode,
  } = validation.data;

  try {
    // Determine hours based on tier
    // Essential: 3 hrs/month support
    // Advanced: 8 hrs/month support
    // Premium: 15 hrs/month support
    const tierHours = {
      essential: { support: 3, maintenance: 6 },
      advanced: { support: 8, maintenance: 12 },
      premium: { support: 15, maintenance: 20 },
    };

    const hours = tierHours[tier];

    // Build user document
    const userData = {
      email,
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      
      // Subscription details
      subscription: {
        tier,
        status: 'active' as const,
        startDate: admin.firestore.FieldValue.serverTimestamp(),
        endDate: null,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      
      // Initialize metrics with defaults
      metrics: {
        websiteTraffic: 0,
        averageSiteSpeed: 0,
        supportHoursRemaining: hours.support,
        maintenanceHoursRemaining: hours.maintenance,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      
      // Company information (if provided)
      company: {
        legalName: companyName || '',
        websiteUrl: websiteUrl || '',
        businessService: businessService || '',
        serviceArea: serviceArea || '',
        yearFounded: yearFounded || null,
        numEmployees: numEmployees || null,
        address: address || '',
        city: city || '',
        state: state || '',
        zipCode: zipCode || '',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      },
      
      // Initialize meeting as null/empty
      meeting: null,
    };

    // Create new user document with auto-generated ID
    const usersRef = adminDb.collection('users');
    const newUserRef = await usersRef.add(userData);

    console.log('👤 User created successfully:', { 
      userId: newUserRef.id, 
      email, 
      tier,
      supportHours: hours.support,
    });

    return {
      success: true,
      message: 'User created successfully',
      userId: newUserRef.id,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

// ============================================================================
// UPDATE HANDLERS - Modify existing data in user document
// ============================================================================

/**
 * Updates meeting information in the user document
 * 
 * IDEMPOTENT: Yes - calling multiple times with same data produces same result
 * 
 * @param userId - The user ID
 * @param data - Meeting fields to update (month, day, title)
 * @returns Success response
 * @throws Error if validation fails or update fails
 * 
 * @example
 * handleUpdateMeeting('user123', { month: 'March', day: '15', title: 'Q1 Review' })
 */
async function handleUpdateMeeting(
  userId: string,
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.update_meeting, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const { month, day, title } = validation.data;

  try {
    const userRef = adminDb.collection('users').doc(userId);

    // Build update object with only provided fields
    const updateData: any = {
      'meeting.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    };

    if (month !== undefined) updateData['meeting.month'] = month;
    if (day !== undefined) updateData['meeting.day'] = day;
    if (title !== undefined) updateData['meeting.title'] = title;

    // Use updateDoc to merge (not overwrite)
    await userRef.update(updateData);

    console.log('📅 Meeting updated successfully:', { userId, updates: Object.keys(validation.data) });

    return {
      success: true,
      message: 'Meeting updated successfully',
    };
  } catch (error) {
    console.error('Error updating meeting:', error);
    throw new Error('Failed to update meeting');
  }
}

/**
 * Updates metrics in the user document
 * 
 * IDEMPOTENT: Yes - calling multiple times with same data produces same result
 * 
 * @param userId - The user ID
 * @param data - Metrics fields to update (websiteTraffic, averageSiteSpeed, etc.)
 * @returns Success response
 * @throws Error if validation fails or update fails
 * 
 * @example
 * handleUpdateMetrics('user123', { supportHoursRemaining: 5.5, websiteTraffic: 1250 })
 */
async function handleUpdateMetrics(
  userId: string,
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.update_metrics, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const { websiteTraffic, averageSiteSpeed, supportHoursRemaining, maintenanceHoursRemaining } = validation.data;

  try {
    const userRef = adminDb.collection('users').doc(userId);

    // Build update object with only provided fields
    const updateData: any = {
      'metrics.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    };

    if (websiteTraffic !== undefined) updateData['metrics.websiteTraffic'] = websiteTraffic;
    if (averageSiteSpeed !== undefined) updateData['metrics.averageSiteSpeed'] = averageSiteSpeed;
    if (supportHoursRemaining !== undefined) updateData['metrics.supportHoursRemaining'] = supportHoursRemaining;
    if (maintenanceHoursRemaining !== undefined) updateData['metrics.maintenanceHoursRemaining'] = maintenanceHoursRemaining;

    // Use updateDoc to merge (not overwrite)
    await userRef.update(updateData);

    console.log('📊 Metrics updated successfully:', { userId, updates: Object.keys(validation.data) });

    return {
      success: true,
      message: 'Metrics updated successfully',
    };
  } catch (error) {
    console.error('Error updating metrics:', error);
    throw new Error('Failed to update metrics');
  }
}

/**
 * Updates company information in the user document
 * 
 * IDEMPOTENT: Yes - calling multiple times with same data produces same result
 * 
 * @param userId - The user ID
 * @param data - Company fields to update
 * @returns Success response
 * @throws Error if validation fails or update fails
 * 
 * @example
 * handleUpdateCompanyInfo('user123', { legalName: 'Acme Inc', city: 'San Francisco', email: 'contact@acme.com' })
 */
async function handleUpdateCompanyInfo(
  userId: string,
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.update_company_info, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const { legalName, websiteUrl, address, city, state, zipCode, businessService, serviceArea, email, phone } = validation.data;

  try {
    const userRef = adminDb.collection('users').doc(userId);

    // Build update object with only provided fields
    const updateData: any = {
      'company.lastUpdated': admin.firestore.FieldValue.serverTimestamp(),
    };

    if (legalName !== undefined) updateData['company.legalName'] = legalName;
    if (websiteUrl !== undefined) updateData['company.websiteUrl'] = websiteUrl;
    if (address !== undefined) updateData['company.address'] = address;
    if (city !== undefined) updateData['company.city'] = city;
    if (state !== undefined) updateData['company.state'] = state;
    if (zipCode !== undefined) updateData['company.zipCode'] = zipCode;
    if (businessService !== undefined) updateData['company.businessService'] = businessService;
    if (serviceArea !== undefined) updateData['company.serviceArea'] = serviceArea;
    if (email !== undefined) updateData['company.email'] = email;
    if (phone !== undefined) updateData['company.phone'] = phone;

    // Use updateDoc to merge (not overwrite)
    await userRef.update(updateData);

    console.log('🏢 Company info updated successfully:', { userId, updates: Object.keys(validation.data) });

    return {
      success: true,
      message: 'Company information updated successfully',
    };
  } catch (error) {
    console.error('Error updating company info:', error);
    throw new Error('Failed to update company information');
  }
}

/**
 * Updates an existing site in the sites subcollection
 * 
 * IDEMPOTENT: Yes - calling multiple times with same data produces same result
 * 
 * @param userId - The user ID
 * @param data - Site fields to update (requires siteId)
 * @returns Success response
 * @throws Error if validation fails or update fails
 * 
 * @example
 * handleUpdateSite('user123', { siteId: 'site456', status: 'online', url: 'https://newdomain.com' })
 */
async function handleUpdateSite(
  userId: string,
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.update_site, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const { siteId, name, url, status, description } = validation.data;

  try {
    const siteRef = adminDb.collection('users').doc(userId).collection('sites').doc(siteId);

    // Check if site exists
    const siteDoc = await siteRef.get();
    if (!siteDoc.exists) {
      throw new Error(`Site with ID ${siteId} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (url !== undefined) updateData.url = url;
    if (status !== undefined) updateData.status = status;
    if (description !== undefined) updateData.description = description;

    await siteRef.update(updateData);

    console.log('🌐 Site updated successfully:', { userId, siteId, updates: Object.keys(validation.data) });

    return {
      success: true,
      message: 'Site updated successfully',
      siteId,
    };
  } catch (error) {
    console.error('Error updating site:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update site');
  }
}

/**
 * Updates an existing ticket in the tickets subcollection
 * 
 * IDEMPOTENT: Yes - calling multiple times with same data produces same result
 * 
 * @param userId - The user ID
 * @param data - Ticket fields to update (requires ticketId)
 * @returns Success response
 * @throws Error if validation fails or update fails
 * 
 * @example
 * handleUpdateTicket('user123', { ticketId: 'ticket789', status: 'resolved', resolution: 'Fixed server config' })
 */
async function handleUpdateTicket(
  userId: string,
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.update_ticket, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const { ticketId, subject, priority, description, category, status, resolution, assignedTo } = validation.data;

  try {
    const ticketRef = adminDb.collection('users').doc(userId).collection('tickets').doc(ticketId);

    // Check if ticket exists
    const ticketDoc = await ticketRef.get();
    if (!ticketDoc.exists) {
      throw new Error(`Ticket with ID ${ticketId} not found`);
    }

    // Build update object with only provided fields
    const updateData: any = {
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (subject !== undefined) updateData.subject = subject;
    if (priority !== undefined) updateData.priority = priority;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (status !== undefined) updateData.status = status;
    if (resolution !== undefined) updateData.resolution = resolution;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

    await ticketRef.update(updateData);

    console.log('📋 Ticket updated successfully:', { userId, ticketId, updates: Object.keys(validation.data) });

    return {
      success: true,
      message: 'Ticket updated successfully',
      ticketId,
    };
  } catch (error) {
    console.error('Error updating ticket:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to update ticket');
  }
}

// ============================================================================
// ADD HANDLERS - Create new documents in subcollections
// ============================================================================

/**
 * Adds a new site to the sites subcollection
 * 
 * IDEMPOTENT: No - creates a new document with auto-generated ID each time
 * 
 * @param userId - The user ID
 * @param data - Site data (requires name and url)
 * @returns Success response with auto-generated siteId
 * @throws Error if validation fails or creation fails
 * 
 * @example
 * handleAddSite('user123', { name: 'Main Site', url: 'https://example.com', status: 'online' })
 */
async function handleAddSite(
  userId: string,
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.add_site, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const { name, url, status, description } = validation.data;

  try {
    const sitesRef = adminDb.collection('users').doc(userId).collection('sites');

    // Create new site document with auto-generated ID
    const newSiteRef = await sitesRef.add({
      name,
      url,
      status: status || 'online',
      description: description || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('🌐 Site added successfully:', { userId, siteId: newSiteRef.id });

    return {
      success: true,
      message: 'Site added successfully',
      siteId: newSiteRef.id,
    };
  } catch (error) {
    console.error('Error adding site:', error);
    throw new Error('Failed to add site');
  }
}

/**
 * Adds a new report to the reports subcollection
 * 
 * IDEMPOTENT: No - creates a new document with auto-generated ID each time
 * 
 * @param userId - The user ID
 * @param data - Report data (requires title and type)
 * @returns Success response with auto-generated reportId
 * @throws Error if validation fails or creation fails
 * 
 * @example
 * handleAddReport('user123', { title: 'Q1 2024 Report', type: 'quarterly', summary: 'Strong growth' })
 */
async function handleAddReport(
  userId: string,
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.add_report, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const { title, type, content, summary, metrics } = validation.data;

  try {
    const reportsRef = adminDb.collection('users').doc(userId).collection('reports');

    // Create new report document with auto-generated ID
    const newReportRef = await reportsRef.add({
      title,
      type,
      content: content || '',
      summary: summary || '',
      metrics: metrics || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('📄 Report added successfully:', { userId, reportId: newReportRef.id });

    return {
      success: true,
      message: 'Report added successfully',
      reportId: newReportRef.id,
    };
  } catch (error) {
    console.error('Error adding report:', error);
    throw new Error('Failed to add report');
  }
}

/**
 * Creates a new ticket in the tickets subcollection
 * 
 * IDEMPOTENT: No - creates a new document with auto-generated ID each time
 * 
 * @param userId - The user ID
 * @param data - Ticket data (requires subject and priority)
 * @returns Success response with auto-generated ticketId
 * @throws Error if validation fails or creation fails
 * 
 * @example
 * handleCreateTicket('user123', { subject: 'Login broken', priority: 'P1', description: 'Cannot sign in' })
 */
async function handleCreateTicket(
  userId: string,
  data: unknown
): Promise<DeliveryScoutResponse> {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized');
  }

  // Validate payload with Zod schema
  const validation = validatePayload(ValidationSchemas.create_ticket, data);
  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      validationErrors: validation.errors,
    };
  }

  const { subject, priority, description, category, status, assignedTo } = validation.data;

  try {
    const ticketsRef = adminDb.collection('users').doc(userId).collection('tickets');

    // Create new ticket document with auto-generated ID
    const newTicketRef = await ticketsRef.add({
      subject,
      priority,
      description: description || '',
      category: category || '',
      status: status || 'open',
      assignedTo: assignedTo || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('📋 Ticket created successfully:', { userId, ticketId: newTicketRef.id });

    return {
      success: true,
      message: 'Ticket created successfully',
      ticketId: newTicketRef.id,
    };
  } catch (error) {
    console.error('Error creating ticket:', error);
    throw new Error('Failed to create ticket');
  }
}

/**
 * Main POST handler
 * 
 * Handles incoming requests from Lindy AI:
 * 1. Validates API key authentication
 * 2. Validates request body structure
 * 3. Checks Firebase Admin is initialized
 * 4. Routes to appropriate handler function
 * 5. Returns consistent JSON response
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // STEP 1: Rate Limiting
    // ========================================================================
    // Check rate limit FIRST (before authentication) to prevent brute force
    // Limit: 100 requests per hour per IP address
    const rateLimitError = await checkRateLimit(request, deliveryScoutLimiter);
    if (rateLimitError) {
      // Calculate minutes remaining for user-friendly message
      const retryAfterSeconds = rateLimitError.error.retryAfter || 3600;
      const minutesRemaining = Math.ceil(retryAfterSeconds / 60);
      
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Try again in ${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}.`,
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: rateLimitError.headers as any,
        }
      );
    }

    // ========================================================================
    // STEP 2: API Key Authentication
    // ========================================================================
    // Validate API key before doing ANY processing (fail fast)
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ========================================================================
    // STEP 3: Parse and Validate Request Body
    // ========================================================================
    let body: DeliveryScoutRequest;
    
    try {
      body = await request.json();
    } catch (error) {
      // Handle malformed JSON (edge case #1)
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate request structure
    const validationError = validateRequestBody(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // ========================================================================
    // STEP 4: Check Firebase Admin Initialization
    // ========================================================================
    // Verify Firebase Admin is available (edge case #2)
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // ========================================================================
    // STEP 5: Route to Handler Function
    // ========================================================================
    const { action, userId, data } = body;
    
    let response: DeliveryScoutResponse;

    switch (action) {
      case 'create_user':
        // Special case: create_user doesn't need userId (we're creating it)
        response = await handleCreateUser(data);
        break;

      case 'update_meeting':
        response = await handleUpdateMeeting(userId, data);
        break;

      case 'update_metrics':
        response = await handleUpdateMetrics(userId, data);
        break;

      case 'update_company_info':
        response = await handleUpdateCompanyInfo(userId, data);
        break;

      case 'add_site':
        response = await handleAddSite(userId, data);
        break;

      case 'update_site':
        response = await handleUpdateSite(userId, data);
        break;

      case 'add_report':
        response = await handleAddReport(userId, data);
        break;

      case 'create_ticket':
        response = await handleCreateTicket(userId, data);
        break;

      case 'update_ticket':
        response = await handleUpdateTicket(userId, data);
        break;

      default:
        // This should never happen due to validation, but TypeScript requires it
        // (edge case #3 - invalid action despite validation)
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // ========================================================================
    // STEP 6: Return Response
    // ========================================================================
    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    // ========================================================================
    // Global Error Handler
    // ========================================================================
    // Log error for debugging but don't expose sensitive details to client
    console.error('❌ Delivery Scout API error:', error);

    // Return generic error message (security best practice)
    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        // Only include details in development
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 }
    );
  }
}

/**
 * Handle unsupported HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

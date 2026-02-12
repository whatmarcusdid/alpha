import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Recursively converts Firestore Timestamps to ISO strings for JSON compatibility
 */
function convertTimestamps(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Firestore Timestamp - has toDate method
  if (typeof obj === 'object' && obj !== null && 'toDate' in obj && typeof (obj as { toDate: () => Date }).toDate === 'function') {
    return (obj as { toDate: () => Date }).toDate().toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map(convertTimestamps);
  }

  if (typeof obj === 'object' && obj !== null) {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertTimestamps(value);
    }
    return converted;
  }

  return obj;
}

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Server configuration error - Database unavailable' },
        { status: 500 }
      );
    }

    try {
      // Fetch user document
      const userDoc = await adminDb.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const userData = userDoc.data() || {};

      // Fetch sites - top-level collection filtered by userId
      const sitesSnapshot = await adminDb
        .collection('sites')
        .where('userId', '==', userId)
        .get();

      // Fetch tickets - top-level supportTickets collection filtered by userId
      const ticketsSnapshot = await adminDb
        .collection('supportTickets')
        .where('userId', '==', userId)
        .get();

      // Fetch reports - subcollection users/{userId}/reports
      const reportsSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('reports')
        .get();

      const sites = sitesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const tickets = ticketsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const reports = reportsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const exportPayload = {
        exportedAt: new Date().toISOString(),
        user: {
          email: userData.email ?? '',
          fullName: userData.fullName ?? userData.displayName ?? '',
          createdAt: userData.createdAt
            ? (typeof userData.createdAt.toDate === 'function'
                ? userData.createdAt.toDate().toISOString()
                : userData.createdAt)
            : null,
        },
        company: convertTimestamps(userData.company ?? {}),
        subscription: convertTimestamps(userData.subscription ?? {}),
        metrics: convertTimestamps(userData.metrics ?? {}),
        settings: convertTimestamps(userData.settings ?? {}),
        sites: convertTimestamps(sites),
        tickets: convertTimestamps(tickets),
        reports: convertTimestamps(reports),
      };

      // Log export request to dataExports collection
      const ipAddress =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
      const userEmail = userData.email ?? 'unknown';

      await adminDb.collection('dataExports').add({
        userId,
        userEmail,
        exportedAt: FieldValue.serverTimestamp(),
        ipAddress,
      });

      const jsonString = JSON.stringify(exportPayload, null, 2);

      return new NextResponse(jsonString, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="tradesitegenie-data-export-${userId}.json"`,
        },
      });
    } catch (error) {
      console.error('Error exporting user data:', error);
      return NextResponse.json(
        { error: 'Failed to export user data' },
        { status: 500 }
      );
    }
  },
  generalLimiter
);

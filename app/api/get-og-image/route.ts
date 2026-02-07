import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { validateRequestBody, getOgImageSchema } from '@/lib/validation';

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    try {
      // Validate request body
      const validation = await validateRequestBody(req, getOgImageSchema);
      if (!validation.success) {
        return validation.error;
      }

      let { url } = validation.data;

      let baseUrlObject;
      try {
        baseUrlObject = new URL(url);
      } catch (_) {
        return NextResponse.json(
          { 
            ogImageUrl: null, 
            success: false, 
            error: 'Invalid URL format' 
          },
          { status: 400 }
        );
      }

      const response = await fetch(url);
      if (!response.ok) {
        return NextResponse.json(
          {
            ogImageUrl: null,
            success: false,
            error: `Failed to fetch URL: ${response.statusText}`,
          },
          { status: response.status }
        );
      }

      const html = await response.text();

      // Regex to find the og:image meta tag and extract its content
      const ogImageMatch = html.match(
        /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
      );
      let ogImageUrl = ogImageMatch ? ogImageMatch[1] : null;

      if (ogImageUrl) {
        // Resolve relative URLs to absolute URLs
        const absoluteUrl = new URL(ogImageUrl, baseUrlObject.origin);
        ogImageUrl = absoluteUrl.href;
      }

      return NextResponse.json({ ogImageUrl: ogImageUrl, success: true });

    } catch (error) {
      console.error('Error in get-og-image route:', error);
      return NextResponse.json(
        {
          ogImageUrl: null,
          success: false,
          error: error instanceof Error ? error.message : 'An internal server error occurred',
        },
        { status: 500 }
      );
    }
  },
  generalLimiter // 60 requests per minute per IP - prevents SSRF abuse
);

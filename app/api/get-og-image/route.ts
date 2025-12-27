
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { url } = body;

    if (!url) {
      return NextResponse.json(
        { 
          ogImageUrl: null, 
          success: false, 
          error: 'URL is required' 
        },
        { status: 400 }
      );
    }

    // Ensure the URL has a protocol for fetch to work
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

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
}

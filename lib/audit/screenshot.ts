export type ScreenshotResult =
  | { success: true; buffer: Buffer; contentType: 'image/jpeg' }
  | { success: false; error: string };

const SAFE_ERROR = 'Unable to capture site preview';

export async function captureScreenshot(url: string): Promise<ScreenshotResult> {
  const accessKey = process.env.SCREENSHOTONE_API_KEY;
  if (!accessKey || accessKey.length === 0) {
    return { success: false, error: SAFE_ERROR };
  }

  const endpoint = new URL('https://api.screenshotone.com/take');
  endpoint.searchParams.set('access_key', accessKey);
  endpoint.searchParams.set('url', url);
  endpoint.searchParams.set('viewport_width', '1280');
  endpoint.searchParams.set('viewport_height', '900');
  endpoint.searchParams.set('full_page', 'false');
  endpoint.searchParams.set('format', 'jpg');
  endpoint.searchParams.set('image_quality', '80');
  endpoint.searchParams.set('block_ads', 'true');
  endpoint.searchParams.set('block_cookie_banners', 'true');
  endpoint.searchParams.set('timeout', '5');

  let response: Response;
  try {
    response = await fetch(endpoint.toString(), {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return { success: false, error: SAFE_ERROR };
  }

  if (!response.ok) {
    return { success: false, error: SAFE_ERROR };
  }

  try {
    const bytes = await response.arrayBuffer();
    return {
      success: true,
      buffer: Buffer.from(bytes),
      contentType: 'image/jpeg',
    };
  } catch {
    return { success: false, error: SAFE_ERROR };
  }
}

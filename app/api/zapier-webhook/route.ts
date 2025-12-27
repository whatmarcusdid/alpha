import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const webhookUrl = process.env.NEXT_PUBLIC_ZAPIER_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();

    console.log('📤 Proxying request to Zapier:', body);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Zapier request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Zapier response:', data);

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('❌ Zapier proxy error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

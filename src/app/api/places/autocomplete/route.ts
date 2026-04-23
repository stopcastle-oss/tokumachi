import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get('input');
  if (!input || input.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&language=ja&components=country:jp&types=geocode&key=${key}`;

  const res = await fetch(url);
  const data = await res.json();

  return NextResponse.json({ predictions: data.predictions ?? [] });
}

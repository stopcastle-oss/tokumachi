import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AddressComponent {
  types: string[];
  long_name: string;
}

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get('place_id');
  if (!placeId) {
    return NextResponse.json({ error: 'Missing place_id' }, { status: 400 });
  }

  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,formatted_address,address_components&language=ja&key=${key}`;

  const res = await fetch(url);
  const data = await res.json();
  const result = data.result;

  if (!result) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const components: AddressComponent[] = result.address_components ?? [];
  const name =
    components.find((c) => c.types.includes('sublocality_level_1'))?.long_name ??
    components.find((c) => c.types.includes('locality'))?.long_name ??
    components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name ??
    result.formatted_address;

  return NextResponse.json({
    place_id: placeId,
    name,
    formatted_address: result.formatted_address,
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// Called after client-side OAuth exchange to sync session into server-side cookies
export async function POST(request: NextRequest) {
  const { access_token, refresh_token } = await request.json();

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs: { name: string; value: string; options: Record<string, unknown> }[]) {
          cs.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return res;
}

// Called on logout to clear server-side session cookies
export async function DELETE() {
  const cookieStore = await cookies();
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs: { name: string; value: string; options: Record<string, unknown> }[]) {
          cs.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  await supabase.auth.signOut();
  return res;
}

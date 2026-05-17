import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

const SECRET = process.env.REVALIDATE_SECRET || 'colella-n8n-revalidate-2026'

export async function POST(req: Request) {
  const auth = req.headers.get('x-revalidate-secret')
  if (auth !== SECRET) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const paths: string[] = Array.isArray(body.paths) && body.paths.length
      ? body.paths
      : ['/', '/dashboard/appointments']
    for (const p of paths) revalidatePath(p)
    return NextResponse.json({ ok: true, revalidated: paths })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}

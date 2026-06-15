import { NextResponse } from "next/server";
import { contactFormSchema } from "@/lib/contact-form-schema";
import { forwardContactFormToSendEmail } from "@/lib/supabase/functions-gateway";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = await forwardContactFormToSendEmail(parsed.data);
  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

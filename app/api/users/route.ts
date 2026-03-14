export async function GET() {
  return Response.json({ ok: true, resource: "users" });
}
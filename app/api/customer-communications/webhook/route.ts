// Intentionally unavailable in every deployed environment in CC-012.
// Isolated verification exercises the trusted controller directly.
export function POST() {
  return Response.json(
    { error: "Unavailable" },
    {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    },
  );
}

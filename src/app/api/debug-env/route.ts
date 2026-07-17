export async function GET() {
  return Response.json({
    GAS_API_URL_EXISTS: !!process.env.GAS_API_URL,
    GAS_API_KEY_EXISTS: !!process.env.GAS_API_KEY,
    GAS_API_URL_LENGTH: process.env.GAS_API_URL?.length ?? 0,
    GAS_API_KEY_LENGTH: process.env.GAS_API_KEY?.length ?? 0,
  });
}

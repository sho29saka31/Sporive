import { headers } from "next/headers";

/** Server ActionやRoute Handlerからリクエスト元のオリジン（https://example.com）を得る */
export async function getOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

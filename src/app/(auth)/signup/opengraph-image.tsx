import { ImageResponse } from "next/og";
import {
  renderOgImageContent,
  OG_IMAGE_SIZE,
  OG_IMAGE_CONTENT_TYPE,
} from "@/lib/og-image";

export const alt = "Sporive 新規登録";
export const size = OG_IMAGE_SIZE;
export const contentType = OG_IMAGE_CONTENT_TYPE;

export default async function Image() {
  return new ImageResponse(renderOgImageContent("新規登録"), size);
}

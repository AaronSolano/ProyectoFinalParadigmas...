import { extname } from "node:path";
import { Problem } from "./problem";
export function safeFilename(name: string): void {
  if (!/^[A-Za-z0-9-]+\.(png|jpe?g|webp)$/.test(name))
    throw new Problem(404, "NOT_FOUND", "Imagen no encontrada.");
}
export function imageType(name: string): string {
  return name.endsWith(".png")
    ? "image/png"
    : name.endsWith(".webp")
      ? "image/webp"
      : "image/jpeg";
}
export function validateImage(
  bytes: Buffer,
  name: string,
  max: number,
): { extension: string; type: string } {
  if (bytes.length > max)
    throw new Problem(
      413,
      "IMAGE_TOO_LARGE",
      "La imagen supera el maximo permitido.",
    );
  let extension = "";
  if (
    bytes.length >= 24 &&
    bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) &&
    bytes.toString("ascii", 12, 16) === "IHDR"
  )
    extension = "png";
  else if (
    bytes.length >= 4 &&
    bytes[0] === 255 &&
    bytes[1] === 216 &&
    bytes[2] === 255
  )
    extension = "jpg";
  else if (
    bytes.length >= 16 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(bytes.toString("ascii", 12, 16))
  )
    extension = "webp";
  const supplied = extname(name).toLowerCase().slice(1).replace("jpeg", "jpg");
  if (!extension || supplied !== extension)
    throw new Problem(
      415,
      "IMAGE_UNSUPPORTED",
      "Formato de imagen no permitido. Use png, jpeg o webp.",
    );
  return { extension, type: imageType(`image.${extension}`) };
}

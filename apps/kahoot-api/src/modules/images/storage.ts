import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import { Problem } from "../../domain/problem";
export interface ImageStorage {
  put(name: string, bytes: Buffer, type: string): Promise<void>;
  get(name: string): Promise<Buffer>;
  remove(name: string): Promise<void>;
}
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
export class DiskImageStorage implements ImageStorage {
  constructor(private readonly root: string) {}
  async put(name: string, bytes: Buffer): Promise<void> {
    safeFilename(name);
    await mkdir(this.root, { recursive: true });
    await writeFile(join(this.root, name), bytes, { flag: "wx" });
  }
  async get(name: string): Promise<Buffer> {
    safeFilename(name);
    try {
      return await readFile(join(this.root, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        throw new Problem(404, "NOT_FOUND", "Imagen no encontrada.");
      throw error;
    }
  }
  async remove(name: string): Promise<void> {
    safeFilename(name);
    try {
      await unlink(join(this.root, name));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
export class SupabaseImageStorage implements ImageStorage {
  constructor(
    private readonly url: string,
    private readonly key: string,
    private readonly bucket: string,
  ) {}
  private async request(
    name: string,
    method: string,
    bytes?: Buffer,
    type?: string,
  ): Promise<Response> {
    safeFilename(name);
    const response = await fetch(
      `${this.url}/storage/v1/object/${encodeURIComponent(this.bucket)}/${name}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${this.key}`,
          apikey: this.key,
          ...(type ? { "Content-Type": type } : {}),
        },
        body: bytes ? new Uint8Array(bytes) : undefined,
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) {
      if (
        response.status === 404 ||
        (response.status === 400 && method === "GET")
      )
        throw new Problem(404, "NOT_FOUND", "Imagen no encontrada.");
      throw new Error(`Almacenamiento no disponible (${response.status})`);
    }
    return response;
  }
  async put(name: string, bytes: Buffer, type: string): Promise<void> {
    await this.request(name, "POST", bytes, type);
  }
  async get(name: string): Promise<Buffer> {
    return Buffer.from(await (await this.request(name, "GET")).arrayBuffer());
  }
  async remove(name: string): Promise<void> {
    safeFilename(name);
    const response = await fetch(
      `${this.url}/storage/v1/object/${encodeURIComponent(this.bucket)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.key}`,
          apikey: this.key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefixes: [name] }),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok && response.status !== 404)
      throw new Error(`Almacenamiento no disponible (${response.status})`);
  }
}

import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { Problem } from "../domain/problem";
import { ImageStorage } from "../domain/ports";
import { safeFilename } from "../domain/images";
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

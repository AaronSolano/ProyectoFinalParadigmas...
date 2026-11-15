import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  DiskImageStorage,
  SupabaseImageStorage,
  ImageStorage,
  validateImage,
} from "../src/modules/images/storage";
import { requireOwner } from "../src/domain/problem";
describe.each(["disk", "supabase"])("ImageStorage %s", (kind) => {
  let storage: ImageStorage, root: string, server: Server;
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "storage-"));
    if (kind === "disk") {
      storage = new DiskImageStorage(root);
      return;
    }
    const files = new Map<string, Buffer>();
    server = createServer(async (req, res) => {
      expect(req.headers.authorization).toBe("Bearer test-key");
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      if (req.method === "DELETE") {
        expect(req.url).toBe("/storage/v1/object/images");
        for (const name of JSON.parse(body.toString()).prefixes)
          files.delete(name);
        res.end("[]");
        return;
      }
      const name = req.url?.split("/").pop() ?? "";
      if (req.method === "POST") {
        files.set(name, body);
        res.end("{}");
      } else if (files.has(name)) res.end(files.get(name));
      else res.writeHead(404).end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    storage = new SupabaseImageStorage(
      `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      "test-key",
      "images",
    );
  });
  afterAll(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
    await rm(root, { recursive: true, force: true });
  });
  it("guarda, recupera bytes y elimina", async () => {
    const bytes = Buffer.from("image-content");
    await storage.put("test.png", bytes, "image/png");
    expect(await storage.get("test.png")).toEqual(bytes);
    await storage.remove("test.png");
    await expect(storage.get("test.png")).rejects.toMatchObject({
      status: 404,
    });
  });
  it("rechaza traversal", async () => {
    await expect(storage.get("../test.png")).rejects.toMatchObject({
      status: 404,
    });
  });
});
describe("validacion de imágenes y dominio de permisos", () => {
  it("valida el contenido sin depender del nombre y rechaza exceso", () => {
    expect(() => validateImage(Buffer.from("text"), "x.png", 100)).toThrow();
    expect(() => validateImage(Buffer.alloc(101), "x.png", 100)).toThrow();
    const jpeg = Buffer.from([255, 216, 255, 224]);
    expect(validateImage(jpeg, "x.jpeg", 100).type).toBe("image/jpeg");
    for (const name of ["blob", "foto", "x.png"]) {
      expect(validateImage(jpeg, name, 100).extension).toBe("jpg");
    }
  });
  it("permite solamente propietario", () => {
    expect(() => requireOwner("a", "a")).not.toThrow();
    expect(() => requireOwner("a", "b")).toThrow();
  });
});

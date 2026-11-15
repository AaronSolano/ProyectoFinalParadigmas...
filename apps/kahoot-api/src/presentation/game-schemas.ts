import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
/** Canonical JSON Schemas are loaded, never duplicated in the gateway. */
export class GameSchemas {
  private readonly ajv = new Ajv({ strict: false, allErrors: false });
  private readonly validators = new Map<string, ReturnType<Ajv["compile"]>>();
  constructor() {
    addFormats(this.ajv);
    const bundled = resolve(__dirname, "../schemas");
    const development =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test" ||
      (process.env.NODE_ENV === undefined &&
        /[/\\]src[/\\]presentation$/.test(__dirname));
    const root = existsSync(bundled)
      ? bundled
      : development
        ? resolve(__dirname, "../../../../packages/contracts/events/schemas")
        : bundled;
    const schemas = readdirSync(root)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(resolve(root, f), "utf8")));
    for (const schema of schemas) this.ajv.addSchema(schema);
    for (const schema of schemas)
      this.validators.set(schema.title, this.ajv.getSchema(schema.$id)!);
  }
  valid(event: string, payload: unknown): boolean {
    return !!this.validators.get(event)?.(payload);
  }
}

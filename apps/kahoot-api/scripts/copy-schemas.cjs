const { cpSync, mkdirSync, readdirSync } = require("node:fs");
const { resolve } = require("node:path");
const source = resolve(__dirname, "../../../packages/contracts/events/schemas");
const output = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(__dirname, "../dist");
const target = resolve(output, "schemas");
mkdirSync(target, { recursive: true });
for (const file of readdirSync(source).filter((name) =>
  name.endsWith(".json"),
)) {
  cpSync(resolve(source, file), resolve(target, file));
}
mkdirSync(resolve(output, "openapi"), { recursive: true });
cpSync(
  resolve(__dirname, "../../../packages/contracts/openapi/kahoot-api.yaml"),
  resolve(output, "openapi/kahoot-api.yaml"),
);
cpSync(resolve(__dirname, "../assets"), resolve(output, "assets"), {
  recursive: true,
});

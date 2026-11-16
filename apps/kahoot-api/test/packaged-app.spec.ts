import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
test("dist arranca sin packages y valida un evento usando solo los contratos empaquetados", async () => {
  const appRoot = resolve(__dirname, ".."),
    sandbox = await mkdtemp(join(tmpdir(), "kahoot-packaged-"));
  const dist = join(sandbox, "dist");
  try {
    await mkdir(dist);
    execFileSync(
      process.execPath,
      [
        require.resolve("typescript/bin/tsc"),
        "-p",
        join(appRoot, "tsconfig.json"),
        "--outDir",
        dist,
      ],
      { cwd: appRoot, stdio: "pipe" },
    );
    execFileSync(
      process.execPath,
      [join(appRoot, "scripts/copy-schemas.cjs"), dist],
      { cwd: appRoot, stdio: "pipe" },
    );
    // Resolve direct runtime packages individually: npm workspaces may hoist them.
    const manifest = JSON.parse(
      await readFile(join(appRoot, "package.json"), "utf8"),
    );
    for (const name of Object.keys(manifest.dependencies)) {
      const source = (require.resolve.paths(name) ?? [])
        .map((root) => join(root, name))
        .find((path) => existsSync(join(path, "package.json")));
      if (!source) throw new Error(`Dependencia no instalada: ${name}`);
      const target = join(sandbox, "node_modules", name);
      await mkdir(dirname(target), { recursive: true });
      await symlink(
        source,
        target,
        process.platform === "win32" ? "junction" : "dir",
      );
    }
    const code = `
      const assert=require('node:assert/strict');
      const {GameSchemas}=require('./presentation/game-schemas');
      const {loadConfig}=require('./config/config');
      const {database}=require('./data/database');
      const {createApp}=require('./app');
      (async()=>{
        assert.equal(new GameSchemas().valid('answer:submit',{code:'ABC234',questionIndex:0,answer:true}),true);
        assert.equal(new GameSchemas().valid('answer:submit',{code:'ABC234',questionIndex:0,answer:'true'}),false);
        const config=loadConfig({KAHOOT_DATABASE_URL:'postgresql://unused:unused@127.0.0.1/unused',AUTH_BASE_URL:'http://127.0.0.1:1',PUBLIC_API_URL:'http://127.0.0.1:3002'});
        const {app}=await createApp(config,database(config));
        try {
          await app.listen(0,'127.0.0.1');
          assert.equal((await fetch((await app.getUrl())+'/api/v1/health')).status,200);
          assert.equal((await fetch((await app.getUrl())+'/docs')).status,200);
          process.stdout.write('packaged-ok');
        } finally {await app.close();}
      })().catch(()=>{process.exitCode=1;});
    `;
    const output = execFileSync(process.execPath, ["-e", code], {
      cwd: dist,
      env: { ...process.env, NODE_ENV: "production" },
      timeout: 15000,
      encoding: "utf8",
    });
    const lines = output.split("\n");
    expect(lines.pop()).toBe("packaged-ok");
    expect(lines.map((line) => JSON.parse(line))).toMatchObject([
      {
        service: "kahoot-api",
        method: "GET",
        route: "/api/v1/health",
        status: 200,
      },
      { service: "kahoot-api", method: "GET", route: "unmatched", status: 200 },
    ]);
    // A production deployment with missing bundled schemas must fail, never read the repo.
    await rm(join(dist, "schemas"), { recursive: true });
    expect(() =>
      execFileSync(
        process.execPath,
        ["-e", "new (require('./presentation/game-schemas').GameSchemas)()"],
        {
          cwd: dist,
          env: { ...process.env, NODE_ENV: "production" },
          stdio: "pipe",
        },
      ),
    ).toThrow();
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

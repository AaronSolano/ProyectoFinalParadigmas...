import { LiveEventBudget } from "../src/presentation/live-event-budget";
import { loadConfig } from "../src/config/config";
test("presupuesto deslizante permite tráfico normal y desconecta tres excesos consecutivos", () => {
  let now = 0;
  const budget = new LiveEventBudget(2, () => now);
  expect(budget.take()).toBe("allow");
  expect(budget.take()).toBe("allow");
  expect(budget.take()).toBe("drop");
  expect(budget.take()).toBe("drop");
  expect(budget.take()).toBe("disconnect");
  now = 1000;
  expect(budget.take()).toBe("allow");
});
test("las variables de arranque tienen valores predeterminados y validación estricta", () => {
  const env = {
    KAHOOT_DATABASE_URL: "postgresql://unused/unused",
    AUTH_BASE_URL: "http://localhost:3001",
    PUBLIC_API_URL: "http://localhost:3002",
  };
  expect(loadConfig(env)).toMatchObject({
    runMigrations: true,
    liveMaxEventsPerSecond: 20,
  });
  expect(
    loadConfig({
      ...env,
      RUN_MIGRATIONS: "false",
      LIVE_MAX_EVENTS_PER_SECOND: "40",
    }),
  ).toMatchObject({ runMigrations: false, liveMaxEventsPerSecond: 40 });
  expect(() => loadConfig({ ...env, RUN_MIGRATIONS: "0" })).toThrow(
    "RUN_MIGRATIONS",
  );
  for (const value of ["0", "-1", "1.5", "infinito"])
    expect(() =>
      loadConfig({ ...env, LIVE_MAX_EVENTS_PER_SECOND: value }),
    ).toThrow("LIVE_MAX_EVENTS_PER_SECOND");
});

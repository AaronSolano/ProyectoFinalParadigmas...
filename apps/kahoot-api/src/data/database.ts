import "reflect-metadata";
import { DataSource } from "typeorm";
import { Config } from "../config/config";
import { InitialKahoot1794780000000 } from "./migration";
import { DemoSeedHistory1794780001000 } from "./seed-migration";
import { LiveGame1794780002000 } from "./live-migration";
export function database(config: Config): DataSource {
  return new DataSource({
    type: "postgres",
    url: config.databaseUrl,
    ssl: config.ssl ? { rejectUnauthorized: true } : false,
    synchronize: false,
    migrations: [
      InitialKahoot1794780000000,
      DemoSeedHistory1794780001000,
      LiveGame1794780002000,
    ],
  });
}

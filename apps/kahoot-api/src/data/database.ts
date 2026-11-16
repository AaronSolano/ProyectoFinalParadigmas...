import "reflect-metadata";
import { DataSource } from "typeorm";
import { Config } from "../config/config";
import { InitialKahoot1794780000000 } from "./migration";
import { DemoSeedHistory1794780001000 } from "./seed-migration";
import { LiveGame1794780002000 } from "./live-migration";
import { SpeedScoring1794780003000 } from "./speed-migration";
import { connectionOptions, connectionUrl } from "./connection-options";
export function database(config: Config): DataSource {
  return new DataSource({
    type: "postgres",
    url: connectionUrl(config.databaseUrl),
    ...connectionOptions(config.ssl, config.sslCa, config.databaseSchema),
    synchronize: false,
    migrations: [
      InitialKahoot1794780000000,
      DemoSeedHistory1794780001000,
      LiveGame1794780002000,
      SpeedScoring1794780003000,
    ],
  });
}

import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";

// Números de severidad de OpenTelemetry (INFO=9, WARN=13, ERROR=17).
const severity: Record<string, number> = { info: 9, warn: 13, error: 17 };

/**
 * Reenvía por OTLP las mismas líneas JSON que la API ya escribe en la salida estándar
 * (solo campos permitidos: no se serializan peticiones ni errores). Devuelve la función
 * que vacía el envío y restaura la salida estándar.
 */
export function startLogExport(base: string, serviceName: string) {
  const provider = new LoggerProvider({
    resource: resourceFromAttributes({ "service.name": serviceName }),
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({
          url: `${base}/v1/logs`,
          timeoutMillis: 2000,
        }),
      }),
    ],
  });
  const logger = provider.getLogger(serviceName);
  const original = process.stdout.write;
  process.stdout.write = function (this: unknown, chunk: unknown, ...rest: unknown[]) {
    try {
      for (const line of String(chunk).split("\n")) {
        if (!line.startsWith("{")) continue;
        const entry = JSON.parse(line) as { level?: string };
        const level = String(entry.level ?? "info");
        logger.emit({
          severityNumber: severity[level] ?? 9,
          severityText: level.toUpperCase(),
          body: line,
        });
      }
    } catch {
      // Una línea que no es JSON no se exporta.
    }
    return (original as (...args: unknown[]) => boolean).call(
      process.stdout,
      chunk,
      ...rest,
    );
  } as typeof process.stdout.write;
  return async () => {
    process.stdout.write = original;
    await provider.shutdown();
  };
}

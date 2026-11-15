import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DataSource } from "typeorm";
import { ImageStorage } from "../modules/images/storage";

export const DEMO_PROFILE_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_QUIZ_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_QUESTION_ID = "00000000-0000-4000-8000-000000000003";
const seedName = "kahoot-demo";
export const DEMO_QUESTIONS = [
  {
    id: DEMO_QUESTION_ID,
    statement: "Una variable permite almacenar un valor en un programa.",
    answer: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    statement: "El diagrama muestra una decisión con dos caminos posibles.",
    answer: true,
    image: "decision.png",
    filename: "00000000-0000-4000-8000-000000000010.png",
  },
  {
    id: "00000000-0000-4000-8000-000000000006",
    statement:
      "Todos los lenguajes de programación utilizan exactamente la misma sintaxis.",
    answer: false,
  },
  {
    id: "00000000-0000-4000-8000-000000000007",
    statement:
      "En la pila ilustrada, el primer elemento en entrar es el primero en salir.",
    answer: false,
    image: "pila.png",
    filename: "00000000-0000-4000-8000-000000000011.png",
  },
  {
    id: "00000000-0000-4000-8000-000000000008",
    statement: "Una función puede recibir parámetros y devolver un resultado.",
    answer: true,
  },
] as const;

export interface SeedReport {
  created: string[];
  warnings: string[];
}

export async function seedDemo(
  db: DataSource,
  images: ImageStorage,
  profileId = DEMO_PROFILE_ID,
): Promise<SeedReport> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      profileId,
    )
  ) {
    throw new Error("DEMO_PROFILE_ID debe ser UUID v4");
  }
  return db.transaction(async (manager) => {
    await manager.query("SELECT pg_advisory_xact_lock(400,6)");
    const report: SeedReport = { created: [], warnings: [] };
    const history = await manager.query(
      "SELECT version FROM demo_seed_versions WHERE name=$1",
      [seedName],
    );
    const quizzes = await manager.query(
      "SELECT owner_id,deleted_at FROM quizzes WHERE id=$1",
      [DEMO_QUIZ_ID],
    );
    const existing = quizzes[0];
    if (existing && existing.owner_id !== profileId) {
      throw new Error("El cuestionario demo pertenece a otro DEMO_PROFILE_ID");
    }
    if (existing?.deleted_at || (!existing && history.length)) {
      report.warnings.push("El cuestionario demo fue eliminado; no se recreó.");
      return report;
    }
    const fresh = !existing;
    if (fresh) {
      await manager.query(
        "INSERT INTO quizzes(id,owner_id,title,description) VALUES($1,$2,$3,$4)",
        [
          DEMO_QUIZ_ID,
          profileId,
          "Programación y paradigmas",
          "Cinco preguntas Verdadero/Falso para explorar conceptos de programación.",
        ],
      );
    }
    const before = await manager.query(
      "SELECT id FROM questions WHERE quiz_id=$1",
      [DEMO_QUIZ_ID],
    );
    const ids = new Set<string>(before.map((row: { id: string }) => row.id));
    // A v1 installation only knew the first ID. A history marker distinguishes deletion from first installation.
    const legacy =
      !fresh &&
      !history.length &&
      !DEMO_QUESTIONS.slice(1).some((question) => ids.has(question.id));
    if (legacy)
      report.warnings.push(
        "Demo anterior detectada: se conservan sus datos y se agregan cuatro preguntas nuevas.",
      );
    let nextPosition = Number(
      (
        await manager.query(
          "SELECT COALESCE(max(position),0) AS position FROM questions WHERE quiz_id=$1",
          [DEMO_QUIZ_ID],
        )
      )[0].position,
    );
    for (const question of DEMO_QUESTIONS) {
      if (ids.has(question.id)) continue;
      if (!fresh && !(legacy && question.id !== DEMO_QUESTION_ID)) {
        report.warnings.push(
          `Pregunta demo ausente ${question.id}; no se recreó para respetar su eliminación.`,
        );
        continue;
      }
      let filename: string | null = null;
      if ("image" in question) {
        filename = question.filename;
        const bytes = await readFile(
          resolve(__dirname, "../../assets/demo", question.image),
        );
        try {
          const stored = await images.get(filename);
          if (!stored.equals(bytes))
            throw new Error(
              `La imagen demo ${filename} ya existe con contenido distinto.`,
            );
        } catch (error) {
          if ((error as { status?: number }).status !== 404) throw error;
          await images.put(filename, bytes, "image/png");
        }
      }
      await manager.query(
        "INSERT INTO questions(id,quiz_id,statement,correct_answer,image_filename,position) VALUES($1,$2,$3,$4,$5,$6)",
        [
          question.id,
          DEMO_QUIZ_ID,
          question.statement,
          question.answer,
          filename,
          ++nextPosition,
        ],
      );
      report.created.push(question.id);
    }
    await manager.query(
      "INSERT INTO demo_seed_versions(name,version) VALUES($1,2) ON CONFLICT(name) DO UPDATE SET version=EXCLUDED.version",
      [seedName],
    );
    return report;
  });
}

import { DataSource } from "typeorm";
import { ImageStorage } from "../modules/images/storage";
export const DEMO_PROFILE_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_QUIZ_ID = "00000000-0000-4000-8000-000000000002";
export const DEMO_QUESTION_ID = "00000000-0000-4000-8000-000000000003";
const filename = "00000000-0000-4000-8000-000000000004.png";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=",
  "base64",
);
/** Idempotent seed; locks prevent competing startup processes creating duplicates. */
export async function seedDemo(
  db: DataSource,
  images: ImageStorage,
  profileId = DEMO_PROFILE_ID,
): Promise<void> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      profileId,
    )
  )
    throw new Error("DEMO_PROFILE_ID debe ser UUID v4");
  await db.transaction(async (manager) => {
    await manager.query("SELECT pg_advisory_xact_lock(400,6)");
    const existing = await manager.query(
      "SELECT owner_id FROM quizzes WHERE id=$1",
      [DEMO_QUIZ_ID],
    );
    if (existing.length && existing[0].owner_id !== profileId)
      throw new Error("El cuestionario demo pertenece a otro DEMO_PROFILE_ID");
    if (existing.length) return;
    try {
      await images.get(filename);
    } catch (error) {
      if ((error as { status?: number }).status !== 404) throw error;
      await images.put(filename, png, "image/png");
    }
    await manager.query(
      "INSERT INTO quizzes(id,owner_id,title,description) VALUES($1,$2,$3,$4)",
      [
        DEMO_QUIZ_ID,
        profileId,
        "Demostracion ProfeLink",
        "Cuestionario de prueba con imagen",
      ],
    );
    await manager.query(
      "INSERT INTO questions(id,quiz_id,statement,correct_answer,image_filename,position) VALUES($1,$2,$3,$4,$5,1)",
      [
        DEMO_QUESTION_ID,
        DEMO_QUIZ_ID,
        "La imagen mostrada es un archivo PNG.",
        true,
        filename,
      ],
    );
  });
}

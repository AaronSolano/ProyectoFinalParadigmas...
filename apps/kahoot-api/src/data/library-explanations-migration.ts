import { MigrationInterface, QueryRunner } from "typeorm";
import { stableUuid } from "./library-data";
import { LIBRARY_EXPLANATIONS } from "./library-explanations";

/** Agrega explicaciones a algunos cuestionarios de la biblioteca (el resto queda sin explicación). */
export class LibraryExplanations1794780007000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    for (const [slug, texts] of Object.entries(LIBRARY_EXPLANATIONS))
      for (const [index, text] of texts.entries())
        await q.query(
          "UPDATE questions SET explanation=$1 WHERE id=$2 AND explanation IS NULL",
          [text, stableUuid(`question:${slug}:${index}`)],
        );
  }
  async down(q: QueryRunner): Promise<void> {
    for (const [slug, texts] of Object.entries(LIBRARY_EXPLANATIONS))
      for (const index of texts.keys())
        await q.query("UPDATE questions SET explanation=NULL WHERE id=$1", [
          stableUuid(`question:${slug}:${index}`),
        ]);
  }
}

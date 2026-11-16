import { LIBRARY, stableUuid } from "../src/data/library-data";
import { LIBRARY_EXPLANATIONS } from "../src/data/library-explanations";

describe("contenido de la biblioteca", () => {
  it("tiene 10 cuestionarios de 10 preguntas con 2 a 4 opciones y una correcta válida", () => {
    expect(LIBRARY).toHaveLength(10);
    expect(new Set(LIBRARY.map((q) => q.category))).toEqual(
      new Set(["Cultura general", "Tecnología"]),
    );
    for (const quiz of LIBRARY) {
      expect(quiz.questions).toHaveLength(10);
      for (const q of quiz.questions) {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.options.length).toBeLessThanOrEqual(4);
        expect(new Set(q.options.map((o) => o.toLowerCase())).size).toBe(
          q.options.length,
        );
        expect(q.correctOption).toBeGreaterThanOrEqual(0);
        expect(q.correctOption).toBeLessThan(q.options.length);
        expect(q.statement.length).toBeLessThanOrEqual(500);
        expect(q.options.every((o) => o.length > 0 && o.length <= 120)).toBe(true);
      }
    }
  });
  it("los identificadores estables son UUID v4 únicos", () => {
    const ids = LIBRARY.flatMap((quiz) => [
      stableUuid(`quiz:${quiz.slug}`),
      ...quiz.questions.map((_, i) => stableUuid(`question:${quiz.slug}:${i}`)),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids)
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
  });
  it("las explicaciones existen para algunos cuestionarios, coinciden con sus preguntas y caben en 300 caracteres", () => {
    const slugs = new Map(LIBRARY.map((quiz) => [quiz.slug, quiz]));
    expect(Object.keys(LIBRARY_EXPLANATIONS).length).toBeGreaterThanOrEqual(4);
    for (const [slug, texts] of Object.entries(LIBRARY_EXPLANATIONS)) {
      expect(slugs.get(slug)?.questions).toHaveLength(texts.length);
      for (const text of texts) {
        expect(text.trim().length).toBeGreaterThan(0);
        expect(text.length).toBeLessThanOrEqual(300);
      }
    }
  });
});

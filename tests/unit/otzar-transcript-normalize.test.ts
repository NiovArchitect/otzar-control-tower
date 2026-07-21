import { describe, expect, it } from "vitest";
import { normalizeOtzarInTranscript } from "@/lib/voice/otzar-transcript-normalize";

describe("normalizeOtzarInTranscript", () => {
  it("maps common STT misspellings to Otzar", () => {
    expect(normalizeOtzarInTranscript("Ask Otsar what changed")).toBe(
      "Ask Otzar what changed",
    );
    expect(normalizeOtzarInTranscript("O-T-S-A-R please help")).toBe(
      "Otzar please help",
    );
    expect(normalizeOtzarInTranscript("Talk to Otzer now")).toBe(
      "Talk to Otzar now",
    );
  });

  it("leaves unrelated words alone", () => {
    expect(normalizeOtzarInTranscript("The otsar of the king")).toBe(
      "The Otzar of the king",
    );
    // "otsar" as product misspelling is normalized; intentional trade-off for product name.
  });

  it("is idempotent on correct spelling", () => {
    expect(normalizeOtzarInTranscript("Ask Otzar")).toBe("Ask Otzar");
  });
});

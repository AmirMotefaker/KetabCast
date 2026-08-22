import type { CandidateRightsResearch } from "./candidate-registry.ts";

const REVIEWED_AT = "2026-08-22";
const REVIEWED_BY = "zobdino-rights-research-batch-b";

const evidenceFound = (
  originalWorkNote: string,
  editionOrTranslationNote: string,
  evidenceReferences: string[],
): CandidateRightsResearch => ({
  status: "evidence-found",
  originalWorkNote,
  editionOrTranslationNote,
  evidenceReferences,
  reviewedAt: REVIEWED_AT,
  reviewedBy: REVIEWED_BY,
});

export const batchBRightsResearch: Record<string, CandidateRightsResearch> = {
  "the-republic": evidenceFound(
    "Ancient Greek original work. Project Gutenberg #55201 provides a concrete English source and labels that ebook public domain in the USA; this is source evidence rather than global clearance.",
    "Candidate source: Benjamin Jowett translation (1817-1893), Project Gutenberg #55201. Non-US reuse and any Persian translation/edition rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/55201"],
  ),
  "nicomachean-ethics": evidenceFound(
    "Ancient Greek original work. Project Gutenberg #8438 provides a concrete English source and labels that ebook public domain in the USA.",
    "The Gutenberg record must not be treated as clearance for modern annotations or Persian translations. Exact source-edition provenance should remain attached to any future ingestion.",
    ["https://www.gutenberg.org/ebooks/8438"],
  ),
  "tao-te-ching": evidenceFound(
    "Ancient Chinese original work. Project Gutenberg #216 provides the historical James Legge English translation and labels that ebook public domain in the USA.",
    "Candidate source: James Legge translation (1815-1897), Project Gutenberg #216. The newer Gutenberg #49965 minimalist translation is explicitly copyrighted and is excluded. Persian translation rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/216", "https://www.gutenberg.org/ebooks/49965"],
  ),
  "on-liberty": evidenceFound(
    "John Stuart Mill's 1859 English work has a concrete Project Gutenberg source (#34901), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #34901. No modern editorial apparatus, localized edition, or Persian translation is cleared by this evidence.",
    ["https://www.gutenberg.org/ebooks/34901"],
  ),
  "self-reliance": evidenceFound(
    "Ralph Waldo Emerson's essay is represented in Project Gutenberg's Essays — First Series (#2944), a historical English collection that Gutenberg lists as public domain in the USA.",
    "Candidate source is the historical collection containing Self-Reliance, not a modern standalone edition. Modern editorial packaging and all Persian translation rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/2944"],
  ),
  walden: evidenceFound(
    "Henry David Thoreau's English work has a concrete Project Gutenberg source (#205), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #205, which bundles Walden with On The Duty Of Civil Disobedience. Future ingestion must scope only the intended work and must not imply clearance for Persian translations.",
    ["https://www.gutenberg.org/ebooks/205"],
  ),
  "narrative-frederick-douglass": evidenceFound(
    "Frederick Douglass's 1845 English narrative has a concrete Project Gutenberg source (#23), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #23. Modern introductions, annotations, adaptations, and Persian translations are separate rights objects and remain unverified.",
    ["https://www.gutenberg.org/ebooks/23"],
  ),
  "interpretation-of-dreams": evidenceFound(
    "Sigmund Freud's original German work is represented by Project Gutenberg #66048 through a historical English translation that Gutenberg lists as public domain in the USA.",
    "Candidate source: A. A. Brill English translation, original US publication 1913, Project Gutenberg #66048. Translator/edition status outside the USA and Persian translation rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/66048"],
  ),
  "science-of-getting-rich": evidenceFound(
    "Wallace D. Wattles's 1910 English work has a concrete Project Gutenberg source (#59844), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #59844. Modern editions, added commentary, branding, and Persian translations remain separate and unverified.",
    ["https://www.gutenberg.org/ebooks/59844"],
  ),
};

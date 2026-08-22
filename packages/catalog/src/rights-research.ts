import type { CandidateRightsResearch, CatalogCandidate } from "./candidate-registry.ts";
import { candidateRegistry as baseCandidateRegistry } from "./candidate-registry.ts";
import { batchBRightsResearch } from "./rights-research-batch-b.ts";
import { batchCRightsResearch } from "./rights-research-batch-c.ts";

const REVIEWED_AT = "2026-08-22";
const REVIEWED_BY = "zobdino-rights-research-batch-a";

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

export const batchARightsResearch: Record<string, CandidateRightsResearch> = {
  meditations: evidenceFound(
    "Ancient original work. Project Gutenberg provides a concrete English source record and states that its listed ebook is public domain in the USA; this is source evidence, not global clearance.",
    "Candidate source: George W. Chrystal translation (translator 1880-1944), Project Gutenberg #55317. Non-US reuse and any Persian translation/edition rights remain unverified and require separate clearance.",
    ["https://www.gutenberg.org/ebooks/55317"],
  ),
  "the-art-of-war": evidenceFound(
    "Ancient Chinese original work. Project Gutenberg provides a concrete English source record and states that its listed ebook is public domain in the USA; this does not establish worldwide clearance.",
    "Candidate source: Lionel Giles 1910 English translation (1875-1958), Project Gutenberg #132. Translator/edition status outside the USA and all Persian translation rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/132"],
  ),
  "the-prince": evidenceFound(
    "Historical Italian original work. Project Gutenberg provides a concrete English source and labels the listed ebook public domain in the USA; jurisdiction-specific clearance is still required.",
    "Candidate source: W. K. Marriott English translation (translator died 1927), Project Gutenberg #1232. Persian translation/edition rights remain unverified and no existing Persian translation is approved for use.",
    ["https://www.gutenberg.org/ebooks/1232"],
  ),
  "wealth-of-nations": evidenceFound(
    "Original work published in English in 1776. Project Gutenberg #3300 provides a concrete English source and states that the ebook is public domain in the USA; this is not a legal conclusion for other jurisdictions.",
    "Use of the English source may be evaluated separately from any Persian translation. No Persian translation, modern editorial apparatus, or third-party edition is cleared by this record.",
    ["https://www.gutenberg.org/ebooks/3300"],
  ),
  "autobiography-benjamin-franklin": evidenceFound(
    "Benjamin Franklin's original English autobiographical work is represented by Project Gutenberg #148, which states that the ebook is public domain in the USA.",
    "Candidate source: Project Gutenberg #148, edited by Charles W. Eliot (1834-1926). Editorial/edition status outside the USA and any Persian translation rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/148"],
  ),
  "origin-of-species": evidenceFound(
    "Charles Darwin's 1859 first edition is available as Project Gutenberg #1228, which states that the ebook is public domain in the USA.",
    "Candidate source: 1859 first edition, Project Gutenberg #1228. Modern annotations, later editorial material, and any Persian translation are separate rights objects and remain unverified.",
    ["https://www.gutenberg.org/ebooks/1228"],
  ),
  "how-to-live-on-24-hours-a-day": evidenceFound(
    "Arnold Bennett's English work has a concrete Project Gutenberg source (#2274), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #2274. This record does not clear non-US publication or any Persian translation/edition; those remain separate research tasks.",
    ["https://www.gutenberg.org/ebooks/2274"],
  ),
  "as-a-man-thinketh": evidenceFound(
    "James Allen's English work has a concrete Project Gutenberg source (#4507), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #4507. The source identifies an authorized historical edition, but non-US status and Persian translation/edition rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/4507"],
  ),
};

export const researchedCandidateRegistry: CatalogCandidate[] = baseCandidateRegistry.map((candidate) => ({
  ...candidate,
  rightsResearch: batchCRightsResearch[candidate.slug] ?? batchBRightsResearch[candidate.slug] ?? batchARightsResearch[candidate.slug] ?? candidate.rightsResearch,
}));

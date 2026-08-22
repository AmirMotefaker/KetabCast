import type { CandidateRightsResearch } from "./candidate-registry.ts";

const REVIEWED_AT = "2026-08-22";
const REVIEWED_BY = "zobdino-rights-research-batch-c";

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

export const batchCRightsResearch: Record<string, CandidateRightsResearch> = {
  "essays-bacon": evidenceFound(
    "Francis Bacon's historical English essays have a concrete Project Gutenberg source in Bacon's Essays, and Wisdom of the Ancients (#56463), which Gutenberg lists as public domain in the USA.",
    "Candidate source: Project Gutenberg #56463. The ebook includes contributed/editorial material associated with Basil Montagu and Alexander Spiers, so any future ingestion must scope Bacon's underlying essays and preserve edition provenance. Persian translation rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/56463"],
  ),
  utilitarianism: evidenceFound(
    "John Stuart Mill's 1861 English work has a concrete Project Gutenberg source (#11224), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #11224, presented as a historical reprint. Modern editorial apparatus, localized editions, and all Persian translation rights remain separate and unverified.",
    ["https://www.gutenberg.org/ebooks/11224"],
  ),
  "democracy-in-america": evidenceFound(
    "Alexis de Tocqueville's historical French work has a concrete English source in Project Gutenberg #815, which Gutenberg lists as public domain in the USA.",
    "Candidate source: Henry Reeve translation (1813-1895), Project Gutenberg #815, Volume 1. Translator/edition provenance must remain attached, Volume 2 must be scoped separately if used, and Persian translation rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/815"],
  ),
  "communist-manifesto": evidenceFound(
    "Marx and Engels' 1848 German original is represented by Project Gutenberg #61 through a historical English edition that Gutenberg lists as public domain in the USA.",
    "Candidate source: Project Gutenberg #61, identified as an English translation/edition derived from the 1888 English edition edited by Friedrich Engels. This source record does not clear modern translations, annotations, or any Persian translation.",
    ["https://www.gutenberg.org/ebooks/61"],
  ),
  "federalist-papers": evidenceFound(
    "The 1787-1788 English essays by Hamilton, Madison, and Jay have a concrete Project Gutenberg source (#18), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #18. Modern introductions, annotations, constitutional commentary, and any Persian translation remain separate rights objects and are not cleared by this source record.",
    ["https://www.gutenberg.org/ebooks/18"],
  ),
  "descent-of-man": evidenceFound(
    "Charles Darwin's 1871 English work has a concrete Project Gutenberg source (#2300), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #2300. Modern scientific annotations, later editorial matter, abridgements, and any Persian translation remain separate and unverified.",
    ["https://www.gutenberg.org/ebooks/2300"],
  ),
  "psychopathology-of-everyday-life": evidenceFound(
    "Sigmund Freud's 1901 German work is represented by Project Gutenberg #67332 through a historical English translation that Gutenberg lists as public domain in the USA.",
    "Candidate source: A. A. Brill translation (1874-1948), US publication 1914, Project Gutenberg #67332. Translator/edition status outside the USA and all Persian translation rights remain unverified.",
    ["https://www.gutenberg.org/ebooks/67332"],
  ),
  "souls-of-black-folk": evidenceFound(
    "W. E. B. Du Bois's 1903 English work has a concrete Project Gutenberg source (#408), listed by Gutenberg as public domain in the USA.",
    "Candidate source: Project Gutenberg #408. Modern introductions, annotations, adaptations, and any Persian translation remain separate rights objects and are not cleared by this evidence.",
    ["https://www.gutenberg.org/ebooks/408"],
  ),
};

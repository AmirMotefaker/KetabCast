import { PRIMARY_COLLECTIONS } from "./contracts.ts";
import { researchedCandidateRegistry as candidateRegistry } from "./rights-research.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(candidateRegistry.length === 25, `candidate-count-invalid:${candidateRegistry.length}`);

const slugs = new Set<string>();
const coveredCollections = new Set<string>();

for (const candidate of candidateRegistry) {
  assert(candidate.slug.trim().length > 0, "candidate-slug-empty");
  assert(!slugs.has(candidate.slug), `candidate-slug-duplicate:${candidate.slug}`);
  slugs.add(candidate.slug);

  assert(candidate.title.trim().length > 0, `candidate-title-empty:${candidate.slug}`);
  assert(candidate.author.trim().length > 0, `candidate-author-empty:${candidate.slug}`);
  assert(candidate.publicationState === "candidate", `candidate-publication-state-invalid:${candidate.slug}`);
  assert(candidate.rightsResearch.status !== "cleared", `candidate-cleared-without-legal-gate:${candidate.slug}`);
  assert(candidate.rightsResearch.originalWorkNote.trim().length > 0, `candidate-original-rights-note-empty:${candidate.slug}`);
  assert(candidate.rightsResearch.editionOrTranslationNote.trim().length > 0, `candidate-edition-rights-note-empty:${candidate.slug}`);
  assert(candidate.primaryCollections.length >= 1, `candidate-collections-empty:${candidate.slug}`);
  assert(candidate.topics.length >= 2, `candidate-topics-insufficient:${candidate.slug}`);
  assert(candidate.rationale.trim().length >= 20, `candidate-rationale-too-short:${candidate.slug}`);
  assert(candidate.sourceLanguage.trim().length > 0, `candidate-source-language-empty:${candidate.slug}`);

  if (candidate.rightsResearch.status === "evidence-found") {
    assert(candidate.rightsResearch.evidenceReferences.length >= 1, `candidate-evidence-missing:${candidate.slug}`);
    assert(candidate.rightsResearch.reviewedAt.length >= 10, `candidate-review-date-missing:${candidate.slug}`);
    assert(candidate.rightsResearch.reviewedBy.trim().length > 0, `candidate-reviewer-missing:${candidate.slug}`);
    assert(candidate.editionOrTranslationNote === undefined, `candidate-unexpected-top-level-edition-note:${candidate.slug}`);
  } else {
    assert(candidate.rightsResearch.status === "pending", `candidate-unexpected-research-state:${candidate.slug}`);
    assert(candidate.rightsResearch.evidenceReferences.length === 0, `candidate-unreviewed-evidence-present:${candidate.slug}`);
    assert(candidate.rightsResearch.reviewedAt === "", `candidate-unreviewed-date-present:${candidate.slug}`);
    assert(candidate.rightsResearch.reviewedBy === "", `candidate-unreviewed-reviewer-present:${candidate.slug}`);
  }

  for (const collection of candidate.primaryCollections) {
    assert(PRIMARY_COLLECTIONS.includes(collection), `candidate-collection-invalid:${candidate.slug}:${collection}`);
    coveredCollections.add(collection);
  }
}

assert(coveredCollections.size >= 7, `candidate-collection-coverage-insufficient:${coveredCollections.size}`);

const p0Candidates = candidateRegistry.filter((candidate) => candidate.priority === "p0");
assert(p0Candidates.length === 8, `candidate-p0-pool-unexpected:${p0Candidates.length}`);
assert(p0Candidates.every((candidate) => candidate.rightsResearch.status === "evidence-found"), "candidate-p0-research-incomplete");

const evidenceFoundCount = candidateRegistry.filter((candidate) => candidate.rightsResearch.status === "evidence-found").length;
assert(evidenceFoundCount === 8, `candidate-batch-a-evidence-count-invalid:${evidenceFoundCount}`);

console.log(`25-book candidate registry OK: ${candidateRegistry.length} candidates, ${coveredCollections.size} collections, ${evidenceFoundCount} evidence-backed P0 candidates; none cleared.`);

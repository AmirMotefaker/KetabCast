import { catalogRegistry } from "./registry.ts";
import { isRightsSafeForPublic, PRIMARY_COLLECTIONS, type CatalogEntry } from "./contracts.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function validateEntry(entry: CatalogEntry): void {
  assert(entry.slug.trim().length > 0, "catalog-slug-empty");
  assert(entry.titleFa.trim().length > 0, `catalog-title-empty:${entry.slug}`);
  assert(entry.authorFa.trim().length > 0, `catalog-author-empty:${entry.slug}`);
  assert(entry.primaryCollections.length > 0, `catalog-primary-collection-empty:${entry.slug}`);
  for (const collection of entry.primaryCollections) {
    assert(PRIMARY_COLLECTIONS.includes(collection), `catalog-primary-collection-invalid:${entry.slug}:${collection}`);
  }
  assert(entry.topics.length > 0, `catalog-topics-empty:${entry.slug}`);
  assert(entry.voices.length > 0, `catalog-voices-empty:${entry.slug}`);
  assert(entry.sourceLanguage.trim().length > 0, `catalog-source-language-empty:${entry.slug}`);
  assert(entry.publicationEra.trim().length > 0, `catalog-publication-era-empty:${entry.slug}`);

  if (entry.publicationState === "public") {
    assert(isRightsSafeForPublic(entry.rights.status), `catalog-public-rights-unsafe:${entry.slug}`);
    assert(entry.rights.provenance.type !== "unknown", `catalog-public-provenance-type-missing:${entry.slug}`);
    assert(entry.rights.provenance.reference.trim().length > 0, `catalog-public-provenance-reference-missing:${entry.slug}`);
    assert(/^\d{4}-\d{2}-\d{2}$/.test(entry.rights.provenance.verifiedAt), `catalog-public-verified-date-invalid:${entry.slug}`);
    assert(entry.rights.provenance.verifiedBy.trim().length > 0, `catalog-public-verifier-missing:${entry.slug}`);
  }

  if (entry.publicationState === "legacy-unverified") {
    assert(entry.rights.status === "unknown" || entry.rights.status === "restricted", `catalog-legacy-rights-must-remain-unverified:${entry.slug}`);
  }
}

const slugs = new Set<string>();
for (const entry of catalogRegistry) {
  assert(!slugs.has(entry.slug), `catalog-duplicate-slug:${entry.slug}`);
  slugs.add(entry.slug);
  validateEntry(entry);
}

const validPublicFixture: CatalogEntry = {
  slug: "fixture-public-domain",
  titleFa: "نمونه دامنه عمومی",
  authorFa: "نویسنده نمونه",
  primaryCollections: ["philosophy-thinking"],
  topics: ["fixture"],
  audienceLevel: "introductory",
  publicationEra: "classic",
  format: "summary",
  voices: ["sulafat"],
  sourceLanguage: "fa",
  editorialStatus: "rights-verified",
  rights: {
    status: "public-domain",
    provenance: {
      type: "public-domain-record",
      reference: "fixture://rights-record",
      verifiedAt: "2026-08-22",
      verifiedBy: "catalog-self-test",
    },
  },
  publicationState: "public",
  shelves: ["classics"],
};
validateEntry(validPublicFixture);

let rejectedUnsafePublic = false;
try {
  validateEntry({
    ...validPublicFixture,
    slug: "fixture-unsafe-public",
    rights: {
      status: "unknown",
      provenance: { type: "unknown", reference: "", verifiedAt: "", verifiedBy: "" },
    },
  });
} catch (error) {
  rejectedUnsafePublic = String(error).includes("catalog-public-rights-unsafe");
}
assert(rejectedUnsafePublic, "catalog-rights-gate-did-not-reject-unsafe-public-entry");

console.log(`Catalog registry PASS: ${catalogRegistry.length} legacy entries tracked; public rights gate enforced.`);

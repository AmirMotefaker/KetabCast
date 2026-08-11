export const NEW_THREE_SLUGS = Object.freeze([
  "think-again",
  "zero-to-one",
  "leading-teams",
]);

export function resolveFactorySlugs(catalog, requestedSlug) {
  if (!catalog || !Array.isArray(catalog.books)) {
    throw new Error("Factory catalog must contain a books array.");
  }

  const catalogSlugs = catalog.books.map((book) => book.slug);
  let slugs;

  if (requestedSlug === "all") {
    slugs = catalogSlugs;
  } else if (requestedSlug === "new-three") {
    slugs = [...NEW_THREE_SLUGS];
  } else {
    slugs = [requestedSlug];
  }

  for (const slug of slugs) {
    if (!catalogSlugs.includes(slug)) {
      throw new Error(`Unknown book slug: ${slug}`);
    }
  }

  if (new Set(slugs).size !== slugs.length) {
    throw new Error(`Duplicate slug in factory selection: ${requestedSlug}`);
  }

  return slugs;
}

export function resolveFactoryBooks(catalog, requestedSlug) {
  const slugs = resolveFactorySlugs(catalog, requestedSlug);

  return slugs.map((slug) => {
    const book = catalog.books.find((entry) => entry.slug === slug);
    if (!book) throw new Error(`Unknown book slug: ${slug}`);
    return book;
  });
}

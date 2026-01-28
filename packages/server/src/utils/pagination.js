/**
 * Utility to handle pagination logic across the app
 */
export const getPaginationOptions = (query) => {
  const pageParsed = parseInt(query.page, 10) || 1;
  const limitParsed = parseInt(query.limit, 10) || 10;

  // Safety check: Ensure page and limit are at least 1 and not exceeding 100
  const page = Math.max(1, pageParsed);
  const limit = Math.min(100, Math.max(1, limitParsed));

  const skip = (page - 1) * limit;

  return { skip, limit, page };
};

export const getPaginationMetadata = (totalItems, limit, page) => {
  const totalPages = Math.ceil(totalItems / limit);
  return {
    totalItems,
    totalPages,
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

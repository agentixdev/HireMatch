/**
 * Composable SQL filter builders for constructing WHERE clauses.
 *
 * Each filter function returns a FilterParams that can be composed
 * and compiled into a final parameterized SQL WHERE clause.
 */

export interface FilterParams {
  conditions: string[];
  params: unknown[];
}

/**
 * Create an empty filter to start composing.
 */
export function createFilter(): FilterParams {
  return { conditions: [], params: [] };
}

/**
 * Filter by a single country code.
 */
export function filterByCountry(
  filter: FilterParams,
  country: string,
  column = 'country',
): FilterParams {
  const idx = filter.params.length + 1;
  return {
    conditions: [...filter.conditions, `${column} = $${idx}`],
    params: [...filter.params, country],
  };
}

/**
 * Filter by skill overlap using PostgreSQL array overlap operator (&&).
 */
export function filterBySkills(
  filter: FilterParams,
  skills: string[],
  column = 'skills',
): FilterParams {
  if (skills.length === 0) return filter;
  const idx = filter.params.length + 1;
  return {
    conditions: [...filter.conditions, `${column} && $${idx}`],
    params: [...filter.params, skills],
  };
}

/**
 * Filter by experience year range.
 */
export function filterByExperience(
  filter: FilterParams,
  min?: number,
  max?: number,
  column = 'experience_years',
): FilterParams {
  const conditions = [...filter.conditions];
  const params = [...filter.params];

  if (min !== undefined) {
    const idx = params.length + 1;
    conditions.push(`${column} >= $${idx}`);
    params.push(min);
  }

  if (max !== undefined) {
    const idx = params.length + 1;
    conditions.push(`${column} <= $${idx}`);
    params.push(max);
  }

  return { conditions, params };
}

/**
 * Filter by visa sponsorship availability.
 */
export function filterByVisaSponsor(
  filter: FilterParams,
  sponsored: boolean,
  column = 'visa_sponsorship',
): FilterParams {
  const idx = filter.params.length + 1;
  return {
    conditions: [...filter.conditions, `${column} = $${idx}`],
    params: [...filter.params, sponsored],
  };
}

/**
 * Filter by salary range overlap.
 * Finds records where the record's salary range overlaps with the given range.
 */
export function filterBySalary(
  filter: FilterParams,
  min?: number,
  max?: number,
  minColumn = 'salary_min',
  maxColumn = 'salary_max',
): FilterParams {
  const conditions = [...filter.conditions];
  const params = [...filter.params];

  if (min !== undefined) {
    const idx = params.length + 1;
    conditions.push(`(${maxColumn} IS NULL OR ${maxColumn} >= $${idx})`);
    params.push(min);
  }

  if (max !== undefined) {
    const idx = params.length + 1;
    conditions.push(`(${minColumn} IS NULL OR ${minColumn} <= $${idx})`);
    params.push(max);
  }

  return { conditions, params };
}

/**
 * Filter by record status (e.g., 'active', 'archived', 'draft').
 */
export function filterByStatus(
  filter: FilterParams,
  status: string,
  column = 'status',
): FilterParams {
  const idx = filter.params.length + 1;
  return {
    conditions: [...filter.conditions, `${column} = $${idx}`],
    params: [...filter.params, status],
  };
}

/**
 * Filter by creation date range.
 */
export function filterByDateRange(
  filter: FilterParams,
  after?: string | Date,
  before?: string | Date,
  column = 'created_at',
): FilterParams {
  const conditions = [...filter.conditions];
  const params = [...filter.params];

  if (after) {
    const idx = params.length + 1;
    const val = after instanceof Date ? after.toISOString() : after;
    conditions.push(`${column} >= $${idx}`);
    params.push(val);
  }

  if (before) {
    const idx = params.length + 1;
    const val = before instanceof Date ? before.toISOString() : before;
    conditions.push(`${column} <= $${idx}`);
    params.push(val);
  }

  return { conditions, params };
}

/**
 * Filter by full-text search on a tsvector column.
 */
export function filterByText(
  filter: FilterParams,
  query: string,
  tsvectorColumn = 'search_vector',
  language = 'english',
): FilterParams {
  if (!query.trim()) return filter;
  const idx = filter.params.length + 1;
  return {
    conditions: [
      ...filter.conditions,
      `${tsvectorColumn} @@ plainto_tsquery('${language}', $${idx})`,
    ],
    params: [...filter.params, query.trim()],
  };
}

/**
 * Filter by education level (minimum).
 *   1 = High School, 2 = Associate, 3 = Bachelor, 4 = Master, 5 = PhD
 */
export function filterByEducation(
  filter: FilterParams,
  minLevel: number,
  column = 'education_level',
): FilterParams {
  const idx = filter.params.length + 1;
  return {
    conditions: [...filter.conditions, `${column} >= $${idx}`],
    params: [...filter.params, minLevel],
  };
}

/**
 * Compile a FilterParams into a final SQL WHERE clause string and params array.
 *
 * @param filter   The composed filter.
 * @param startIdx Starting parameter index (default 1). Useful when the filter
 *                 will be appended to an existing parameterized query.
 */
export function compileFilter(
  filter: FilterParams,
  startIdx = 1,
): { clause: string; params: unknown[] } {
  if (filter.conditions.length === 0) {
    return { clause: '', params: [] };
  }

  const offset = startIdx - 1;
  const reindexed = filter.conditions.map(condition => {
    return condition.replace(/\$(\d+)/g, (_match: string, num: string) => {
      return '$' + (parseInt(num, 10) + offset);
    });
  });

  return {
    clause: reindexed.join(' AND '),
    params: filter.params,
  };
}

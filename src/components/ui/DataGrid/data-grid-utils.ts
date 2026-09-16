/**
 * Render an ag-grid filter model entry as human-readable text (e.g. `= 5`, `contains "foo"`,
 * `1 to 9`, or a combined `A AND B`). Pure counterpart of the `DataGrid` active-filter chips.
 */
export function getFilterDisplayText(
  filterModel: Record<string, unknown> | null | undefined,
): string {
  if (!filterModel) return "";

  const { type, filter, filterTo, operator } = filterModel as {
    condition1?: Record<string, unknown>;
    condition2?: Record<string, unknown>;
    filter?: string | number;
    filterTo?: string | number;
    operator?: string;
    type?: string;
  };

  if (operator) {
    // Combined filter (AND/OR)
    const { condition1, condition2 } = filterModel as {
      condition1: Record<string, unknown>;
      condition2: Record<string, unknown>;
    };
    const text1 = getFilterDisplayText(condition1);
    const text2 = getFilterDisplayText(condition2);
    return `${text1} ${operator.toUpperCase()} ${text2}`;
  }

  let text: string;
  switch (type) {
    case "equals":
      text = `= ${filter}`;
      break;
    case "notEqual":
      text = `≠ ${filter}`;
      break;
    case "lessThan":
      text = `< ${filter}`;
      break;
    case "lessThanOrEqual":
      text = `≤ ${filter}`;
      break;
    case "greaterThan":
      text = `> ${filter}`;
      break;
    case "greaterThanOrEqual":
      text = `≥ ${filter}`;
      break;
    case "inRange":
      text = `${filter} to ${filterTo}`;
      break;
    case "contains":
      text = `contains "${filter}"`;
      break;
    case "notContains":
      text = `!contains "${filter}"`;
      break;
    case "startsWith":
      text = `starts with "${filter}"`;
      break;
    case "endsWith":
      text = `ends with "${filter}"`;
      break;
    case "blank":
      text = "is blank";
      break;
    case "notBlank":
      text = "is not blank";
      break;
    default:
      text = filter ? String(filter) : "";
  }
  return text;
}

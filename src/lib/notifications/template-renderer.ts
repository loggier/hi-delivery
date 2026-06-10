const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

export function extractTemplateVariables(text: string) {
  return Array.from(
    new Set(Array.from(text.matchAll(VARIABLE_PATTERN)).map((match) => match[1])),
  );
}

export function renderTemplate(text: string, variables: Record<string, unknown>) {
  return text.replace(VARIABLE_PATTERN, (_, key: string) => {
    const value = variables[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });
}

export function findMissingVariables(requiredKeys: string[], variables: Record<string, unknown>) {
  return requiredKeys.filter((key) => {
    const value = variables[key];
    return value === undefined || value === null || value === '';
  });
}

export function extractNotificationVariables(subject: string | null | undefined, body: string) {
  return Array.from(
    new Set([
      ...extractTemplateVariables(subject ?? ''),
      ...extractTemplateVariables(body),
    ]),
  );
}

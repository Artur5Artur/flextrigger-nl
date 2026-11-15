type LogDetail = string | number | boolean | null;

export function logError(scope: string, error: unknown, context: Record<string, LogDetail> = {}): void {
  const message = error instanceof Error ? error.message : "Onbekende fout";
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[flextrigger] ${scope}`, { message, ...context, stack });
}

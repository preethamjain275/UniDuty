// Clean Error Reporting Helper for InvigilateOS
export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[InvigilateOS Error]:", error, context);
  }
}

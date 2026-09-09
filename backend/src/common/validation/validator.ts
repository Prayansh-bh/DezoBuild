import { z } from "zod";
import { ValidationError, type InvalidParamDetail } from "../errors/app-error";

export class DtoValidator {
  /**
   * Validate arbitrary data against a Zod schema.
   * Throws a structured ValidationError (HTTP 422) if validation fails.
   */
  public static validate<T>(schema: z.ZodType<T>, data: unknown, customMessage = "Input validation failed"): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      const invalidParams: InvalidParamDetail[] = result.error.issues.map((issue) => ({
        name: issue.path.length > 0 ? issue.path.join(".") : "body",
        reason: issue.message,
      }));

      throw new ValidationError(customMessage, invalidParams);
    }

    return result.data;
  }
}

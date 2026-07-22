import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type Target = "query" | "params" | "body";

/**
 * Valida req[target] contra um schema Zod. Em caso de erro, responde 400 com
 * o campo exato e o motivo — nunca deixa um param inválido chegar na query
 * do Prisma (ex.: cursor com aspas/SQL solto vira 400, não uma tentativa de
 * consulta).
 */
export function validate(schema: ZodSchema, target: Target = "query") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.status(400).json({
        error: "validation_error",
        details: result.error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join(".") : target,
          message: issue.message,
        })),
      });
      return;
    }
    req[target] = result.data;
    next();
  };
}

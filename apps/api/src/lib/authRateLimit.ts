import type { NextFunction, Request, Response } from "express";
import { getRedis } from "./redis";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

/**
 * Limita tentativas de login/registro por IP (5 a cada 15 min), contador de
 * janela fixa no Redis. Cada rota tem seu próprio contador (chave inclui
 * `routeName`) — errar a senha não consome as tentativas de registro e
 * vice-versa. Redis indisponível degrada para "deixa passar" (fail-open):
 * não faz sentido travar todo login do site por causa de uma dependência
 * que não é a fonte da verdade de autenticação.
 */
export function authRateLimit(routeName: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `ratelimit:auth:${routeName}:${req.ip}`;

    try {
      const redis = getRedis();
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, WINDOW_SECONDS);

      if (count > MAX_ATTEMPTS) {
        res.status(429).json({
          error: "muitas_tentativas",
          message: "Muitas tentativas. Tente novamente em alguns minutos.",
        });
        return;
      }
    } catch {
      // Redis fora do ar: não bloqueia login/registro por causa disso.
    }

    next();
  };
}

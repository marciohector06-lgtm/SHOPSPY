import { NextResponse } from "next/server";

/** Integração de pagamento (Stripe/Mercado Pago) ainda não implementada — fase futura. */
export async function POST() {
  return NextResponse.json({ error: "not_implemented", message: "Checkout ainda não implementado." }, { status: 501 });
}

import * as cheerio from "cheerio";
import type { Category } from "@shopspy/shared";
import type { GlobalRegion, ParsedGlobalProduct } from "./types";

const CURRENCY_PATTERNS: Record<"US" | "UK", RegExp> = {
  US: /\$\s*([\d,]+\.?\d*)/,
  UK: /£\s*([\d,]+\.?\d*)/,
};

/**
 * Parseia uma página de Best Sellers da Amazon (HTML estático, sem JS).
 * Pura: recebe o HTML já buscado.
 *
 * As classes CSS da Amazon são hash geradas e mudam com frequência — os
 * seletores abaixo priorizam atributos estáveis (`data-asin`, hrefs `/dp/`)
 * e usam fallbacks para o texto do título/preço. Se a Amazon mudar o layout,
 * ajuste os seletores de fallback aqui; a lógica de parsing (regex de preço,
 * rank, ASIN) não muda.
 */
export function parseAmazonBestSellersHtml(
  html: string,
  category: Category,
  region: "US" | "UK"
): ParsedGlobalProduct[] {
  const $ = cheerio.load(html);
  const items: ParsedGlobalProduct[] = [];
  const currencyPattern = CURRENCY_PATTERNS[region];

  $("[data-asin]").each((_, el) => {
    const $el = $(el);
    const asin = $el.attr("data-asin")?.trim();
    if (!asin) return;

    const rankText = $el.find(".zg-bdg-text").first().text().trim();
    const rank = rankText ? Number(rankText.replace("#", "")) : undefined;

    // Alguns links /dp/ envolvem só o badge de rank ("#3") — não servem de
    // título, por isso o fallback ignora textos que são puramente um rank.
    const linkTexts = $el
      .find("a[href*='/dp/']")
      .map((_, a) => $(a).text().trim())
      .get();
    const title =
      $el.find(".p13n-sc-truncate, [class*='p13n-sc-css-line-clamp']").first().text().trim() ||
      linkTexts.find((text) => text && !/^#\d+$/.test(text)) ||
      "";

    const priceText = $el.find("[class*='p13n-sc-price']").first().text().trim();
    const priceMatch = priceText.match(currencyPattern);
    const price = priceMatch ? Number(priceMatch[1]!.replace(/,/g, "")) : undefined;

    const imageUrl = $el.find("img").first().attr("src");

    if (!title) return;

    const parsed: ParsedGlobalProduct = {
      name: title,
      category,
      imageUrl,
      platform: region === "US" ? "amazonUS" : "amazonUK",
      region: region as GlobalRegion,
      externalId: asin,
    };
    if (region === "US") {
      parsed.priceUS = price;
      parsed.amazonRankUS = rank;
    } else {
      parsed.amazonRankUK = rank;
    }

    items.push(parsed);
  });

  return items;
}

/**
 * Stawki kosztów pracodawcy i konwersja netto ↔ brutto.
 * W aplikacji przechowujemy wynagrodzenie NETTO; brutto liczymy automatycznie.
 *
 * NET_TO_GROSS — mnożnik: brutto = netto * NET_TO_GROSS (typ. ~1.43 dla PL)
 * EMPLOYER_COST_RATE — koszt pracodawcy = brutto * EMPLOYER_COST_RATE (typ. ~1.20)
 */

export const NET_TO_GROSS = 1.43;
export const EMPLOYER_COST_RATE = 1.2;

/**
 * Oblicza kwotę brutto z netto na podstawie aktualnych stawek.
 * @param {number | null} net - kwota netto
 * @returns {number | null}
 */
export function netToGross(net) {
  const n = Number(net);
  if (net == null || !Number.isFinite(n)) return null;
  return Math.round(n * NET_TO_GROSS);
}

/**
 * Oblicza koszt pracodawcy od kwoty brutto.
 * @param {number | null} gross
 * @returns {number | null}
 */
export function employerCostFromGross(gross) {
  const g = Number(gross);
  if (gross == null || !Number.isFinite(g)) return null;
  return Math.round(g * EMPLOYER_COST_RATE);
}

/**
 * Koszt pracodawcy od netto (netto → brutto → koszt).
 */
export function employerCostFromNet(net) {
  const g = netToGross(net);
  return g != null ? employerCostFromGross(g) : null;
}

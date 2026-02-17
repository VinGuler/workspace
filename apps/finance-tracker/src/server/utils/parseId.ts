/**
 * Strictly parse a string to an integer. Returns NaN if the string
 * contains any non-numeric content (unlike parseInt which silently
 * truncates "123abc" to 123).
 */
export function strictParseInt(value: string): number {
  const num = Number(value);
  return Number.isInteger(num) ? num : NaN;
}

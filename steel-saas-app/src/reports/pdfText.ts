// Built-in PDF fonts do not cover the engines' Greek/math glyphs reliably.
// Keep formulas readable and searchable without a runtime font download.
export function pdfText(value: string): string {
  const symbols: Record<string, string> = {
    "\u03c6": "phi", "\u03d5": "phi", "\u03c0": "pi", "\u03bb": "lambda",
    "\u2113": "l", "\u221a": "sqrt", "\u00d7": "*", "\u00b7": "*",
    "\u2212": "-", "\u2013": "-", "\u2014": "-", "\u2011": "-",
    "\u2264": "<=", "\u2265": ">=", "\u2192": "->",
    "\u00b2": "^2", "\u00b3": "^3", "\u2080": "_0", "\u2081": "_1", "\u2082": "_2",
    "\u2019": "'", "\u2018": "'", "\u2713": "PASS", "\u2717": "FAIL",
  };
  return value.replace(/[\u03c6\u03d5\u03c0\u03bb\u2113\u221a\u00d7\u00b7\u2212\u2013\u2014\u2011\u2264\u2265\u2192\u00b2\u00b3\u2080\u2081\u2082\u2019\u2018\u2713\u2717]/g, (symbol) => symbols[symbol]);
}

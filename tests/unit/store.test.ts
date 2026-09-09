import { describe, it, expect } from "vitest";
import { formatCurrency, formatCompactNumber } from "../../frontend/src/mock/index";

describe("DEZOBUILD Store Currency & Number Formatting", () => {
  it("formats Indian Crore currency correctly", () => {
    expect(formatCurrency(45000000)).toBe("₹4.50 Cr");
  });

  it("formats Indian Lakh currency correctly", () => {
    expect(formatCurrency(850000)).toBe("₹8.50 L");
  });

  it("formats standard thousand amounts correctly", () => {
    expect(formatCurrency(45000)).toBe("₹45,000");
  });

  it("formats compact Indian numbers with appropriate commas", () => {
    expect(formatCompactNumber(125000)).toBe("1,25,000");
  });
});

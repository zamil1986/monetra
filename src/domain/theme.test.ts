import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, isTheme, themeOrDefault } from "./theme";

describe("Theme", () => {
  it("knows the three choices", () => {
    expect(isTheme("system")).toBe(true);
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("sepia")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });

  it("follows the system until a Theme is picked", () => {
    expect(DEFAULT_THEME).toBe("system");
    expect(themeOrDefault(undefined)).toBe("system");
    expect(themeOrDefault("Dark")).toBe("system");
    expect(themeOrDefault("dark")).toBe("dark");
  });
});

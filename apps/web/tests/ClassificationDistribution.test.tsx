// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ClassificationDistribution } from "../src/components/ClassificationDistribution";

describe("<ClassificationDistribution />", () => {
  it("mostra a contagem de cada classificação", () => {
    render(
      <ClassificationDistribution counts={{ MAXIMUM: 12, HIGH: 30, MEDIUM: 45, SATURATING: 5, AVOID: 8 }} />
    );

    expect(screen.getByText("Máxima")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("Alta")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy();
    expect(screen.getByText("Saturando")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
  });

  it("todas as contagens zeradas: não quebra (barras em 0%)", () => {
    render(<ClassificationDistribution counts={{ MAXIMUM: 0, HIGH: 0, MEDIUM: 0, SATURATING: 0, AVOID: 0 }} />);
    expect(screen.getAllByText("0")).toHaveLength(5);
  });
});

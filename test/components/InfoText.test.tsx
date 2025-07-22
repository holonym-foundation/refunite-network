import React from "react";
import { describe, expect, it } from "vitest";

import { render, screen } from "@testing-library/react";

import { InfoText } from "@/components/ui/InfoText";

describe("InfoText", () => {
  it("renders info variant by default", () => {
    render(<InfoText>Info message</InfoText>);
    expect(screen.getByText("Info message")).toBeDefined();
    // Should have info icon
    expect(document.querySelector(".text-blue-500")).toBeDefined();
  });

  it("renders warning variant", () => {
    render(<InfoText variant="warning">Warning message</InfoText>);
    expect(screen.getByText("Warning message")).toBeDefined();
    // Should have warning icon
    expect(document.querySelector(".text-yellow-600")).toBeDefined();
  });

  it("renders progress variant", () => {
    render(<InfoText variant="progress">Progress message</InfoText>);
    expect(screen.getByText("Progress message")).toBeDefined();
    // Should have spinner icon
    expect(document.querySelector(".animate-spin")).toBeDefined();
  });

  it("renders heading and message", () => {
    render(<InfoText heading="Test Heading">Test prompt message</InfoText>);
    expect(screen.getByText("Test Heading")).toBeDefined();
    expect(screen.getByText("Test prompt message")).toBeDefined();
    // Heading should be visually distinct (font-semibold, text-lg)
    const heading = screen.getByText("Test Heading");
    expect(heading.classList.contains("font-semibold")).toBeTruthy();
    expect(heading.classList.contains("text-lg")).toBeTruthy();
  });
});

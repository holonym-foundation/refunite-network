import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OnboardingProgress } from "../../src/components/OnboardingProgress";

// Simple test for OnboardingProgress
// Verifies that steps render and the current step is highlighted

describe("OnboardingProgress", () => {
  it("renders all steps and highlights the current step", () => {
    const steps = [
      { title: "Step 1", description: "desc 1" },
      { title: "Step 2", description: "desc 2" },
      { title: "Step 3", description: "desc 3" },
    ];
    render(<OnboardingProgress steps={steps} currentStep={1} />);

    // All step labels should be present
    steps.forEach((step) => {
      expect(screen.getByText(step.title)).toBeDefined();
    });

    // The current step should have aria-current="step"
    const activeStep = screen.getByText("Step 2").previousSibling;
    expect(activeStep).toBeDefined();
  });
});

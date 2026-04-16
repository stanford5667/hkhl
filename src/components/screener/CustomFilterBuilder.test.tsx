import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomFilterBuilder } from "@/components/screener/CustomFilterBuilder";

describe("CustomFilterBuilder", () => {
  it("renders add button initially", () => {
    render(<CustomFilterBuilder onChange={vi.fn()} />);
    expect(screen.getByTestId("add-custom-filter")).toBeInTheDocument();
  });

  it("adds a filter row when clicking add", () => {
    render(<CustomFilterBuilder onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId("add-custom-filter"));
    expect(screen.getByTestId("custom-filter-row")).toBeInTheDocument();
  });

  it("removes a filter row", () => {
    render(<CustomFilterBuilder onChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId("add-custom-filter"));
    expect(screen.getByTestId("custom-filter-row")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("custom-filter-remove"));
    expect(screen.queryByTestId("custom-filter-row")).not.toBeInTheDocument();
  });

  it("calls onChange when filter is added", () => {
    const onChange = vi.fn();
    render(<CustomFilterBuilder onChange={onChange} />);
    fireEvent.click(screen.getByTestId("add-custom-filter"));
    expect(onChange).toHaveBeenCalled();
  });
});

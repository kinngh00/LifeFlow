import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "@/app/page";

describe("HomePage", () => {
  it("서비스 범위와 시작 링크를 보여준다", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "내 상황에 맞는 지원을",
    );
    expect(screen.getByRole("link", { name: "조건 입력 화면 보기" })).toHaveAttribute(
      "href",
      "/questionnaire",
    );
  });
});

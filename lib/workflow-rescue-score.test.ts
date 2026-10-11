import { describe, expect, test } from "bun:test";
import { workflowRescueQuestions, workflowRescueResult, workflowRescueScore } from "@/lib/workflow-rescue-score";

describe("workflow rescue bottleneck check", () => {
  test("defines five questions with bounded response values", () => {
    expect(workflowRescueQuestions).toHaveLength(5);
    for (const question of workflowRescueQuestions) {
      expect(question.options.map(({ value }) => value)).toEqual([0, 1, 2]);
    }
  });

  test("scores answers deterministically and clamps unexpected values", () => {
    expect(workflowRescueScore([0, 1, 2, 1, 2])).toBe(6);
    expect(workflowRescueScore([-3, 9])).toBe(2);
  });

  test("maps boundary scores to the correct recommendation", () => {
    expect(workflowRescueResult(3).band).toBe("contained");
    expect(workflowRescueResult(4).band).toBe("drag");
    expect(workflowRescueResult(6).band).toBe("drag");
    expect(workflowRescueResult(7).band).toBe("rescue");
    expect(workflowRescueResult(10).band).toBe("rescue");
  });
});

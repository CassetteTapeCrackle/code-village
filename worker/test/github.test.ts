import { expect, test, vi } from "vitest";
import { openGithubIssue } from "../src/github";

const refused = (status: number) => async () => new Response("{}", { status });

test("a refused issue request returns null and logs the status", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(await openGithubIssue("tok", "T", "B", [], refused(401))).toBeNull();
    expect(logged).toHaveBeenCalledWith("github: issue not opened", 401);
    expect(logged).toHaveBeenCalledTimes(1);
  } finally {
    logged.mockRestore();
  }
});

test("a thrown issue request returns null and logs the error", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const broken = async (): Promise<Response> => {
      throw new Error("offline");
    };
    expect(await openGithubIssue("tok", "T", "B", [], broken)).toBeNull();
    expect(logged).toHaveBeenCalledWith("github: issue request failed", "offline");
    expect(logged).toHaveBeenCalledTimes(1);
  } finally {
    logged.mockRestore();
  }
});

test("the token, title and body never appear in a logged argument", async () => {
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const token = "ghp_secret_do_not_log";
    const title = "T-private-title";
    const body = "B-private-body";
    await openGithubIssue(token, title, body, [], refused(401));
    await openGithubIssue(token, title, body, [], async () => {
      throw new Error("offline");
    });
    expect(logged).toHaveBeenCalledTimes(2);
    const text = logged.mock.calls
      .flat()
      .map((arg) => (arg instanceof Error ? arg.message : JSON.stringify(arg)))
      .join(" ");
    expect(text).not.toContain(token);
    expect(text).not.toContain(title);
    expect(text).not.toContain(body);
  } finally {
    logged.mockRestore();
  }
});

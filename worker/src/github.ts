// Reports go to a private repo: learner code and messages can hold personal text, and code-village is public.
const ISSUES_URL = "https://api.github.com/repos/CassetteTapeCrackle/code-village-reports/issues";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

// Returns the new issue number, or null on any failure: the report is already stored, so a
// GitHub outage must not fail the learner's request.
export async function openGithubIssue(
  token: string,
  title: string,
  body: string,
  labels: string[],
  fetchFn: Fetch = fetch,
): Promise<number | null> {
  try {
    const res = await fetchFn(ISSUES_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "code-village-worker",
        "content-type": "application/json",
      },
      body: JSON.stringify({ title, body, labels }),
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const issue = typeof data === "object" && data !== null ? (data as { number?: unknown }).number : null;
    return typeof issue === "number" ? issue : null;
  } catch {
    return null;
  }
}

import { expect, test } from "vitest";
import { setupCommands } from "./agentSetup";

const ORIGIN = "https://village.example";
const TOKEN = "agent-token-1";

test("setupCommands returns the three tools in order", () => {
  expect(setupCommands(ORIGIN, TOKEN).map((command) => command.tool)).toEqual([
    "Claude Code",
    "Codex",
    "opencode",
  ]);
});

test("every command carries the origin and the token", () => {
  for (const command of setupCommands(ORIGIN, TOKEN)) {
    expect(command.text).toContain(`${ORIGIN}/mcp`);
    expect(command.text).toContain(TOKEN);
  }
});

test("the Claude Code command is one line with the bearer header", () => {
  expect(setupCommands(ORIGIN, TOKEN)[0].text).toBe(
    `claude mcp add --transport http code-village ${ORIGIN}/mcp --header "Authorization: Bearer ${TOKEN}"`,
  );
});

test("the Codex command is a config block plus a shell export", () => {
  expect(setupCommands(ORIGIN, TOKEN)[1].text).toBe(
    [
      "# add to ~/.codex/config.toml",
      "[mcp_servers.code-village]",
      `url = "${ORIGIN}/mcp"`,
      'bearer_token_env_var = "CODE_VILLAGE_TOKEN"',
      "",
      "# and in your shell profile",
      `export CODE_VILLAGE_TOKEN="${TOKEN}"`,
    ].join("\n"),
  );
});

test("the opencode command is a JSON block with the bearer header", () => {
  expect(setupCommands(ORIGIN, TOKEN)[2].text).toBe(
    [
      "{",
      '  "mcp": {',
      '    "code-village": {',
      '      "type": "remote",',
      `      "url": "${ORIGIN}/mcp",`,
      '      "enabled": true,',
      `      "headers": { "Authorization": "Bearer ${TOKEN}" }`,
      "    }",
      "  }",
      "}",
    ].join("\n"),
  );
});

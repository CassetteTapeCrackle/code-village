export type AgentSetupCommand = { tool: "Claude Code" | "Codex" | "opencode"; text: string };

// The syntax of each command was checked against the tool's current docs on 2026-10-15
// (the plan lists the sources); revisit per tool if one changes its flags or config keys.
export function setupCommands(origin: string, token: string): AgentSetupCommand[] {
  return [
    {
      tool: "Claude Code",
      text: `claude mcp add --transport http code-village ${origin}/mcp --header "Authorization: Bearer ${token}"`,
    },
    {
      tool: "Codex",
      text: [
        "# add to ~/.codex/config.toml",
        "[mcp_servers.code-village]",
        `url = "${origin}/mcp"`,
        'bearer_token_env_var = "CODE_VILLAGE_TOKEN"',
        "",
        "# and in your shell profile",
        `export CODE_VILLAGE_TOKEN="${token}"`,
      ].join("\n"),
    },
    {
      tool: "opencode",
      text: [
        "{",
        '  "mcp": {',
        '    "code-village": {',
        '      "type": "remote",',
        `      "url": "${origin}/mcp",`,
        '      "enabled": true,',
        `      "headers": { "Authorization": "Bearer ${token}" }`,
        "    }",
        "  }",
        "}",
      ].join("\n"),
    },
  ];
}

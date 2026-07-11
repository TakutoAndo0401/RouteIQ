# RouteIQ agent instructions

## UI component work

When a task involves RouteIQ UI components, use the `routeiq-storybook` MCP server before changing or describing component code.

1. Start Storybook from the repository root with `pnpm storybook` before opening or restarting the agent session. The MCP endpoint is `http://localhost:6006/mcp`.
2. Call `list-all-documentation` to discover the available components and documentation entries.
3. Call `get-documentation` before using a component. Use `get-documentation-for-story` when the component summary is not sufficient.
4. Call `get-storybook-story-instructions` before creating or updating stories.
5. Use `get-stories-by-component` to find affected stories when changing a component or one of its dependencies.
6. Use `preview-stories` to inspect the relevant states after a UI change.

Never invent component properties or infer them from common library conventions. Only use properties documented by the Storybook MCP tools or verified in the component source. If the MCP server is unavailable, state that limitation, inspect the implementation directly, and do not guess.

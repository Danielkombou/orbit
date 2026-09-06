# Agent

Python-based agent subsystem for Orbit. Each directory is a pluggable module.

- **orchestrator/** — coordinates the overall agent workflow and routing
- **browser/** — browser automation / web navigation
- **computer/** — desktop / OS-level operations
- **tools/** — extensible tool registry used by agents
- **memory/** — persistence and recall of agent state/context
- **planner/** — task decomposition and planning

These modules are intended to be independent from the TypeScript workspace.
See `apps/api` for the HTTP surface that talks to these agents.

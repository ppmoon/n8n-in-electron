# Superpowers (vendored)

This project vendors the [Superpowers](https://github.com/obra/Superpowers) skills
framework so its skills are available to Cursor agents working in this repository.

- **Source:** https://github.com/obra/Superpowers
- **Version:** 6.1.1
- **Tag / commit:** `v6.1.1` (`d884ae04edebef577e82ff7c4e143debd0bbec99`)
- **License:** MIT — see `.cursor/LICENSE-superpowers`

## What was installed

Superpowers is distributed as a coding-agent *plugin*. Cursor does not auto-discover
plugin bundles committed to a repo; it discovers **skills** under `.cursor/skills/`
and **hooks** from `.cursor/hooks.json`. This install therefore "unbundles" the
plugin into those project-local locations:

- `.cursor/skills/<skill>/SKILL.md` — the 14 core skills (brainstorming, TDD,
  systematic-debugging, writing-plans, subagent-driven-development, etc.), copied
  verbatim from the plugin's `skills/` directory.
- `.cursor/hooks/` — the plugin's `session-start` script and its cross-platform
  `run-hook.cmd` launcher.
- `.cursor/hooks.json` — a `sessionStart` hook that injects the `using-superpowers`
  bootstrap into the session's initial context. It sets `CURSOR_PLUGIN_ROOT` so the
  upstream script emits Cursor's `additional_context` field. The script resolves its
  own directory, so it reads `.cursor/skills/using-superpowers/SKILL.md` regardless
  of the working directory.

## Notes

- Skills load automatically (Customize → Skills). Each can also be invoked directly,
  e.g. `/brainstorming`.
- The `sessionStart` hook is fire-and-forget and, per Cursor docs, does **not** run in
  cloud agents; skills still load and remain usable via the Skill tool there.
- Telemetry: brainstorming's optional visual companion loads a logo (including the
  Superpowers version) from the author's site. Set `SUPERPOWERS_DISABLE_TELEMETRY=1`
  to disable.

## Updating

Re-vendor from a newer tag by copying that tag's `skills/` into `.cursor/skills/`
and its `hooks/session-start` + `hooks/run-hook.cmd` into `.cursor/hooks/`.

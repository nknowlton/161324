---
applyTo: "lectures/widgets/**/*.js"
---

# Widget Instructions

- Keep reusable widget logic in shared JS modules, not inline in lecture files.
- Reuse and extend existing exports before adding new files or new algorithms.
- Prefer explicit, readable browser-side code over framework-heavy abstractions.
- Keep public widget exports stable unless the task explicitly calls for interface changes.
- Preserve local relative imports inside a widget topic folder unless there is a clear shared abstraction already in use.

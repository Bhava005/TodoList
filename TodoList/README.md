# Todo List

A front-end only todo list app. No build step, no server, no dependencies — open `index.html` in a browser and it works. Tasks are saved in the browser's `localStorage`, so they survive a refresh or a restart.

## Features

- **Add, edit, and delete tasks** — double-click a task (or use the pencil button) to rename it in place
- **Mark tasks done** — with a strikethrough and a live "items left" counter
- **Filter** — All / Active / Completed, driven by the URL hash (`#/active`), so the view is bookmarkable and the browser Back button works
- **Bulk actions** — mark everything done at once, or clear all completed tasks
- **Light and dark themes** — follows your OS preference by default, with a toggle that remembers your choice
- **Offline and persistent** — everything is stored locally in your browser; no network requests at all
- **Responsive** — usable from narrow phone widths up to desktop
- **Accessible** — labelled controls, a live-updating counter, visible focus rings, and full keyboard operation

## Getting started

Clone the repository and open the page:

```bash
git clone <repository-url>
cd TodoList
```

Then either:

- **Double-click `index.html`**, or
- Serve it locally (recommended if you plan to add modules later):

  ```bash
  # Python 3
  python -m http.server 8000

  # or Node
  npx serve .
  ```

  Then visit <http://localhost:8000>.

There is nothing to install and nothing to build.

## Usage

| Action | How |
| --- | --- |git status
| Add a task | Type in the box and press <kbd>Enter</kbd>, or click **Add** |
| Complete a task | Click its checkbox |
| Edit a task | Double-click the task text, or click the pencil button |
| Save an edit | <kbd>Enter</kbd>, or click outside the field |
| Cancel an edit | <kbd>Esc</kbd> |
| Delete a task | Click the trash button |
| Delete via editing | Clear the text while editing and save |
| Complete everything | Tick **Mark all as done** |
| Remove finished tasks | Click **Clear completed** |
| Switch theme | Click the moon/sun button in the header |

Blank or whitespace-only entries are ignored, and task text is capped at 200 characters.

## Project structure

```
TodoList/
├── index.html    # Markup, plus the <template> used for each list row
├── styles.css    # Design tokens, layout, light/dark themes
├── app.js        # State, persistence, rendering, and event handling
└── README.md
```

Three source files, around 1,000 lines in total, and no dependencies.

## How it works

The app keeps a single array of task objects in memory:

```js
{ id: "…", text: "Buy groceries", completed: false }
```

Every action follows the same path — mutate the array, write it to `localStorage`, then re-render the list from state. Rendering rebuilds the rows from a `<template>` element rather than patching the DOM in place, which keeps the update logic short and removes a whole class of "the view drifted out of sync with the data" bugs. At this scale the cost of a full re-render is not measurable.

A few details worth knowing:

- **Task text is inserted with `textContent`, never `innerHTML`**, so text like `<script>` is displayed literally rather than being interpreted as markup.
- **Every `localStorage` access is wrapped in `try`/`catch`.** Storage can throw in private-browsing mode, when cookies are disabled, or when the quota is full. In that case the app still runs normally for the session; it just doesn't persist.
- **Stored data is validated on load.** If the saved JSON is corrupt or has the wrong shape, the app falls back to an empty list instead of failing to start.
- **The active filter lives in the URL hash**, so it is shareable and works with browser history.
- **The saved theme is applied by a small inline script in `<head>`**, before first paint, so there's no flash of the wrong colors on load.

## Data and privacy

All data stays in your browser under the keys `todo-list:items:v1` and `todo-list:theme`. Nothing is uploaded anywhere. Clearing your browser's site data — or opening the app in a different browser or profile — gives you an empty list.

## Browser support

Works in current versions of Chrome, Edge, Firefox, and Safari. It relies on `<template>`, `localStorage`, CSS custom properties, and `Element.closest()` — all long-standing, widely available features.

## Customizing

The palette is defined once as CSS custom properties at the top of `styles.css`, in three blocks: the light defaults on `:root`, the OS-dark overrides, and the explicit `[data-theme="dark"]` overrides. Change the accent color in all three and the whole UI follows:

```css
:root {
  --accent: #4f46e5;
  --accent-hover: #4338ca;
}
```

## Possible next steps

Deliberately left out to keep the app dependency-free, but each is a natural extension:

- Due dates, priorities, or tags
- Drag-and-drop reordering
- Search across tasks
- Export and import as JSON
- A backend, so lists sync across devices

## License

MIT.

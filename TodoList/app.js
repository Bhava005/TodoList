/**
 * Todo List — front-end only.
 *
 * State lives in memory and is mirrored into localStorage on every change.
 * The DOM is re-rendered from state after each action, which keeps the
 * update path simple: mutate `todos`, call save(), call render().
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'todo-list:items:v1';
  var THEME_KEY = 'todo-list:theme';
  var MAX_LENGTH = 200;

  var FILTERS = {
    all: function () { return true; },
    active: function (todo) { return !todo.completed; },
    completed: function (todo) { return todo.completed; }
  };

  var els = {
    form: document.getElementById('new-todo-form'),
    input: document.getElementById('new-todo-input'),
    list: document.getElementById('todo-list'),
    listHeader: document.getElementById('list-header'),
    toggleAll: document.getElementById('toggle-all'),
    emptyState: document.getElementById('empty-state'),
    footer: document.getElementById('app-footer'),
    counter: document.getElementById('counter'),
    clearCompleted: document.getElementById('clear-completed'),
    themeToggle: document.getElementById('theme-toggle'),
    template: document.getElementById('todo-item-template')
  };

  var todos = loadTodos();
  var filter = readFilterFromHash();
  var editingId = null;

  /* ---------------------------------------------------------------
     Storage
     localStorage can throw (private mode, quota, disabled cookies).
     Every access is guarded so the app degrades to in-memory only.
     --------------------------------------------------------------- */

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      /* Ignored: the session still works, it just won't persist. */
    }
  }

  function loadTodos() {
    var raw = storageGet(STORAGE_KEY);
    if (!raw) return [];

    try {
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter(function (item) {
          return item && typeof item.text === 'string' && item.text.trim() !== '';
        })
        .map(function (item) {
          return {
            id: typeof item.id === 'string' ? item.id : createId(),
            text: item.text.slice(0, MAX_LENGTH),
            completed: item.completed === true
          };
        });
    } catch (err) {
      return [];
    }
  }

  function save() {
    storageSet(STORAGE_KEY, JSON.stringify(todos));
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'id-' + Math.random().toString(36).slice(2) + '-' + performance.now().toString(36);
  }

  /* ---------------------------------------------------------------
     Actions
     --------------------------------------------------------------- */

  function addTodo(text) {
    todos.push({ id: createId(), text: text, completed: false });
    save();
    render();
  }

  function toggleTodo(id) {
    var todo = findTodo(id);
    if (!todo) return;
    todo.completed = !todo.completed;
    save();
    render();
  }

  function deleteTodo(id) {
    todos = todos.filter(function (todo) { return todo.id !== id; });
    save();
    render();
  }

  function setAllCompleted(completed) {
    todos.forEach(function (todo) { todo.completed = completed; });
    save();
    render();
  }

  function clearCompleted() {
    todos = todos.filter(function (todo) { return !todo.completed; });
    save();
    render();
  }

  function findTodo(id) {
    return todos.filter(function (todo) { return todo.id === id; })[0] || null;
  }

  /* ---------------------------------------------------------------
     Editing
     `editingId` is nulled before any work happens, so a blur event
     fired by the re-render cannot commit the same edit twice.
     --------------------------------------------------------------- */

  function beginEdit(id) {
    editingId = id;
    render();
  }

  function commitEdit(value) {
    if (editingId === null) return;

    var id = editingId;
    editingId = null;

    var text = value.trim().slice(0, MAX_LENGTH);
    if (text === '') {
      deleteTodo(id); // Emptying a task is treated as deleting it.
      return;
    }

    var todo = findTodo(id);
    if (todo) todo.text = text;
    save();
    render();
  }

  function cancelEdit() {
    if (editingId === null) return;
    editingId = null;
    render();
  }

  /* ---------------------------------------------------------------
     Filtering
     --------------------------------------------------------------- */

  function readFilterFromHash() {
    var key = window.location.hash.replace(/^#\/?/, '');
    return Object.prototype.hasOwnProperty.call(FILTERS, key) ? key : 'all';
  }

  function visibleTodos() {
    return todos.filter(FILTERS[filter]);
  }

  function remainingCount() {
    return todos.filter(function (todo) { return !todo.completed; }).length;
  }

  function completedCount() {
    return todos.filter(function (todo) { return todo.completed; }).length;
  }

  /* ---------------------------------------------------------------
     Rendering
     --------------------------------------------------------------- */

  function render() {
    var visible = visibleTodos();
    var total = todos.length;
    var remaining = remainingCount();
    var completed = completedCount();

    els.list.textContent = '';

    var fragment = document.createDocumentFragment();
    visible.forEach(function (todo) {
      fragment.appendChild(createTodoElement(todo));
    });
    els.list.appendChild(fragment);

    // Empty state
    var message = emptyMessage(total, visible.length);
    els.emptyState.textContent = message;
    els.emptyState.hidden = message === '';

    // Chrome
    els.listHeader.hidden = total === 0;
    els.footer.hidden = total === 0;
    els.counter.textContent = remaining + (remaining === 1 ? ' item left' : ' items left');
    els.clearCompleted.disabled = completed === 0;
    els.clearCompleted.textContent =
      completed > 0 ? 'Clear completed (' + completed + ')' : 'Clear completed';
    els.toggleAll.checked = total > 0 && remaining === 0;

    // Filter links
    Array.prototype.forEach.call(
      document.querySelectorAll('.filters__link'),
      function (link) {
        var isActive = link.dataset.filter === filter;
        link.classList.toggle('is-active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      }
    );

    focusEditInput();
  }

  function createTodoElement(todo) {
    var item = els.template.content.firstElementChild.cloneNode(true);
    var checkbox = item.querySelector('.todo__checkbox');
    var text = item.querySelector('.todo__text');
    var edit = item.querySelector('.todo__edit');
    var editButton = item.querySelector('[data-action="edit"]');
    var deleteButton = item.querySelector('[data-action="delete"]');

    item.dataset.id = todo.id;
    item.classList.toggle('is-completed', todo.completed);

    checkbox.checked = todo.completed;
    checkbox.setAttribute(
      'aria-label',
      (todo.completed ? 'Mark "' + todo.text + '" as not done' : 'Mark "' + todo.text + '" as done')
    );

    // textContent (never innerHTML) — task text is user input.
    text.textContent = todo.text;
    editButton.setAttribute('aria-label', 'Edit "' + todo.text + '"');
    deleteButton.setAttribute('aria-label', 'Delete "' + todo.text + '"');

    if (todo.id === editingId) {
      item.classList.add('is-editing');
      edit.hidden = false;
      edit.value = todo.text;
      edit.setAttribute('aria-label', 'Edit task');
    }

    return item;
  }

  function emptyMessage(total, visibleCount) {
    if (total === 0) return 'Nothing here yet. Add your first task above.';
    if (visibleCount > 0) return '';
    if (filter === 'active') return 'No active tasks. All done!';
    if (filter === 'completed') return 'Nothing completed yet.';
    return '';
  }

  function focusEditInput() {
    if (editingId === null) return;
    var input = els.list.querySelector('.is-editing .todo__edit');
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  /* ---------------------------------------------------------------
     Theme
     --------------------------------------------------------------- */

  function prefersDark() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function currentTheme() {
    var explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'light' || explicit === 'dark') return explicit;
    return prefersDark() ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    storageSet(THEME_KEY, theme);
  }

  /* ---------------------------------------------------------------
     Events
     --------------------------------------------------------------- */

  els.form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = els.input.value.trim().slice(0, MAX_LENGTH);
    if (text === '') return;
    addTodo(text);
    els.input.value = '';
    els.input.focus();
  });

  els.list.addEventListener('change', function (event) {
    var checkbox = event.target.closest('.todo__checkbox');
    if (!checkbox) return;
    toggleTodo(checkbox.closest('.todo').dataset.id);
  });

  els.list.addEventListener('click', function (event) {
    var button = event.target.closest('[data-action]');
    if (!button) return;

    var id = button.closest('.todo').dataset.id;
    if (button.dataset.action === 'edit') beginEdit(id);
    if (button.dataset.action === 'delete') deleteTodo(id);
  });

  els.list.addEventListener('dblclick', function (event) {
    var text = event.target.closest('.todo__text');
    if (!text) return;
    beginEdit(text.closest('.todo').dataset.id);
  });

  els.list.addEventListener('keydown', function (event) {
    if (!event.target.classList.contains('todo__edit')) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      commitEdit(event.target.value);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  });

  // Clicking away saves, matching the behavior of pressing Enter.
  els.list.addEventListener(
    'blur',
    function (event) {
      if (!event.target.classList.contains('todo__edit')) return;
      commitEdit(event.target.value);
    },
    true // blur does not bubble; capture instead
  );

  els.toggleAll.addEventListener('change', function (event) {
    setAllCompleted(event.target.checked);
  });

  els.clearCompleted.addEventListener('click', clearCompleted);

  els.themeToggle.addEventListener('click', function () {
    applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  });

  window.addEventListener('hashchange', function () {
    filter = readFilterFromHash();
    editingId = null; // Drop any in-progress edit rather than carry it across views.
    render();
  });

  /* ---------------------------------------------------------------
     Start
     --------------------------------------------------------------- */

  render();
  els.input.focus();
})();

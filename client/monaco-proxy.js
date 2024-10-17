/*
 * Author: Marcel Canhisares
 * 
 * Released under the GNU AGPLv3 License
 * Copyright (c) 2024 Marcel Canhisares
 */

(function() {
  console.log("[MONACO PROXY] Interceptor loaded");

  let originalMonaco = window.monaco;
  let editorInstances = new Map();
  let isLocalChange = false;
  let previousChanges = null;

  function createMonacoProxy() {
    return new Proxy(originalMonaco || {}, {
      get(target, prop) {
        if (prop === 'editor') {
          return createEditorProxy(target.editor || {});
        }
        return target[prop];
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      }
    });
  }

  function createEditorProxy(editorObj) {
    return new Proxy(editorObj, {
      get(target, prop) {
        if (prop === 'create') {
          return function(...args) {
            console.log('[MONACO PROXY] Creating editor');
            const editor = target.create.apply(this, args);
            const editorId = Math.random().toString(36).substring(7);
            editorInstances.set(editorId, createEditorInstanceProxy(editor, editorId));
            return editorInstances.get(editorId);
          };
        }
        return target[prop];
      }
    });
  }

  function createEditorInstanceProxy(editorInstance, editorId) {
    return new Proxy(editorInstance, {
      get(target, prop) {
        if (prop === 'setValue') {
          return function(value) {
            console.log('[MONACO PROXY] Setting editor value');
            isLocalChange = true;
            const model = target.getModel();
            if (model) {
              model.pushEditOperations(
                [],
                [{
                  range: model.getFullModelRange(),
                  text: value
                }],
                () => null
              );
              target.setPosition(model.getPositionAt(value.length));
            } else {
              console.error('[MONACO PROXY] Editor model not found');
            }
            isLocalChange = false;
          };
        }
        if (prop === 'getValue') {
          return function() {
            return target.getValue();
          };
        }
        if (prop === 'onDidChangeModelContent') {
          return function(listener) {
            return target.onDidChangeModelContent((event) => {
              if (!isLocalChange) {
                const value = target.getValue();
                if (value === previousChanges) {
                  return;
                }
                previousChanges = value;
                console.log('[MONACO PROXY] Editor content changed');
                sendToContentScript({
                  action: 'codeChange',
                  code: target.getValue(),
                  editorId: editorId
                });
              }
              listener(event);
            });
          };
        }
        return target[prop];
      }
    });
  }

  function sendToContentScript(data) {
    window.postMessage({
      type: "FROM_PAGE",
      ...data
    }, "*");
  }

  function updateAllEditors(code) {
    console.log('[MONACO PROXY] Updating all editors');
    editorInstances.forEach((editor, id) => {
      editor.setValue(code);
    });
  }

  Object.defineProperty(window, 'monaco', {
    get: function() {
      return createMonacoProxy();
    },
    set: function(value) {
      originalMonaco = value;
    },
    configurable: true
  });

  window.addEventListener("message", function(event) {
    if (event.source != window) return;
    if (event.data.type && event.data.type == "FROM_CONTENT_SCRIPT") {
      console.log("[MONACO PROXY] Received message from content script:", event.data.action);
      if ((event.data.action === "updateCode" || event.data.action === "setInitialCode")) {
        updateAllEditors(event.data.code);
      }
    }
  }, false);

  console.log("[MONACO PROXY] Setup complete");
})();
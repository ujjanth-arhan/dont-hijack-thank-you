const resultsElement = document.querySelector("#results");
const tests = [];

function test(name, callback) {
  tests.push({ name, callback });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = path;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Could not load ${path}`));
    document.head.append(script);
  });
}

test("resolves default, custom, and allowlisted settings", () => {
  const model = globalThis.__dontHijackSettings;
  const defaults = model.getOriginSettings("https://default.example", {
    siteSettings: {},
    allowlistedOrigins: [],
    disabledOrigins: []
  });
  const custom = model.getOriginSettings("https://custom.example", {
    siteSettings: {
      "https://custom.example": {
        copy: false
      }
    },
    allowlistedOrigins: [],
    disabledOrigins: []
  });
  const allowlisted = model.getOriginSettings("https://allowed.example", {
    siteSettings: {},
    allowlistedOrigins: ["https://allowed.example"],
    disabledOrigins: []
  });

  assert(defaults.contextMenu && defaults.copy, "Defaults should be enabled.");
  assert(custom.contextMenu && !custom.copy, "Custom settings should merge.");
  assert(
    !allowlisted.contextMenu && !allowlisted.copy,
    "Allowlisted settings should be disabled."
  );
});

test("migrates legacy disabled origins", () => {
  const model = globalThis.__dontHijackSettings;
  const stored = {
    siteSettings: {},
    allowlistedOrigins: [],
    disabledOrigins: ["https://legacy.example"]
  };
  const normalized = model.normalize(stored);

  assert(
    normalized.allowlistedOrigins.includes("https://legacy.example"),
    "Legacy origin should move to the allowlist."
  );
  assert(normalized.disabledOrigins.length === 0, "Legacy list should clear.");
  assert(model.needsMigration(stored, normalized), "Migration should be detected.");
});

test("blocks enabled handlers and permits disabled handlers", async () => {
  await loadScript("../interceptor.js");

  const settingsAttribute = "data-dont-hijack-event";
  const settingsEventName =
    document.documentElement.getAttribute(settingsAttribute);

  assert(settingsEventName, "Interceptor should publish a settings channel.");
  document.documentElement.removeAttribute(settingsAttribute);

  let contextMenuCalls = 0;
  let copyCalls = 0;

  window.addEventListener("contextmenu", () => {
    contextMenuCalls += 1;
  });
  window.addEventListener("copy", () => {
    copyCalls += 1;
  });

  window.dispatchEvent(new Event("contextmenu", { cancelable: true }));
  window.dispatchEvent(new Event("copy", { cancelable: true }));
  assert(contextMenuCalls === 0, "Context-menu handler should be blocked.");
  assert(copyCalls === 0, "Copy handler should be blocked.");

  window.dispatchEvent(
    new CustomEvent(settingsEventName, {
      detail: {
        contextMenu: false,
        copy: false,
        unknownFeature: false
      }
    })
  );
  window.dispatchEvent(new Event("contextmenu", { cancelable: true }));
  window.dispatchEvent(new Event("copy", { cancelable: true }));
  assert(contextMenuCalls === 1, "Context-menu handler should be permitted.");
  assert(copyCalls === 1, "Copy handler should be permitted.");
});

(async () => {
  const output = [];

  try {
    for (const currentTest of tests) {
      await currentTest.callback();
      output.push(`PASS ${currentTest.name}`);
    }

    document.body.dataset.status = "passed";
  } catch (error) {
    output.push(`FAIL ${error.message}`);
    document.body.dataset.status = "failed";
  }

  resultsElement.textContent = output.join("\n");
})();

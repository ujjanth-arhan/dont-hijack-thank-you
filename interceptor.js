(() => {
  const readyEventName = "__dontHijackReady";
  const settingsEventName = `__dontHijackThankYou_${crypto.randomUUID()}`;
  const featureDefinitions =
    globalThis.__dontHijackFeatureDefinitions;
  let settings = Object.fromEntries(
    featureDefinitions.map(feature => [
      feature.key,
      feature.defaultEnabled
    ])
  );

  delete globalThis.__dontHijackFeatureDefinitions;

  window.addEventListener(
    settingsEventName,
    event => {
      if (!event.detail || typeof event.detail !== "object") {
        return;
      }

      for (const feature of featureDefinitions) {
        if (typeof event.detail[feature.key] === "boolean") {
          settings[feature.key] = event.detail[feature.key];
        }
      }
    },
    true
  );

  document.documentElement?.setAttribute(
    "data-dont-hijack-event",
    settingsEventName
  );
  window.dispatchEvent(new Event(readyEventName));

  window.addEventListener(
    "contextmenu",
    event => {
      if (settings.contextMenu) {
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    "copy",
    event => {
      if (settings.copy) {
        event.stopImmediatePropagation();
      }
    },
    true
  );
})();

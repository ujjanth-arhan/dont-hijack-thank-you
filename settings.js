(() => {
  const origin = getOrigin(location.href);
  const settingsAttribute = "data-dont-hijack-event";
  const readyEventName = "__dontHijackReady";
  const settingsModel = globalThis.__dontHijackSettings;
  let settingsEventName;
  let pendingSettings;

  function getOrigin(url) {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.origin === "null" ? null : parsedUrl.origin;
    } catch {
      return null;
    }
  }

  function captureSettingsChannel() {
    if (settingsEventName) {
      return true;
    }

    const documentElement = document.documentElement;
    const channelName = documentElement?.getAttribute(settingsAttribute);

    if (!channelName) {
      return false;
    }

    settingsEventName = channelName;
    documentElement.removeAttribute(settingsAttribute);

    if (pendingSettings) {
      const settings = pendingSettings;
      pendingSettings = undefined;
      updateInterceptor(settings);
    }

    return true;
  }

  function updateInterceptor(settings) {
    if (!captureSettingsChannel()) {
      pendingSettings = settings;
      return;
    }

    window.dispatchEvent(
      new CustomEvent(settingsEventName, {
        detail: settings
      })
    );
  }

  window.addEventListener(readyEventName, captureSettingsChannel, true);
  captureSettingsChannel();

  if (!origin) {
    return;
  }

  settingsModel.read(
    storedSettings => {
      if (chrome.runtime.lastError) {
        console.error(
          "Don't Hijack, Thank You could not load its settings:",
          chrome.runtime.lastError.message
        );
        return;
      }

      updateInterceptor(
        settingsModel.getOriginSettings(origin, storedSettings)
      );
    }
  );

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (
      areaName !== "local" ||
      (
        !changes.siteSettings &&
        !changes.allowlistedOrigins &&
        !changes.disabledOrigins
      )
    ) {
      return;
    }

    settingsModel.read(
      storedSettings => {
        if (chrome.runtime.lastError) {
          console.error(
            "Don't Hijack, Thank You could not refresh its settings:",
            chrome.runtime.lastError.message
          );
          return;
        }

        updateInterceptor(
          settingsModel.getOriginSettings(origin, storedSettings)
        );
      }
    );
  });
})();

(() => {
  const featureDefinitions = globalThis.__dontHijackFeatureDefinitions;
  const storageDefaults = Object.freeze({
    siteSettings: {},
    allowlistedOrigins: [],
    disabledOrigins: []
  });

  function createDefaultSettings() {
    return Object.fromEntries(
      featureDefinitions.map(feature => [
        feature.key,
        feature.defaultEnabled
      ])
    );
  }

  function createDisabledSettings() {
    return Object.fromEntries(
      featureDefinitions.map(feature => [feature.key, false])
    );
  }

  function getOriginSettings(origin, storedSettings) {
    if (
      storedSettings.allowlistedOrigins.includes(origin) ||
      storedSettings.disabledOrigins.includes(origin)
    ) {
      return createDisabledSettings();
    }

    return {
      ...createDefaultSettings(),
      ...storedSettings.siteSettings[origin]
    };
  }

  function normalize(storedSettings) {
    const siteSettings = { ...storedSettings.siteSettings };
    const allowlistedOrigins = new Set([
      ...storedSettings.allowlistedOrigins,
      ...storedSettings.disabledOrigins
    ]);

    for (const [origin, settings] of Object.entries(siteSettings)) {
      const effectiveSettings = {
        ...createDefaultSettings(),
        ...settings
      };

      if (Object.values(effectiveSettings).every(value => !value)) {
        allowlistedOrigins.add(origin);
        delete siteSettings[origin];
      }
    }

    return {
      siteSettings,
      allowlistedOrigins: [...allowlistedOrigins],
      disabledOrigins: []
    };
  }

  function needsMigration(storedSettings, normalizedSettings) {
    return (
      storedSettings.disabledOrigins.length > 0 ||
      Object.keys(storedSettings.siteSettings).length !==
        Object.keys(normalizedSettings.siteSettings).length
    );
  }

  function read(callback) {
    chrome.storage.local.get(storageDefaults, callback);
  }

  function write(storedSettings, callback) {
    chrome.storage.local.set(
      {
        siteSettings: storedSettings.siteSettings,
        allowlistedOrigins: storedSettings.allowlistedOrigins,
        disabledOrigins: []
      },
      callback
    );
  }

  globalThis.__dontHijackSettings = Object.freeze({
    createDefaultSettings,
    createDisabledSettings,
    getOriginSettings,
    normalize,
    needsMigration,
    read,
    write
  });
})();

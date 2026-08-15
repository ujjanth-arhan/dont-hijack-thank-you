const featureDefinitions = globalThis.__dontHijackFeatureDefinitions;
const settingsModel = globalThis.__dontHijackSettings;

const siteElement = document.querySelector("#site");
const statusElement = document.querySelector("#status");
const statusIndicatorElement = document.querySelector("#status-indicator");
const featuresElement = document.querySelector("#features");
const currentFeaturesElement = document.querySelector("#current-features");
const messageElement = document.querySelector("#message");
const allowlistToggleElement = document.querySelector("#allowlist-toggle");
const siteRulesElement = document.querySelector("#site-rules");
const siteRulesEmptyElement = document.querySelector("#site-rules-empty");

let currentOrigin;
let siteSettings = {};
let allowlistedOrigins = [];

function getOrigin(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.origin === "null" ? null : parsedUrl.origin;
  } catch {
    return null;
  }
}

function getOriginSettings(origin) {
  return settingsModel.getOriginSettings(origin, {
    siteSettings,
    allowlistedOrigins,
    disabledOrigins: []
  });
}

function getStatus(settings, isAllowlisted) {
  const enabledCount = Object.values(settings).filter(Boolean).length;

  if (isAllowlisted) {
    return {
      label: "All protections off",
      className: "off"
    };
  }

  if (enabledCount === featureDefinitions.length) {
    return {
      label: "All protections on",
      className: "on"
    };
  }

  return {
    label: `${enabledCount} of ${featureDefinitions.length} protections on`,
    className: "partial"
  };
}

function createIcon(pathData) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  path.setAttribute("d", pathData);
  svg.append(path);
  return svg;
}

function createFeatureControl(origin, settings, definition, compact = false) {
  const label = document.createElement("label");
  const icon = document.createElement("span");
  const copy = document.createElement("span");
  const title = document.createElement("strong");
  const description = document.createElement("small");
  const switchElement = document.createElement("span");
  const input = document.createElement("input");
  const track = document.createElement("span");

  label.className = compact ? "feature compact" : "feature";
  icon.className = "feature-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.append(createIcon(definition.iconPath));

  copy.className = "feature-copy";
  title.textContent = definition.title;
  description.textContent = definition.description;
  copy.append(title, description);

  switchElement.className = "switch";
  input.type = "checkbox";
  input.checked = settings[definition.key];
  input.dataset.feature = definition.key;
  input.setAttribute(
    "aria-label",
    `${definition.title} protection for ${origin}`
  );
  track.className = "switch-track";
  track.setAttribute("aria-hidden", "true");
  switchElement.append(input, track);

  input.addEventListener("change", () => {
    updateOriginFeature(origin, definition.key, input.checked);
  });

  label.append(icon, copy, switchElement);
  return label;
}

function createSiteRule(origin) {
  const settings = getOriginSettings(origin);
  const isAllowlisted = allowlistedOrigins.includes(origin);
  const status = getStatus(settings, isAllowlisted);
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  const originElement = document.createElement("span");
  const badge = document.createElement("span");
  const controls = document.createElement("div");
  const resetButton = document.createElement("button");

  details.className = "site-rule";
  originElement.className = "site-rule-origin";
  originElement.textContent = origin;
  originElement.title = origin;
  badge.className = `site-rule-badge ${status.className}`;
  badge.textContent = status.label;
  summary.append(originElement, badge);

  controls.className = "site-rule-controls";
  for (const definition of featureDefinitions) {
    controls.append(
      createFeatureControl(origin, settings, definition, true)
    );
  }

  resetButton.className = "reset-rule";
  resetButton.type = "button";
  resetButton.textContent = "Remove custom settings";
  resetButton.addEventListener("click", () => {
    resetOrigin(origin);
  });

  details.append(summary, controls, resetButton);
  return details;
}

function renderCurrentSite() {
  const settings = getOriginSettings(currentOrigin);
  const isAllowlisted = allowlistedOrigins.includes(currentOrigin);
  const status = getStatus(settings, isAllowlisted);

  siteElement.textContent = new URL(currentOrigin).hostname;
  statusElement.textContent = status.label;
  statusIndicatorElement.className = `status-indicator ${status.className}`;
  allowlistToggleElement.textContent = isAllowlisted
    ? "Restore default protections"
    : "Turn off all protections for this site";
  allowlistToggleElement.disabled = false;

  currentFeaturesElement.replaceChildren();
  for (const definition of featureDefinitions) {
    currentFeaturesElement.append(
      createFeatureControl(currentOrigin, settings, definition)
    );
  }

  featuresElement.disabled = false;
}

function renderSiteRules() {
  const origins = new Set([
    ...Object.keys(siteSettings),
    ...allowlistedOrigins
  ]);
  const otherOrigins = [...origins]
    .filter(origin => origin !== currentOrigin)
    .sort((first, second) => first.localeCompare(second));

  siteRulesElement.replaceChildren();
  siteRulesEmptyElement.classList.toggle(
    "hidden",
    otherOrigins.length > 0
  );

  for (const origin of otherOrigins) {
    siteRulesElement.append(createSiteRule(origin));
  }
}

function refreshUi() {
  if (currentOrigin) {
    renderCurrentSite();
  }

  renderSiteRules();
}

function setBusy(busy) {
  for (const control of document.querySelectorAll("button, input")) {
    control.disabled = busy;
  }

  if (!busy && !currentOrigin) {
    allowlistToggleElement.disabled = true;
  }
}

function showError(message) {
  messageElement.textContent = message;
  statusElement.textContent = "Protection unavailable";
  statusIndicatorElement.className = "status-indicator off";
  setBusy(true);
}

function persistSettings(
  nextSiteSettings,
  nextAllowlistedOrigins,
  callback
) {
  setBusy(true);
  settingsModel.write(
    {
      siteSettings: nextSiteSettings,
      allowlistedOrigins: nextAllowlistedOrigins
    },
    () => {
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message);
        return;
      }

      siteSettings = nextSiteSettings;
      allowlistedOrigins = nextAllowlistedOrigins;
      callback();
      setBusy(false);
    }
  );
}

function updateOriginFeature(origin, feature, enabled) {
  messageElement.textContent = "";

  const nextSettings = {
    ...getOriginSettings(origin),
    [feature]: enabled
  };
  const nextSiteSettings = { ...siteSettings };
  let nextAllowlistedOrigins = allowlistedOrigins.filter(
    allowlistedOrigin => allowlistedOrigin !== origin
  );

  if (Object.values(nextSettings).every(value => !value)) {
    delete nextSiteSettings[origin];
    nextAllowlistedOrigins = [
      ...new Set([...nextAllowlistedOrigins, origin])
    ];
  } else if (Object.values(nextSettings).every(Boolean)) {
    delete nextSiteSettings[origin];
  } else {
    nextSiteSettings[origin] = nextSettings;
  }

  persistSettings(
    nextSiteSettings,
    nextAllowlistedOrigins,
    refreshUi
  );
}

function resetOrigin(origin) {
  messageElement.textContent = "";

  const nextSiteSettings = { ...siteSettings };
  delete nextSiteSettings[origin];

  persistSettings(
    nextSiteSettings,
    allowlistedOrigins.filter(
      allowlistedOrigin => allowlistedOrigin !== origin
    ),
    refreshUi
  );
}

function loadSettings() {
  settingsModel.read(
    result => {
      if (chrome.runtime.lastError) {
        showError(chrome.runtime.lastError.message);
        return;
      }

      const normalized = settingsModel.normalize(result);
      const needsMigration = settingsModel.needsMigration(
        result,
        normalized
      );

      if (needsMigration) {
        persistSettings(
          normalized.siteSettings,
          normalized.allowlistedOrigins,
          refreshUi
        );
        return;
      }

      siteSettings = normalized.siteSettings;
      allowlistedOrigins = normalized.allowlistedOrigins;
      refreshUi();
    }
  );
}

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (chrome.runtime.lastError) {
    siteElement.textContent = "Could not inspect this page.";
    showError(chrome.runtime.lastError.message);
    return;
  }

  currentOrigin = getOrigin(tab?.url);

  if (!currentOrigin) {
    statusElement.textContent = "Can't run on this page";
    statusIndicatorElement.className = "status-indicator off";
    siteElement.textContent = "Chrome does not allow extensions on this page.";
  }

  loadSettings();
});

allowlistToggleElement.addEventListener("click", () => {
  messageElement.textContent = "";

  if (allowlistedOrigins.includes(currentOrigin)) {
    resetOrigin(currentOrigin);
    return;
  }

  const nextSiteSettings = { ...siteSettings };
  delete nextSiteSettings[currentOrigin];

  persistSettings(
    nextSiteSettings,
    [...new Set([...allowlistedOrigins, currentOrigin])],
    refreshUi
  );
});

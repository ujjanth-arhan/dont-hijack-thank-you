globalThis.__dontHijackFeatureDefinitions = Object.freeze(
  [
    {
      key: "contextMenu",
      title: "Right-click menu",
      description: "Stop this site from replacing or blocking Chrome's menu",
      defaultEnabled: true,
      iconPath:
        "M8 2h8v2H8V2ZM5 6h14v14H5V6Zm2 2v10h10V8H7Zm2 2h6v2H9v-2Zm0 4h4v2H9v-2Z"
    },
    {
      key: "copy",
      title: "Copied text",
      description: "Stop this site from adding links or promotional text",
      defaultEnabled: true,
      iconPath:
        "M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11v14Z"
    }
  ].map(Object.freeze)
);

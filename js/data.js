(function () {
  function uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function slugify(s) {
    return String(s)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function placeholderPhoto(caption) {
    return { id: uid(), caption: caption, image: null };
  }

  function proj(name, year) {
    return {
      id: slugify(name),
      name: name,
      year: year,
      photos: [placeholderPhoto(name + " #1")],
    };
  }

  // Fallback content, used only if data.json can't be fetched (e.g. opened
  // directly from disk without a server). Keep this in sync with data.json.
  var DEFAULT_DATA = {
    siteName: "willow borain",
    home: { photos: [placeholderPhoto("willow borain")] },
    categories: [
      {
        id: "personal",
        name: "personal",
        projects: [
          proj("girlhood", "2015"),
          proj("volumetwospace", "2025"),
          proj("tattoo convention polaroids", "2025"),
          proj("untitled project", "2023"),
          proj("dorpies", "2023"),
          proj("trains", "2024"),
          proj("lovers and cat", "2024"),
          proj("girls girls girls", "2025"),
        ],
      },
      {
        id: "work",
        name: "work",
        projects: [
          proj("scarlet wednesday bts", "2026"),
          proj("4wks", "2026"),
          proj("superbalist", "2015"),
          proj("cape film supply", "2025-2026"),
          proj("yoco", "2026"),
          proj("deluxe coffeeworks", "2021-2026"),
          proj("sa harvest", "2025"),
          proj("merwe mode", "2024"),
          proj("repentance", "2025"),
        ],
      },
    ],
  };

  window.WB = window.WB || {};
  window.WB.uid = uid;
  window.WB.slugify = slugify;
  window.WB.placeholderPhoto = placeholderPhoto;
  window.WB.DEFAULT_DATA = DEFAULT_DATA;
})();

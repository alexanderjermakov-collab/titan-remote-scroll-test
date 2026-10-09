(function () {
  "use strict";
  var script = document.currentScript;
  var root = new URL("./", script.src);
  var requested = new URLSearchParams(window.location.search).get("release") || "8.0.9";
  // Accept the trailing full stop in the supplied V8.0.9 URL.
  var version = requested.replace(/\.+$/, "");
  if (version !== "8.0.8" && version !== "8.0.9") {
    document.addEventListener("DOMContentLoaded", function () {
      document.body.textContent = "Unsupported Portal release: " + requested;
    });
    return;
  }
  var entry = document.documentElement.getAttribute("data-portal-entry") || "";
  var destination = new URL("releases/" + version + "/" + entry, root);
  destination.search = window.location.search;
  destination.searchParams.set("release", version);
  destination.hash = window.location.hash;
  window.location.replace(destination.toString());
})();

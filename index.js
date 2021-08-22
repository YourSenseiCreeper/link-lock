function error(text) {
  document.querySelector(".error").style.display = "inherit";
  document.querySelector("#errortext").innerText = `Błąd: ${text}`;
}

// Run when the <body> loads
async function main() {
  if (window.location.hash) {
    // Fail if the b64 library or API was not loaded
    if (!("b64" in window)) {
      error("Biblioteka Base64 nie została wczytana.");
      return;
    }
    if (!("apiVersions" in window)) {
      error("Biblioteka API nie została wczytana.");
      return;
    }

    // Try to get page data from the URL if possible
    const hash = window.location.hash.slice(1);
    let params;
    try {
      params = JSON.parse(b64.decode(hash));
    } catch {
      error("Link wydaje się być uszkodzony.");
      return;
    }

    // Check that all required parameters encoded in the URL are present
    if (!("v" in params && "e" in params)) {
      error("Link wydaje się być uszkodzony. Nie posiada potrzebnych parametrów.");
      return;
    }

    // Check that the version in the parameters is valid
    if (!(params["v"] in apiVersions)) {
      error("Niewspierana wersja API. Link może być uszkodzony.");
      return;
    }

    const api = apiVersions[params["v"]];

    // Get values for decryption
    const encrypted = b64.base64ToBinary(params["e"]);
    const salt = "s" in params ? b64.base64ToBinary(params["s"]) : null;
    const iv = "i" in params ? b64.base64ToBinary(params["i"]) : null;

    let hint, password;
    if ("h" in params) {
      hint = params["h"];
      password = prompt(`Wprowadź hasło, aby odblokować link.\n\nPodpowiedź: ${hint}`);
    } else {
      password = prompt("Wprowadź hasło, aby przejść do linku.");
    }

    // Decrypt and redirect if possible
    let url;
    try {
      url = await api.decrypt(encrypted, password, salt, iv);
    } catch {
      // Password is incorrect.
      error("Hasło jest niepoprawne.");

      // Set the "decrypt without redirect" URL appropriately
      document.querySelector("#no-redirect").href =
        `https://jstrieb.github.io/link-lock/decrypt/#${hash}`;

      // Set the "create hidden bookmark" URL appropriately
      document.querySelector("#hidden").href =
        `https://jstrieb.github.io/link-lock/hidden/#${hash}`;
      return;
    }

    try {
      // Extra check to make sure the URL is valid. Probably shouldn't fail.
      let urlObj = new URL(url);

      // Prevent XSS by making sure only HTTP URLs are used. Also allow magnet
      // links for password-protected torrents.
      if (!(urlObj.protocol == "http:"
            || urlObj.protocol == "https:"
            || urlObj.protocol == "magnet:")) {
        error("Link korzysta z nie hipertekstowego protokołu, który jest niewspierany. " +
        "Adres zaczyna się od '" + urlObj.protocol + "' i może być szkodliwy");
        return;
      }

      // IMPORTANT NOTE: must use window.location.href instead of the (in my
      // opinion more proper) window.location.replace. If you use replace, it
      // causes Chrome to change the icon of a bookmarked link to update it to
      // the unlocked destination. This is dangerous information leakage.
      window.location.href = url;
    } catch {
      error("Zaszyfrowano uszkodzony link. Nie mogę przekierować.");
      console.log(url);
      return;
    }
  } else {
    // Otherwise redirect to the creator
    window.location.replace("./create");
  }
}

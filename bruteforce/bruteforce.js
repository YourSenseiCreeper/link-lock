function error(text) {
  const alert = document.querySelector(".alert");
  alert.innerText = text;
  alert.style.opacity = 1;
}

function onBruteForce() {
  if (!("importKey" in window.crypto.subtle)) {
    error("window.crypto nie zostało wczytane. Przeładuj stronę przez https");
    return;
  }
  if (!("b64" in window && "apiVersions" in window)) {
    error("Ważne biblioteki nie zostały wczytane!");
    return;
  }

  const urlText = document.querySelector("#encrypted-url").value;
  let url;
  try {
    url = new URL(urlText);
  } catch {
    error("Wprowadzony tekst nie jest poprawnym linkiem. Upewnij się, że zawiera na początku \"https://\"!");
    return;
  }

  let params;
  try {
    params = JSON.parse(b64.decode(url.hash.slice(1)));
  } catch {
    error("Link wydaje się być uszkodzony.");
    return;
  }

  if (!("v" in params && "e" in params)) {
    error("Link wydaje się być uszkodzony. Nie posiada potrzebnych parametrów.");
    return;
  }

  if (!(params["v"] in apiVersions)) {
    error("Niewspierana wersja API. Link może być uszkodzony.");
    return;
  }

  const api = apiVersions[params["v"]];

  const encrypted = b64.base64ToBinary(params["e"]);
  const salt = "s" in params ? b64.base64ToBinary(params["s"]) : null;
  const iv = "i" in params ? b64.base64ToBinary(params["i"]) : null;

  const cset = document.querySelector("#charset").value.split("");
  if (charset == "") {
    error("Tablica znaków nie może być pusta.");
    return;
  }

  var progress = {
    tried: 0,
    total: 0,
    len: 0,
    overallTotal: 0,
    done: false,
    startTime: performance.now()
  };

  async function tryAllLen(prefix, len, curLen) {
    if (progress.done) return;
    if (len == curLen) {
      progress.tried++;
      try {
        await api.decrypt(encrypted, prefix, salt, iv);
        document.querySelector("#output").value = prefix;
        progress.done = true;
        error("Zakończono!");
      } catch {}
      return;
    }
    for (let i=0; i < cset.length; i++) {
      let c = cset[i];
      await tryAllLen(prefix + c, len, curLen + 1);
    }
  }

  function progressUpdate() {
    if (progress.done) {
      clearInterval();
      return;
    }
    let delta = performance.now() - progress.startTime;
    error(`Wypróbowanie ${progress.total} haseł o długości ${progress.len} – ${Math.round(100000 * progress.tried / progress.total)/1000}% ukończono. Próbuję ${Math.round(1000000 * (progress.overallTotal + progress.tried) / delta)/1000} haseł na sekundę.`);
  }

  (async () => {
    for (let len=0; !progress.done; len++) {
      progress.overallTotal += progress.tried;
      progress.tried = 0;
      progress.total = Math.pow(cset.length, len);
      progress.len = len;
      progressUpdate();
      await tryAllLen("", len, 0);
    }
  })();

  setInterval(progressUpdate, 4000);
}

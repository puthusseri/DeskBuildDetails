function addRow(container, label, value, copyEnabled = false, isLink = false) {
  const row = document.createElement("div");
  row.className = "row";
  if (label === "BuildLabel") row.classList.add("highlight");

  const lbl = document.createElement("div");
  lbl.className = "label";
  lbl.innerText = label;

  const val = document.createElement("div");
  val.className = "value";

  const safeValue = String(value ?? "NA");

  if (isLink && safeValue !== "NA") {
    const link = document.createElement("a");
    link.href = safeValue;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "\u200E" + safeValue + "\u200E";
    link.style.direction = "ltr";
    link.style.unicodeBidi = "plaintext";
    val.appendChild(link);
  } else {
    const span = document.createElement("span");
    span.textContent = "\u200E" + safeValue + "\u200E";
    span.style.direction = "ltr";
    span.style.unicodeBidi = "plaintext";
    val.appendChild(span);
  }

  if (copyEnabled && safeValue !== "NA") {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerText = "Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(safeValue);
        copyBtn.innerText = "Copied";
        setTimeout(() => {
          copyBtn.innerText = "Copy";
        }, 1500);
      } catch (err) {
        copyBtn.innerText = "Failed";
      }
    });
    val.appendChild(copyBtn);
  }

  row.appendChild(lbl);
  row.appendChild(val);
  container.appendChild(row);
}

function renderBuildCard(container, titleText, payload, options = {}) {
  if (!payload || typeof payload !== "object") return;

  const { showBranchName = true, buildLabelCopyEnabled = true } = options;

  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("h2");
  title.innerText = titleText;
  card.appendChild(title);

  if (showBranchName) {
    addRow(card, "BranchName", payload.BranchName ?? "NA", true);
  }

  addRow(card, "BuildLabel", payload.BuildLabel ?? "NA", buildLabelCopyEnabled);
  addRow(card, "Build_Date", payload.Build_Date ?? payload.BuildDate ?? "NA", false);
  addRow(card, "Current_Build_Url", payload.Current_Build_Url ?? "NA", false, true);

  container.appendChild(card);
}

function setStatus(message, isError = false) {
  const statusEl = document.getElementById("status");
  statusEl.innerText = message;
  statusEl.classList.toggle("error", isError);
  statusEl.classList.remove("hidden");
}

function showContent() {
  document.getElementById("status").classList.add("hidden");
  document.getElementById("content").classList.remove("hidden");
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function isLocalZohoUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname.endsWith("localzoho.com");
  } catch {
    return false;
  }
}

async function getBuildAndClientDetails(tabId) {
  const [scriptResult] = await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    func: async () => {
      try {
        const buildDetailsUrl = `${window.location.origin}/support/BuildDetails.do`;
        const response = await fetch(buildDetailsUrl, { credentials: "include" });

        if (!response.ok) {
          return {
            error: `BuildDetails request failed with status ${response.status}`
          };
        }

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          return {
            error:
              "BuildDetails response is not valid JSON. Ensure you are logged in on this tab."
          };
        }

        const versionValue = globalThis.agentClientVersion;
        const agentVersion = versionValue == null ? "NA" : String(versionValue);

        const orgIdValue = globalThis.currentOrg?.id;
        const zgid = orgIdValue == null ? "NA" : String(orgIdValue);

        return { data, agentVersion, zgid };
      } catch (err) {
        return {
          error: err?.message || "Failed to load details from the active tab"
        };
      }
    }
  });

  const payload = scriptResult?.result;
  if (!payload) {
    throw new Error("Failed to read data from active tab");
  }

  if (payload.error) {
    throw new Error(payload.error);
  }

  return payload;
}

async function init() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id || !tab.url) {
      setStatus("Unable to detect active tab", true);
      return;
    }

    if (!isLocalZohoUrl(tab.url)) {
      setStatus("Open any localzoho.com page and click the extension", true);
      return;
    }

    const { data, agentVersion, zgid } = await getBuildAndClientDetails(tab.id);

    const content = document.getElementById("content");

    renderBuildCard(content, "Build Details", data, {
      showBranchName: true,
      buildLabelCopyEnabled: false
    });

    const orgCard = document.createElement("div");
    orgCard.className = "card";
    const orgTitle = document.createElement("h2");
    orgTitle.innerText = "Org Details";
    orgCard.appendChild(orgTitle);
    addRow(orgCard, "zgid", zgid, true);
    content.appendChild(orgCard);

    const metaCard = document.createElement("div");
    metaCard.className = "card";
    const metaTitle = document.createElement("h2");
    metaTitle.innerText = "Client Details";
    metaCard.appendChild(metaTitle);
    addRow(metaCard, "agentClientVersion", agentVersion, true);
    content.appendChild(metaCard);

    renderBuildCard(content, "ZohoDeskReactApp", data?.dependency?.ZohoDeskReactApp, {
      showBranchName: false,
      buildLabelCopyEnabled: true
    });

    showContent();
  } catch (err) {
    setStatus(err?.message || "Failed to load build details", true);
  }
}

init();

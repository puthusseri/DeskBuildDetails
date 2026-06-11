function addRow(container, label, value, copyEnabled = false, isLink = false) {
  const row = document.createElement("div");
  row.className = "row";
  if (label === "BuildLabel") row.classList.add("highlight"); // highlight special row

  const lbl = document.createElement("div");
  lbl.className = "label";
  lbl.innerText = label;

  const val = document.createElement("div");
  val.className = "value";

  if (isLink) {
    const link = document.createElement("a");
    link.href = value;
    link.target = "_blank";
    link.textContent = "\u200E" + value + "\u200E"; // force LTR
    link.style.direction = "ltr";
    link.style.unicodeBidi = "plaintext";
    val.appendChild(link);
  } else {
    const span = document.createElement("span");
    span.textContent = "\u200E" + value + "\u200E"; // force LTR
    span.style.direction = "ltr";
    span.style.unicodeBidi = "plaintext";
    val.appendChild(span);
  }

  if (copyEnabled) {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-btn";
    copyBtn.innerText = "📋 Copy";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(value);
        copyBtn.innerText = "✅ Copied!";
        setTimeout(() => (copyBtn.innerText = "📋 Copy"), 2000);
      } catch (err) {
        copyBtn.innerText = "❌ Failed";
      }
    });
    val.appendChild(copyBtn);
  }

  row.appendChild(lbl);
  row.appendChild(val);
  container.appendChild(row);
}

function addTableRow(table, key, value) {
  const tr = document.createElement("tr");

  const tdKey = document.createElement("td");
  tdKey.textContent = key;

  const tdValue = document.createElement("td");
  let safeValue =
    typeof value === "object" ? JSON.stringify(value, null, 2) : value;
  tdValue.textContent = "\u200E" + safeValue + "\u200E"; // force LTR
  tdValue.style.direction = "ltr";
  tdValue.style.unicodeBidi = "plaintext";
  tdValue.style.textAlign = "left";

  tr.appendChild(tdKey);
  tr.appendChild(tdValue);
  table.appendChild(tr);
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
  addRow(card, "Build_Date", payload.Build_Date ?? payload.BuildDate ?? "NA");
  addRow(
    card,
    "Current_Build_Url",
    payload.Current_Build_Url ?? "NA",
    false,
    true
  );

  container.appendChild(card);
}

(function () {
  try {
    const data = JSON.parse(document.body.innerText);
    document.body.innerHTML = "";

    const container = document.createElement("div");
    container.className = "build-container";

    // --- Main Build Info card ---
    renderBuildCard(container, "Build Details", data, {
      showBranchName: true,
      buildLabelCopyEnabled: false
    });

    // --- Dependency card for ZohoDeskReactApp ---
    const reactDetails = data?.dependency?.ZohoDeskReactApp;
    renderBuildCard(container, "ZohoDeskReactApp", reactDetails, {
      showBranchName: false,
      buildLabelCopyEnabled: true
    });

    // --- Toggle section for more data ---
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-btn";
    toggleBtn.innerText = "Show More Details ⬇️";
    container.appendChild(toggleBtn);

    const extraDiv = document.createElement("div");
    extraDiv.className = "extra hidden";

    const table = document.createElement("table");
    table.className = "details-table";

    Object.keys(data).forEach((key) => {
      if (
        [
          "dependency",
          "Build_Date",
          "Current_Build_Url",
          "BuildLabel",
          "BranchName"
        ].includes(key)
      )
        return;
      addTableRow(table, key, data[key]);
    });

    extraDiv.appendChild(table);
    container.appendChild(extraDiv);

    toggleBtn.addEventListener("click", () => {
      extraDiv.classList.toggle("hidden");
      toggleBtn.innerText = extraDiv.classList.contains("hidden")
        ? "Show More Details ⬇️"
        : "Hide Details ⬆️";
    });

    document.body.appendChild(container);
  } catch (err) {
    console.error("Failed to parse JSON or render:", err);
  }
})();

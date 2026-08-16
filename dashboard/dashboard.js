(() => {
  "use strict";

  const data = JSON.parse(document.getElementById("dashboard-data").textContent);
  const pct = (value) => `${(Number(value) * 100).toFixed(1)}%`;
  const decimal = (value) => Number(value).toFixed(3);
  const escapeHtml = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  document.getElementById("description").textContent = data.description;
  document.getElementById("research-goal-list").innerHTML = data.research_goal.criteria
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  document.getElementById("research-goal-note").textContent = data.research_goal.note;
  document.getElementById("screening-shortlist").innerHTML =
    `<strong>Top screening shortlist (${data.screening_candidates.length}):</strong> ` +
    data.screening_candidates.map((number) => `Setup ${number}`).join(", ");

  document.getElementById("shared-setup-list").innerHTML = data.shared_setup
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  document.getElementById("dataset-construction-list").innerHTML = data.dataset_construction
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  document.querySelector("#setup-table tbody").innerHTML = data.setups.map((row) => `
    <tr class="${row.meets_screening_target ? "goal-match" : ""}">
      <td><strong>Setup ${row.setup_number}</strong>${row.meets_screening_target ? '<span class="status-badge">Target match</span>' : ""}</td>
      <td>${pct(row.accuracy)}</td>
      <td>${pct(row.wrong_rate)}</td>
      <td>${pct(row.unknown_rate)}</td>
      <td>${decimal(row.auroc)}</td>
      <td>${pct(row.near_90_fpr)}</td>
      <td class="definition-cell">
        <details class="setup-definition">
          <summary>View setup</summary>
          <div class="setup-definition-body">
            <p><strong>Main change:</strong> ${escapeHtml(row.definition.main_change)}</p>
            <dl>
              <dt>Screening panel</dt><dd>${escapeHtml(row.definition.screening_panel)}</dd>
              <dt>Context</dt><dd>${escapeHtml(row.definition.context)}</dd>
              <dt>Participants</dt><dd>${escapeHtml(row.definition.participants)}</dd>
              <dt>Prompt</dt><dd>${escapeHtml(row.definition.prompt_template)} <span class="file-name">(${escapeHtml(row.definition.prompt_file)})</span></dd>
              <dt>Reasoning budget</dt><dd>${escapeHtml(row.definition.reasoning_tokens)} tokens</dd>
              <dt>Sampling</dt><dd>${escapeHtml(row.definition.sampling)}</dd>
              <dt>Final decision cue</dt><dd>${escapeHtml(row.definition.final_cue)}</dd>
            </dl>
          </div>
        </details>
      </td>
    </tr>
  `).join("");

  const chosenRows = data.full_data_results.map((setup) => ({
    metrics: setup.full,
    setupNumber: setup.setup_number,
  }));

  document.getElementById("shared-config").innerHTML =
    '<strong>Shared:</strong> ' + data.full_setup_comparison.shared
      .map((item) => `<span>${escapeHtml(item)}</span>`)
      .join('<b aria-hidden="true">·</b>');
  document.querySelector("#setup-difference-table tbody").innerHTML =
    data.full_setup_comparison.differences.map((row) => `
      <tr>
        <td><strong>${escapeHtml(row.feature)}</strong></td>
        <td>${escapeHtml(row.setup_20)}</td>
        <td>${escapeHtml(row.setup_31)}</td>
      </tr>
    `).join("");

  document.querySelector("#finalist-table tbody").innerHTML = chosenRows.map((row) => `
    <tr>
      <td><strong>Setup ${row.setupNumber}</strong></td>
      <td>${pct(row.metrics.accuracy)}</td>
      <td>${pct(row.metrics.wrong_rate)}</td>
      <td>${pct(row.metrics.unknown_rate)}</td>
      <td>${decimal(row.metrics.auroc)}</td>
      <td>${pct(row.metrics.near_90_fpr)}</td>
    </tr>
  `).join("");

  document.getElementById("full-plot-grid").innerHTML = data.full_data_results.map((setup) => `
    <section class="full-plot-group">
      <h3>Setup ${setup.setup_number}</h3>
      <p>${escapeHtml(setup.role)}</p>
      <figure>
        <figcaption>Output-confidence distribution</figcaption>
        <img src="${escapeHtml(setup.plots.probability_distribution)}" alt="Setup ${setup.setup_number} output-confidence distribution">
      </figure>
      <figure>
        <figcaption>TPR–FPR operating curve</figcaption>
        <img src="${escapeHtml(setup.plots.tpr_fpr)}" alt="Setup ${setup.setup_number} TPR-FPR curve">
      </figure>
    </section>
  `).join("");

  document.getElementById("findings-list").innerHTML = data.findings
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");

  const selectTab = (tabId) => {
    const selected = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (!selected) return;
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.hidden = panel.id !== tabId;
        panel.classList.toggle("active", panel.id === tabId);
      });
      selected.classList.add("active");
  };

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectTab(button.dataset.tab);
      window.history.replaceState(null, "", `#${button.dataset.tab}`);
    });
  });
  selectTab(window.location.hash.slice(1) || "all-setups");
})();

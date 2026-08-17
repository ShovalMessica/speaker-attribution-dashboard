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

  const weekly = data.weekly_report;
  document.getElementById("weekly-heading").textContent = weekly.title;
  document.getElementById("weekly-subtitle").textContent = weekly.subtitle;
  document.getElementById("weekly-headline-counts").innerHTML = weekly.headline_counts
    .map((item) => `
      <div class="weekly-stat">
        <strong>${escapeHtml(item.value)}</strong>
        <span>${escapeHtml(item.label)}</span>
      </div>
    `).join("");

  const task = weekly.task_example;
  document.getElementById("weekly-task-example").innerHTML = `
    <div class="weekly-task-grid">
      <div class="weekly-task-input">
        <span class="weekly-mini-label">Target</span>
        <strong>${escapeHtml(task.target)}</strong>
        <span class="weekly-mini-label">Candidates</span>
        <pre>${task.candidates.map(escapeHtml).join("\n")}</pre>
      </div>
      <div class="weekly-task-transcript">
        <span class="weekly-mini-label">Transcript clue</span>
        ${task.transcript.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
      </div>
      <div class="weekly-task-output">
        <span class="weekly-mini-label">Expected output</span>
        <strong>${escapeHtml(task.answer)}</strong>
      </div>
    </div>
    <p class="weekly-task-note">${escapeHtml(task.explanation)}</p>
  `;

  document.getElementById("weekly-timeline").innerHTML = weekly.timeline
    .map((item) => `
      <article class="weekly-timeline-step">
        <span class="weekly-step-number">${escapeHtml(item.step)}</span>
        <h4>${escapeHtml(item.title)}</h4>
        <p>${escapeHtml(item.text)}</p>
      </article>
    `).join("");

  const prompt = weekly.prompt_story;
  document.getElementById("weekly-prompt-story").innerHTML = `
    <div class="weekly-prompt-grid">
      <div class="weekly-prompt-anatomy">
        <h4>Prompt anatomy</h4>
        <ol>${prompt.anatomy.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
        <p>${escapeHtml(prompt.finalization_note)}</p>
      </div>
      <details class="weekly-prompt-example">
        <summary>Open compact prompt example</summary>
        <pre>${escapeHtml(prompt.example)}</pre>
      </details>
    </div>
    <div class="weekly-prompt-lessons">
      ${prompt.lessons.map((lesson) => `
        <article>
          <strong>${escapeHtml(lesson.change)}</strong>
          <span>${escapeHtml(lesson.result)}</span>
          <p>Decision: ${escapeHtml(lesson.decision)}</p>
        </article>
      `).join("")}
    </div>
  `;

  document.getElementById("weekly-search-waves").innerHTML = weekly.search_waves
    .map((wave) => `
      <article class="weekly-wave">
        <h4>${escapeHtml(wave.title)}</h4>
        <p class="weekly-wave-question">${escapeHtml(wave.question)}</p>
        <div class="weekly-chip-list">
          ${wave.items.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
        <p class="weekly-wave-result">${escapeHtml(wave.result)}</p>
      </article>
    `).join("");

  const stackedBar = (row) => `
    <article class="weekly-behavior-row">
      <div class="weekly-behavior-label">
        <strong>${escapeHtml(row.label)}</strong>
        <span>${escapeHtml(row.detail)}</span>
      </div>
      <div class="weekly-stacked-bar" aria-label="${escapeHtml(row.label)} behavior">
        <span class="bar-correct" style="width:${Number(row.correct) * 100}%">${pct(row.correct)}</span>
        <span class="bar-wrong" style="width:${Number(row.wrong) * 100}%">${pct(row.wrong)}</span>
        <span class="bar-unknown" style="width:${Number(row.abstain) * 100}%">${pct(row.abstain)}</span>
      </div>
    </article>
  `;
  document.getElementById("weekly-behavior-bars").innerHTML = `
    ${weekly.behavior_comparison.map(stackedBar).join("")}
    <div class="weekly-bar-legend">
      <span><i class="legend-correct"></i>Correct</span>
      <span><i class="legend-wrong"></i>Wrong ID</span>
      <span><i class="legend-unknown"></i>Abstain</span>
    </div>
  `;
  document.getElementById("weekly-setup-shift").innerHTML = `
    <h4>What changed?</h4>
    <dl>
      <dt>Setup 20</dt><dd>${escapeHtml(weekly.setup_shift.setup_20)}</dd>
      <dt>Setup 31</dt><dd>${escapeHtml(weekly.setup_shift.setup_31)}</dd>
    </dl>
    <p>${escapeHtml(weekly.setup_shift.takeaway)}</p>
  `;
  document.getElementById("weekly-ner-note").textContent = weekly.ner_comparison_note;

  document.getElementById("weekly-reasoning-examples").innerHTML = weekly.reasoning_examples
    .map((example) => `
      <article class="weekly-reasoning-card ${escapeHtml(example.kind)}">
        <div class="reasoning-card-heading">
          <span>${example.kind === "correct" ? "Correct path" : "Wrong path"}</span>
          <h4>${escapeHtml(example.title)}</h4>
        </div>
        <div class="reasoning-transcript">
          ${example.transcript.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
        <ol>
          ${example.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
        </ol>
        <strong class="reasoning-final">Final: ${escapeHtml(example.final)}</strong>
        <small>${escapeHtml(example.source_setup)} · ${escapeHtml(example.source_example_id)}</small>
      </article>
    `).join("");
  document.getElementById("weekly-error-audit").innerHTML = `
    <strong>${weekly.error_audit.reasoning_supported}/${weekly.error_audit.wrong_total}</strong>
    <span>wrong Setup 31 outputs were reasoning-supported semantic errors.</span>
    <p>${escapeHtml(weekly.error_audit.takeaway)}</p>
  `;

  const confidence = weekly.confidence;
  document.getElementById("weekly-confidence-plot").src = confidence.plot;
  document.getElementById("weekly-confidence-takeaway").textContent = confidence.takeaway;
  document.getElementById("weekly-confidence").innerHTML = `
    <div class="weekly-confidence-card">
      <span>Attribution Setup 31</span>
      <strong>Correct ${pct(confidence.correct_mean)} ± ${pct(confidence.correct_std)}</strong>
      <strong>Wrong ${pct(confidence.wrong_mean)} ± ${pct(confidence.wrong_std)}</strong>
      <small>Medians: ${pct(confidence.correct_median)} vs ${pct(confidence.wrong_median)}</small>
    </div>
    <div class="weekly-confidence-card">
      <span>NER nickname</span>
      <strong>Correct ${pct(confidence.ner_correct_mean)} ± ${pct(confidence.ner_correct_std)}</strong>
      <strong>Wrong ${pct(confidence.ner_wrong_mean)} ± ${pct(confidence.ner_wrong_std)}</strong>
    </div>
    <div class="weekly-confidence-card emphasis">
      <span>Probability-only gate · Setup 31</span>
      <strong>AUROC ${decimal(confidence.auroc)}</strong>
      <strong>FPR ${pct(confidence.near_90_fpr)} at ~90% TPR</strong>
    </div>
  `;

  const current = weekly.current_stage;
  document.getElementById("weekly-current-stage").innerHTML = `
    <p>${escapeHtml(current.text)}</p>
    <div class="weekly-pair-example">
      <div><span>Evidence</span><strong>${escapeHtml(current.pair_example.evidence)}</strong></div>
      <div><span>No evidence</span><strong>${escapeHtml(current.pair_example.no_evidence)}</strong></div>
      <p>${escapeHtml(current.pair_example.note)}</p>
    </div>
    <p class="weekly-selected-setups"><strong>Current candidates:</strong> ${current.setup_numbers.map((number) => `Setup ${number}`).join(", ")}</p>
    <ul class="weekly-pair-validation">
      ${current.validation.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;

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

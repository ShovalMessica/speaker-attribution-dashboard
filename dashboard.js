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
  const rawBehavior = data.raw_model_behavior;
  const rawBehaviorTable = (dataset) => {
    const rows = dataset.groups.map((group) => group.outcomes.map((outcome, index) => `<tr>
      ${index === 0 ? `<td rowspan="${group.outcomes.length}">${escapeHtml(group.type)}</td>` : ""}
      <td>${escapeHtml(outcome.label)} ${outcome.label === "Correct attribution" || outcome.label === "Correct rejection" ? "✅" : "❌"}</td>
      <td>${outcome.count} / ${group.total}</td>
      <td>${pct(outcome.rate)}</td>
    </tr>`).join("")).join("");
    const sourceSuffix = dataset.id === "real" ? ` (${escapeHtml(dataset.source)})` : "";
    const sourceLine = dataset.id === "mediasum"
      ? `<p class="raw-behavior-source"><strong>Source:</strong> ${escapeHtml(dataset.source)}. Evidence-only; no no-evidence variants were constructed.</p>`
      : "";
    return `<section class="raw-behavior-dataset raw-behavior-${escapeHtml(dataset.id)}">
      <h5>${escapeHtml(dataset.title)}${sourceSuffix}</h5>
      ${sourceLine}
      <div class="table-wrap evaluation-table-wrap raw-behavior-table-wrap"><table class="pair-table outcome-definition-table raw-behavior-table">
        <thead><tr><th>Type</th><th>Subtype</th><th>Count / Total</th><th>Rate</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
    </section>`;
  };
  document.getElementById("raw-model-behavior-tables").innerHTML = rawBehavior.datasets
    .map((dataset, index) => {
      const syntheticSource = index === 1
        ? `<p class="raw-behavior-synthetic-source"><strong>Synthetic source:</strong> extracted from ${escapeHtml(rawBehavior.synthetic_source)}.</p>`
        : "";
      return `${syntheticSource}${rawBehaviorTable(dataset)}`;
    }).join("");
  const setupDetails = (row, conclusion = null, status = null, paired = false) => `
    <details class="setup-definition">
      <summary>View setup</summary>
      <div class="setup-definition-body">
        <p><strong>Main change:</strong> ${escapeHtml(row.definition.main_change)}</p>
        <dl>
          ${paired ? row.definition.factor_profile.map((factor) => `
            <dt>${escapeHtml(factor.label)}</dt><dd>${escapeHtml(factor.value)}</dd>`).join("") : `<dt>Screening panel</dt><dd>${escapeHtml(row.definition.screening_panel)}</dd>
          <dt>Context</dt><dd>${escapeHtml(row.definition.context)}</dd>
          <dt>Participants</dt><dd>${escapeHtml(row.definition.participants)}</dd>
          <dt>Prompt</dt><dd>${escapeHtml(row.definition.prompt_template)} <span class="file-name">(${escapeHtml(row.definition.prompt_file)})</span></dd>
          <dt>Reasoning budget</dt><dd>${escapeHtml(row.definition.reasoning_tokens)} tokens</dd>
          <dt>Sampling</dt><dd>${escapeHtml(row.definition.sampling)}</dd>
          <dt>Final decision cue</dt><dd>${escapeHtml(row.definition.final_cue)}</dd>`}
        </dl>
        ${conclusion ? `<div class="setup-conclusion"><strong>${escapeHtml(status)}</strong><p>${escapeHtml(conclusion)}</p></div>` : ""}
      </div>
    </details>`;

  document.getElementById("screening-shortlist").innerHTML =
    `<strong>Top screening shortlist (${data.screening_candidates.length}):</strong> ` +
    data.screening_candidates.map((number) => `Setup ${number}`).join(", ");
  document.querySelector("#setup-table tbody").innerHTML = data.setups.map((row) => `
      <tr class="${row.meets_screening_target ? "goal-match" : ""}">
        <td><strong>Setup ${row.setup_number}</strong>${row.meets_screening_target ? '<span class="status-badge">Target match</span>' : ""}</td>
        <td>${pct(row.accuracy)}</td>
        <td>${pct(row.wrong_rate)}</td>
        <td>${pct(row.unknown_rate)}</td>
        <td>${decimal(row.auroc)}</td>
        <td>${pct(row.near_90_fpr)}</td>
        <td class="definition-cell">${setupDetails(row)}</td>
      </tr>
    `).join("");

  const pairedMetricCells = (metrics, progress = null) => metrics ? `
    <td>${pct(metrics.accuracy)}</td>
    <td>${pct(metrics.wrong_rate)}</td>
    <td>${pct(metrics.unknown_rate)}</td>
    <td>${decimal(metrics.auroc)}</td>
    <td>${pct(metrics.near_90_fpr)}</td>
    <td class="no-evidence-outcome"><span class="correct-rejection">${pct(metrics.correct_rejection_rate)}</span><span class="outcome-divider">/</span><span class="false-attribution">${pct(metrics.false_attribution_rate)}</span></td>
    <td>${metrics.golden_pairs} / ${metrics.evidence_examples}</td>` :
    `<td class="metric-missing progress-message" colspan="7">${progress?.status === "in_progress" ? "In progress · waiting for the first complete pair" : progress?.status === "paused" ? "Paused · resumable" : progress?.status === "queued" ? "Queued" : "—"}</td>`;
  const pairedDatasetCell = (label, className, metrics, showCounts, progress = null) => {
    const scheduled = progress && progress.status !== "not_scheduled";
    const count = scheduled && progress.status !== "completed" && progress.target_variants
      ? progress.completed_pairs > 0
        ? `${progress.completed_pairs} / ${progress.target_pairs} complete pairs · ${progress.saved_variants} / ${progress.target_variants} variants`
        : `${progress.saved_variants} / ${progress.target_variants} variants`
      : scheduled
        ? `${progress.completed_pairs} / ${progress.target_pairs} pairs`
      : metrics ? `${metrics.evidence_examples} pairs` : "";
    const status = progress?.status === "in_progress"
      ? '<span class="evaluation-status in-progress">In progress</span>'
      : progress?.status === "paused"
        ? '<span class="evaluation-status paused">Paused · resumable</span>'
      : progress?.status === "queued"
        ? '<span class="evaluation-status queued">Queued</span>'
        : progress?.status === "completed"
          ? '<span class="evaluation-status complete">Complete</span>'
          : "";
    return `<td><span class="dataset-label ${className}">${label}</span>${showCounts ? `<span class="dataset-count">${count}</span>${status}` : ""}</td>`;
  };
  const pairedSetupRows = (
    rows,
    { showCounts = false, showConclusions = true, includeHardSynthetic = false } = {}
  ) => rows.map((row) => {
    const datasets = [
      { key: "real", label: "Real data", className: "real-data" },
      { key: "synthetic", label: "Initial synthetic data", className: "synthetic-data" },
      ...(includeHardSynthetic
        ? [{ key: "hard_synthetic", label: "Hard synthetic data", className: "hard-synthetic-data" }]
        : []),
    ];
    return datasets.map((dataset, index) => `
      <tr class="${index === 0 ? "paired-group-start" : ""}">
        ${index === 0 ? `<td rowspan="${datasets.length}"><strong>Setup ${row.setup_number}</strong></td>` : ""}
        ${pairedDatasetCell(
          dataset.label,
          dataset.className,
          row[dataset.key],
          showCounts,
          row.progress?.[dataset.key]
        )}
        ${pairedMetricCells(row[dataset.key], row.progress?.[dataset.key])}
        ${index === 0 ? `<td rowspan="${datasets.length}" class="definition-cell">${setupDetails(
          row,
          showConclusions ? row.conclusion : null,
          showConclusions ? row.status : null,
          true
        )}</td>` : ""}
      </tr>
    `).join("");
  }).join("");
  document.getElementById("paired-shared-settings").innerHTML = `
    <strong>Shared settings</strong>
    ${data.paired_shared_settings.map((setting) => `<span><b>${escapeHtml(setting.label)}:</b> ${escapeHtml(setting.value)}</span>`).join("")}`;
  document.querySelector("#paired-setup-table tbody").innerHTML = pairedSetupRows(data.cross_domain_results);
  document.querySelector("#full-data-table tbody").innerHTML = pairedSetupRows(
    data.full_data_results,
    { showCounts: true, showConclusions: false, includeHardSynthetic: true }
  );

  const coarseProbing = data.coarse_grained_probing;
  const researchRecord = coarseProbing.research_record;
  const maybePct = (value) => value === null || value === undefined ? "—" : pct(value);
  const maybeDecimal = (value) => value === null || value === undefined ? "—" : decimal(value);
  const metricTriplet = (metrics, kind) => {
    if (!metrics) return "—";
    const values = kind === "auroc"
      ? [metrics.overall_auroc, metrics.wrong_auroc, metrics.false_auroc].map(maybeDecimal)
      : [metrics.correct_retention, metrics.wrong_rejection, metrics.false_rejection].map(maybePct);
    return values.join(" / ");
  };
  const matchedPair = (metrics) => metrics
    ? `${maybePct(metrics.wrong_rejection)} / ${maybePct(metrics.false_rejection)}`
    : "—";
  const statusClass = (status) => status.toLowerCase().includes("planned")
    ? "planned"
    : status.toLowerCase().includes("negative")
      ? "negative"
      : status.toLowerCase().includes("descriptive")
        ? "descriptive"
        : status.toLowerCase().includes("ablation")
          ? "ablation"
          : "valid";
  const compactText = (value, limit = 230) => {
    const text = String(value);
    if (text.length <= limit) return text;
    const sentenceEnd = text.lastIndexOf(". ", limit);
    const cut = sentenceEnd > limit * 0.55 ? sentenceEnd + 1 : text.lastIndexOf(" ", limit);
    return `${text.slice(0, Math.max(cut, 1)).trim()}…`;
  };
  const renderTextValues = (value) => {
    if (!value) return "";
    const items = Array.isArray(value)
      ? value
      : typeof value === "object"
        ? Object.values(value)
        : [value];
    return items.filter((item) => typeof item === "string")
      .map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  };
  const researchLineChart = ({ points, series, yMin = 0.5, yMax = 1, percent = false }) => {
    if (!points.length) return "";
    const width = 860;
    const height = 330;
    const left = 58;
    const right = 58;
    const top = 24;
    const bottom = 78;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const x = (index) => left + (points.length === 1 ? plotWidth / 2 : index * plotWidth / (points.length - 1));
    const y = (value) => top + (yMax - value) * plotHeight / (yMax - yMin);
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => yMin + fraction * (yMax - yMin));
    const grid = ticks.map((value) => `<line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" class="research-chart-grid" />
      <text x="${left - 10}" y="${y(value) + 4}" text-anchor="end" class="research-chart-axis">${percent ? `${Math.round(value * 100)}%` : value.toFixed(2)}</text>`).join("");
    const lines = series.map((item) => {
      const coords = points.map((point, index) => `${x(index)},${y(Number(point[item.key]))}`).join(" ");
      const dots = points.map((point, index) => `<circle cx="${x(index)}" cy="${y(Number(point[item.key]))}" r="4" class="${item.className}" />`).join("");
      return `<polyline points="${coords}" class="research-chart-line ${item.className}" />${dots}`;
    }).join("");
    const labels = points.map((point, index) => `<text x="${x(index)}" y="${height - 42}" text-anchor="middle" class="research-chart-axis">${escapeHtml(point.label)}</text>`).join("");
    return `<div class="research-chart-legend">${series.map((item) => `<span class="${item.className}">${escapeHtml(item.label)}</span>`).join("")}</div>
      <svg class="research-line-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(series.map((item) => item.label).join(" and "))}">
        ${grid}${lines}${labels}
      </svg>`;
  };

  document.getElementById("coarse-methodology-summary").textContent =
    `${researchRecord.methodology.proposals.toLocaleString()} non-Real proposals from ${researchRecord.methodology.meetings} grouped meetings: ` +
    `${researchRecord.methodology.correct} correct attribution / ${researchRecord.methodology.wrong} wrong attribution / ` +
    `${researchRecord.methodology.false_attribution} false attribution. Real291 is used only after non-Real selection as transfer/development evidence.`;
  document.getElementById("coarse-methodology-rules").innerHTML = researchRecord.methodology.rules
    .map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  document.getElementById("coarse-headline-results-rows").innerHTML = researchRecord.headline_results
    .map((row) => `<tr>
      <th scope="row">${escapeHtml(row.role)}<span>Experiment ${row.experiment}</span></th>
      <td>${escapeHtml(row.gate)}</td>
      <td>${escapeHtml(row.training)}</td>
      <td><strong>${escapeHtml(row.real_result)}</strong></td>
      <td>${escapeHtml(row.interpretation)}</td>
    </tr>`).join("");
  document.getElementById("coarse-main-conclusions").innerHTML = researchRecord.conclusions
    .map((conclusion) => `<li>${escapeHtml(conclusion)}</li>`).join("");
  document.getElementById("coarse-research-progress-rows").innerHTML = researchRecord.experiments
    .map((experiment) => `<tr>
      <th scope="row">Experiment ${experiment.number}<span>${escapeHtml(experiment.title)}</span></th>
      <td>${escapeHtml(compactText(experiment.question, 260))}</td>
      <td><span class="research-status ${statusClass(experiment.status)}">${escapeHtml(experiment.status)}</span></td>
      <td title="${escapeHtml(experiment.finding)}">${escapeHtml(compactText(experiment.finding, 300))}</td>
    </tr>`).join("");
  document.getElementById("coarse-gate-comparison-rows").innerHTML = researchRecord.gate_comparisons
    .map((row) => `<tr>
      <th scope="row">Experiment ${row.number}<span>${escapeHtml(row.label)}</span></th>
      <td>${metricTriplet(row.development, "auroc")}</td>
      <td>${metricTriplet(row.development, "operating")}</td>
      <td>${metricTriplet(row.real_frozen, "operating")}</td>
      <td>${matchedPair(row.real_matched)}</td>
      <td>${escapeHtml(row.decision)}</td>
    </tr>`).join("");
  document.getElementById("coarse-research-archive-rows").innerHTML = researchRecord.archive
    .map((row) => `<tr><th scope="row">${escapeHtml(row.experiment_ids)}</th>
      <td>${escapeHtml(row.status.replaceAll("_", " "))}</td>
      <td>${escapeHtml(row.reason)}</td><td>${escapeHtml(row.claim_policy)}</td></tr>`).join("");

  const acrossLayerPoints = researchRecord.across_layers
    .map((row) => ({ ...row, label: `L${row.layer}` }));
  const acrossLayerViews = {
    auroc: {
      title: "Threshold-free representation quality",
      note: "Grouped-OOF AUROC on the 1,242 non-Real proposals. Higher is better; no operating threshold is applied.",
      chart: researchLineChart({
        points: acrossLayerPoints,
        series: [
          { key: "overall_auroc", label: "Overall AUROC", className: "overall" },
          { key: "wrong_auroc", label: "Correct vs wrong AUROC", className: "wrong" },
          { key: "false_auroc", label: "Correct vs false AUROC", className: "false" },
        ],
        yMin: 0.5,
        yMax: 1,
      }),
    },
    tpr_fpr: {
      title: "Correct TPR and unified incorrect FPR",
      note: "At every layer, the threshold is selected inside training folds to target at least 90% correct-attribution TPR. Unified FPR is the accepted fraction of wrong + false-attribution proposals. Higher TPR and lower FPR are better.",
      chart: researchLineChart({
        points: acrossLayerPoints,
        series: [
          { key: "correct_tpr", label: "Correct-attribution TPR", className: "false" },
          { key: "unified_fpr", label: "Unified incorrect FPR", className: "wrong" },
        ],
        yMin: 0,
        yMax: 1,
        percent: true,
      }),
    },
    subtype_rejection: {
      title: "Wrong- and false-attribution rejection",
      note: "The same per-layer high-retention thresholds are used. Rejection is 1 − subtype FPR; higher is better.",
      chart: researchLineChart({
        points: acrossLayerPoints,
        series: [
          { key: "wrong_rejection", label: "Wrong-attribution rejection", className: "wrong" },
          { key: "false_rejection", label: "False-attribution rejection", className: "false" },
        ],
        yMin: 0,
        yMax: 1,
        percent: true,
      }),
    },
  };
  const tokenTrendChart = researchLineChart({
    points: researchRecord.token_position_trend.map((row) => ({
      ...row,
      label: row.display_name
        .replace("Last reasoning token", "Reasoning last")
        .replace("Generated answer token", "Answer")
        .replace("Pre-FINAL colon", "Pre-FINAL"),
    })),
    series: [{ key: "unified_fpr", label: "Accepted incorrect proposals at 90.7% correct retention", className: "wrong" }],
    yMin: 0,
    yMax: 1,
    percent: true,
  });
  const tokenTrendRows = researchRecord.token_position_trend.map((row) => `<tr>
    <th scope="row">${escapeHtml(row.display_name)}</th>
    <td>Layer ${row.layer}</td>
    <td>${escapeHtml(row.component)}</td>
    <td>${pct(row.tpr)}</td>
    <td>${pct(1 - row.wrong_accepted / row.wrong_total)}</td>
    <td>${pct(1 - row.false_attribution_accepted / row.false_attribution_total)}</td>
    <td>${pct(row.unified_fpr)}</td>
  </tr>`).join("");
  document.getElementById("coarse-research-phases").innerHTML = researchRecord.phases
    .map((phase) => {
      const phaseExperiments = researchRecord.experiments.filter((experiment) => experiment.phase === phase.id);
      return `<section class="coarse-research-phase" aria-labelledby="coarse-phase-${phase.id}">
        <h4 id="coarse-phase-${phase.id}">${escapeHtml(phase.title)}</h4>
        <p>${escapeHtml(phase.description)}</p>
        <div class="coarse-experiment-list">
          ${phaseExperiments.map((experiment) => {
            const experimentGateRows = researchRecord.gate_comparisons.filter((row) => row.number === experiment.number);
            const experimentChart = experiment.number === 83
              ? `<h5>Experiment 83 graph</h5>
                <figure class="coarse-research-chart"><figcaption>Setup 20 · Real291 token-position trend</figcaption><p>Layer 24 residual at every position. Each point uses a descriptive Real291 threshold matching 107/118 correct proposals (90.7% retention). Lower FPR is better; the answer-token point is post-decision only.</p>${tokenTrendChart}</figure>
                <div class="coarse-research-table-wrap token-trend-table"><table class="coarse-research-table compact"><thead><tr><th>Token position</th><th>Layer</th><th>Component</th><th>Correct retention</th><th>Wrong rejection</th><th>False rejection</th><th>Unified FPR</th></tr></thead><tbody>${tokenTrendRows}</tbody></table></div>`
              : "";
            return `<details class="coarse-experiment-card">
              <summary>
                <span class="coarse-experiment-heading"><b>Experiment ${experiment.number} · ${escapeHtml(experiment.title)}</b><span class="research-status ${statusClass(experiment.status)}">${escapeHtml(experiment.status)}</span></span>
                <span><strong>Question:</strong> ${escapeHtml(experiment.question)}</span>
                <span><strong>Finding:</strong> ${escapeHtml(experiment.finding)}</span>
              </summary>
              <div class="coarse-experiment-body">
                <h5>Experiment definition</h5>
                <dl class="experiment-definition">${experiment.definition.map((fact) => `<dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd>`).join("")}</dl>
                ${experimentGateRows.length ? `<h5>Standardized gate result</h5><div class="coarse-research-table-wrap"><table class="coarse-research-table compact"><thead><tr><th>Gate</th><th>Non-Real AUROC<br>overall / wrong / false</th><th>Non-Real operating point<br>retention / wrong / false</th><th>Real frozen threshold<br>retention / wrong / false</th><th>Real matched retention<br>wrong / false</th></tr></thead><tbody>${experimentGateRows.map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${metricTriplet(row.development, "auroc")}</td><td>${metricTriplet(row.development, "operating")}</td><td>${metricTriplet(row.real_frozen, "operating")}</td><td>${matchedPair(row.real_matched)}</td></tr>`).join("")}</tbody></table></div>` : ""}
                ${experimentChart}
                <h5>Decision</h5><p>${escapeHtml(experiment.decision)}</p>
                ${experiment.limitations ? `<h5>Limitations</h5><ul>${renderTextValues(experiment.limitations)}</ul>` : ""}
              </div>
            </details>`;
          }).join("")}
        </div>
      </section>`;
    }).join("");
  const layerChartSelect = document.getElementById("coarse-layer-chart-select");
  document.getElementById("coarse-layer-chart-title").textContent = acrossLayerViews.tpr_fpr.title;
  document.getElementById("coarse-layer-chart-note").textContent = acrossLayerViews.tpr_fpr.note;
  document.getElementById("coarse-layer-chart").innerHTML = acrossLayerViews.tpr_fpr.chart;
  layerChartSelect?.addEventListener("change", () => {
    const view = acrossLayerViews[layerChartSelect.value];
    document.getElementById("coarse-layer-chart-title").textContent = view.title;
    document.getElementById("coarse-layer-chart-note").textContent = view.note;
    document.getElementById("coarse-layer-chart").innerHTML = view.chart;
  });
  const standardizedProbe = coarseProbing.standardized_comparison;
  const standardizedFormat = (metricId, value) => metricId === "auroc"
    ? Number(value).toFixed(3)
    : pct(value);
  document.getElementById("standardized-probe-note").textContent = standardizedProbe.contract.note;
  document.getElementById("standardized-probe-conclusion").textContent = standardizedProbe.conclusion;
  document.getElementById("standardized-probe-datasets").innerHTML = [
    ["Initial Synthetic validation", standardizedProbe.contract.synthetic_validation],
    ["Real data test", standardizedProbe.contract.real_test],
  ].map(([label, dataset]) => `<tr>
    <th scope="row">${escapeHtml(label)}</th>
    <td>${dataset.outcomes.correct}</td>
    <td>${dataset.outcomes.wrong}</td>
    <td>${dataset.outcomes.false_attribution}</td>
    <td>${dataset.examples}</td>
  </tr>`).join("");
  const standardizedExperimentDefinition = (experimentId) => standardizedProbe.experiments
    .find((experiment) => experiment.id === experimentId);
  const standardizedExperimentLayers = (experimentId) => {
    const experiment = standardizedExperimentDefinition(experimentId);
    if (experiment?.fixed_metrics) {
      return [{
        layer: experiment.representation_label,
        synthetic_validation: experiment.fixed_metrics.synthetic_validation,
        real_test: experiment.fixed_metrics.real_test,
      }];
    }
    return standardizedProbe.layers.map((row) => ({
      layer: row.layer,
      synthetic_validation: row[experimentId].synthetic_validation,
      real_test: row[experimentId].real_test,
    }));
  };
  const standardizedSelectedLayer = (experimentId) => standardizedExperimentLayers(experimentId)
    .reduce((current, candidate) =>
      Number(candidate.synthetic_validation.auroc) > Number(current.synthetic_validation.auroc)
        ? candidate
        : current
    );
  const standardizedBestRows = (experimentId) => {
    const best = standardizedSelectedLayer(experimentId);
    return standardizedProbe.metrics.map((metric) => {
    return `<tr>
      <th scope="row">${escapeHtml(metric.label)}</th>
      <td>${standardizedFormat(metric.id, standardizedProbe.output_probability_baseline.synthetic_validation[metric.id])}</td>
      <td>${standardizedFormat(metric.id, best.synthetic_validation[metric.id])}</td>
      <td>${standardizedFormat(metric.id, standardizedProbe.output_probability_baseline.real_test[metric.id])}</td>
      <td>${standardizedFormat(metric.id, best.real_test[metric.id])}</td>
    </tr>`;
    }).join("");
  };
  const standardizedDataRows = (experiment) => experiment.data_rows.map((row) => `<tr>
    <th scope="row">${escapeHtml(row.role)}</th>
    <td>${escapeHtml(row.data)}</td>
    <td>${row.total}</td>
  </tr>`).join("");
  const standardizedOutcomeRows = (experiment) => experiment.outcome_rows.map((row) => `<tr>
    <th scope="row">${escapeHtml(row.role)}</th>
    <td>${row.correct}</td>
    <td>${row.wrong}</td>
    <td>${row.false_attribution}</td>
    <td>${row.total}</td>
  </tr>`).join("");

  document.getElementById("standardized-experiment-reports").innerHTML = standardizedProbe.experiments
    .map((experiment) => `<article class="standardized-experiment-card" data-experiment-id="${escapeHtml(experiment.id)}">
      <h3>${escapeHtml(experiment.title)}</h3>
      <dl class="standardized-experiment-definition">
        <dt>Status</dt><dd><strong>Historical/preliminary — not a valid current gate comparison</strong></dd>
        <dt>Change</dt><dd>${escapeHtml(experiment.change)}</dd>
      </dl>
      <h4>Data and split</h4>
      <div class="coarse-probe-counts-table-wrap">
        <table class="coarse-probe-counts-table standardized-data-table">
          <thead><tr><th>Role</th><th>Dataset</th><th>Total</th></tr></thead>
          <tbody>${standardizedDataRows(experiment)}</tbody>
        </table>
      </div>
      <h4>Class counts</h4>
      <div class="coarse-probe-counts-table-wrap">
        <table class="coarse-probe-counts-table standardized-outcome-table">
          <thead><tr><th>Role</th><th>Correct attribution</th><th>Wrong attribution</th><th>False attribution</th><th>Total</th></tr></thead>
          <tbody>${standardizedOutcomeRows(experiment)}</tbody>
        </table>
      </div>
      <p class="standardized-method-note">${escapeHtml(experiment.method_note)}</p>
      <h4>Selected representation result</h4>
      <p class="standardized-method-note">${escapeHtml(experiment.selection_note || `Layer ${standardizedSelectedLayer(experiment.id).layer}, selected by Initial Synthetic validation AUROC. The same frozen layer and threshold are then evaluated on Real data.`)}</p>
      <div class="coarse-probe-counts-table-wrap">
        <table class="coarse-probe-counts-table standardized-best-table">
          <thead><tr><th>Metric</th><th>Synthetic baseline</th><th>Synthetic probe</th><th>Real baseline</th><th>Real probe</th></tr></thead>
          <tbody>${standardizedBestRows(experiment.id)}</tbody>
        </table>
      </div>
      <h4>${experiment.fixed_metrics ? "Performance of the selected representation" : "Performance across transformer layers"}</h4>
      <label class="standardized-metric-control">Metric
        <select class="standardized-metric-select">${standardizedProbe.metrics.map((metric) => `<option value="${escapeHtml(metric.id)}">${escapeHtml(metric.label)}</option>`).join("")}</select>
      </label>
      <div class="standardized-probe-legend" aria-label="Evaluation datasets">
        <span class="synthetic-validation">Initial Synthetic validation</span>
        <span class="real-test">Real data test</span>
      </div>
      <div class="standardized-metric-chart"></div>
    </article>`)
    .join("");

  const renderStandardizedProbeCharts = () => {
    const bounds = { left: 54, right: 805, top: 26, bottom: 292 };
    const yTicks = [0, .2, .4, .6, .8, 1];
    const y = (value) => bounds.bottom - Number(value) * (bounds.bottom - bounds.top);
    document.querySelectorAll(".standardized-experiment-card").forEach((card) => {
      const experimentId = card.dataset.experimentId;
      const layerRows = standardizedExperimentLayers(experimentId);
      const x = (index) => layerRows.length === 1
        ? (bounds.left + bounds.right) / 2
        : bounds.left + index * (bounds.right - bounds.left) / (layerRows.length - 1);
      const series = [
        { id: "synthetic-validation", label: "Initial Synthetic validation", field: "synthetic_validation" },
        { id: "real-test", label: "Real data test", field: "real_test" },
      ];
      const renderMetric = (metricId) => {
        const metric = standardizedProbe.metrics.find((item) => item.id === metricId) || standardizedProbe.metrics[0];
        if (layerRows.length === 1) {
          const row = layerRows[0];
          const bars = [
            { id: "synthetic-validation", label: "Initial Synthetic", value: row.synthetic_validation[metric.id], x: 278 },
            { id: "real-test", label: "Real data", value: row.real_test[metric.id], x: 478 },
          ];
          card.querySelector(".standardized-metric-chart").innerHTML = `
            <figcaption>${escapeHtml(metric.label)}</figcaption>
            <p class="fixed-representation-note">One fixed ensemble (${escapeHtml(row.layer)}); there is no layer sweep for this experiment.</p>
            <div class="coarse-probe-chart"><svg viewBox="0 0 840 350" role="img" aria-label="${escapeHtml(metric.label)} for the fixed ensemble on Initial Synthetic validation and Real data test">
              ${yTicks.map((tick) => `<line class="probe-grid" x1="${bounds.left}" y1="${y(tick)}" x2="${bounds.right}" y2="${y(tick)}"/><text class="probe-axis-label" x="45" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>`).join("")}
              ${bars.map((bar) => `<rect class="probe-bar ${bar.id}" x="${bar.x}" y="${y(bar.value)}" width="84" height="${bounds.bottom - y(bar.value)}" rx="3"><title>${bar.label}: ${standardizedFormat(metric.id, bar.value)}</title></rect><text class="probe-bar-value" x="${bar.x + 42}" y="${Math.max(18, y(bar.value) - 8)}" text-anchor="middle">${standardizedFormat(metric.id, bar.value)}</text><text class="probe-axis-label" x="${bar.x + 42}" y="315" text-anchor="middle">${bar.label}</text>`).join("")}
              <text class="probe-axis-title" x="430" y="344" text-anchor="middle">Evaluation dataset</text>
              <text class="probe-axis-title" transform="translate(13 160) rotate(-90)" text-anchor="middle">${escapeHtml(metric.label)}</text>
            </svg></div>`;
          return;
        }
        card.querySelector(".standardized-metric-chart").innerHTML = `
          <figcaption>${escapeHtml(metric.label)}</figcaption>
          <div class="coarse-probe-chart"><svg viewBox="0 0 840 350" role="img" aria-label="${escapeHtml(metric.label)} on Initial Synthetic validation and Real data test">
            ${yTicks.map((tick) => `<line class="probe-grid" x1="${bounds.left}" y1="${y(tick)}" x2="${bounds.right}" y2="${y(tick)}"/><text class="probe-axis-label" x="45" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>`).join("")}
            ${layerRows.map((row, index) => `<text class="probe-axis-label" x="${x(index)}" y="315" text-anchor="middle">${row.layer}</text>`).join("")}
            ${series.map((item) => {
              const points = layerRows.map((row, index) => `${x(index)},${y(row[item.field][metric.id])}`).join(" ");
              return `<polyline class="probe-line ${item.id}" points="${points}"/>${layerRows.map((row, index) => `<circle class="probe-point ${item.id}" cx="${x(index)}" cy="${y(row[item.field][metric.id])}" r="3.5"><title>${item.label} · layer ${row.layer}: ${standardizedFormat(metric.id, row[item.field][metric.id])}</title></circle>`).join("")}`;
            }).join("")}
            <text class="probe-axis-title" x="430" y="344" text-anchor="middle">Transformer layer</text>
            <text class="probe-axis-title" transform="translate(13 160) rotate(-90)" text-anchor="middle">${escapeHtml(metric.label)}</text>
          </svg></div>`;
      };
      const selector = card.querySelector(".standardized-metric-select");
      renderMetric(selector.value);
      selector.addEventListener("change", () => renderMetric(selector.value));
    });
  };
  renderStandardizedProbeCharts();

  document.getElementById("coarse-probing-intro").textContent = coarseProbing.intro;
  document.getElementById("coarse-probing-facts").innerHTML = coarseProbing.facts
    .map((fact) => `<dt>${escapeHtml(fact.label)}</dt><dd>${escapeHtml(fact.value)}</dd>`).join("");
  document.getElementById("coarse-probing-positions").innerHTML = coarseProbing.positions
    .map((position) => `<li>${escapeHtml(position)}</li>`).join("");
  document.getElementById("coarse-probing-excluded").textContent = coarseProbing.excluded;
  document.getElementById("coarse-gate-intro").textContent = coarseProbing.gate_definition.intro;
  document.getElementById("coarse-gate-labels").innerHTML = coarseProbing.gate_definition.labels
    .map((label) => `<dt>${escapeHtml(label.label)}</dt><dd>${escapeHtml(label.value)}</dd>`).join("");
  document.getElementById("coarse-gate-excluded").textContent = coarseProbing.gate_definition.excluded;
  document.getElementById("coarse-split-intro").textContent = coarseProbing.split.intro;
  document.getElementById("coarse-split-counts").innerHTML = coarseProbing.split.counts
    .map((item) => `<dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd>`).join("");
  document.getElementById("coarse-split-stratification").textContent = coarseProbing.split.stratification;
  document.getElementById("coarse-split-note").textContent = coarseProbing.split.note;
  const corrected = coarseProbing.corrected_protocol;
  const validityRegistry = corrected.experiment_validity;
  document.getElementById("experiment-validity-rows").innerHTML = validityRegistry.classifications
    .map((row) => `<tr><th scope="row">${escapeHtml(row.experiment_ids)}</th>
      <td>${escapeHtml(row.status.replaceAll("_", " "))}</td>
      <td>${escapeHtml(row.reason)}</td><td>${escapeHtml(row.claim_policy)}</td></tr>`).join("");
  document.getElementById("experiment-validity-pending").textContent =
    `Still pending under the corrected protocol: ${validityRegistry.important_family_still_pending.family}. ${validityRegistry.important_family_still_pending.consequence}`;
  document.getElementById("corrected-protocol-headline").textContent = corrected.headline;
  document.getElementById("corrected-protocol-rules").innerHTML = corrected.protocol
    .map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  document.getElementById("corrected-development-summary").textContent =
    `${corrected.development.eligible} proposals · ${corrected.development.correct} correct / ${corrected.development.wrong} wrong / ${corrected.development.false_attribution} false attribution · ${corrected.development.meetings} meetings.`;
  document.getElementById("corrected-development-sources").innerHTML = corrected.development.sources
    .map((row) => `<tr><th scope="row">${escapeHtml(row.source)}</th><td>${row.correct}</td><td>${row.wrong}</td><td>${row.false_attribution}</td><td>${row.total}</td></tr>`)
    .join("");
  document.getElementById("corrected-anchor-label").textContent =
    `${corrected.anchor.label}. Nested selected layers by fold: ${corrected.anchor.selected_layers.join(", ")}.`;
  const anchor = corrected.anchor.metrics;
  document.getElementById("corrected-anchor-metrics").innerHTML = `<tr>
    <td>${Number(anchor.auroc).toFixed(3)}</td>
    <td>${Number(anchor.correct_vs_wrong_auroc).toFixed(3)}</td>
    <td>${Number(anchor.correct_vs_false_attribution_auroc).toFixed(3)}</td>
    <td>${pct(anchor.correct_attribution_acceptance_tpr)}</td>
    <td>${pct(anchor.wrong_attribution_rejection)}</td>
    <td>${pct(anchor.false_attribution_rejection)}</td>
  </tr>`;
  document.getElementById("corrected-anchor-pca").textContent = corrected.anchor.pca_conclusion;
  const semanticStudy = corrected.semantic_reasoning_study;
  document.getElementById("semantic-reasoning-status").textContent = semanticStudy.status;
  document.getElementById("semantic-reasoning-headline").textContent = semanticStudy.headline;
  document.getElementById("semantic-reasoning-rules").innerHTML = semanticStudy.rules
    .map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  document.getElementById("semantic-reasoning-anchors").innerHTML = semanticStudy.anchors
    .map((row) => `<tr>
      <th scope="row"><span title="${escapeHtml(row.hypothesis)}">${escapeHtml(row.anchor)}</span></th>
      <td>${escapeHtml(row.role)}</td><td>${row.correct}</td><td>${row.wrong}</td>
      <td>${row.false_attribution}</td><td>${row.n}</td>
    </tr>`).join("");
  const semanticSelection = semanticStudy.selection;
  document.getElementById("semantic-reasoning-selection").textContent = semanticSelection
    ? `${semanticSelection.selected.description} Primary layer ${semanticSelection.selected.primary_layer}; layers ${semanticSelection.selected.predeclared_neighbor_layers.join(" and ")} are frozen robustness checks only.`
    : "Selection record is not available.";
  const semanticMetric = (metrics, field, percent = false) => {
    if (!metrics || metrics[field] === undefined) return "—";
    return percent ? pct(metrics[field]) : Number(metrics[field]).toFixed(3);
  };
  const semanticSelectedRows = [];
  if (semanticSelection) {
    const selectedDevelopmentRun = semanticStudy.fusion_runs.find((row) =>
      row.component_id === semanticSelection.selected.component &&
      row.fusion_id === "attribution_relevant_mean_plus_pre_final");
    const metrics = selectedDevelopmentRun
      ? selectedDevelopmentRun.metrics
      : semanticSelection.selected.nested_grouped_oof;
    semanticSelectedRows.push({
      label: "Initial Synthetic · meeting-grouped OOF",
      n: semanticSelection.coverage.selected_representation.total,
      metrics: {
        macro_subtype_auroc: metrics.macro_subtype_auroc,
        auroc: metrics.auroc,
        correct_vs_wrong_auroc: metrics.correct_vs_wrong_auroc,
        correct_vs_false_attribution_auroc: metrics.correct_vs_false_attribution_auroc,
        correct_attribution_acceptance_tpr: metrics.correct_attribution_retention,
        wrong_attribution_rejection: metrics.wrong_attribution_rejection,
        false_attribution_rejection: metrics.false_attribution_rejection,
      },
    });
  }
  if (semanticStudy.real_transfer) {
    const primaryLayer = Number(semanticSelection.selected.primary_layer);
    semanticStudy.real_transfer.metrics.layers.forEach((item) => {
      const layer = Number(item.layer);
      semanticSelectedRows.push({
        label: layer === primaryLayer
          ? `Real data transfer · frozen primary layer ${layer}`
          : `Real data transfer · predeclared robustness layer ${layer}`,
        n: semanticStudy.real_transfer.examples.eligible,
        metrics: item.metrics,
      });
    });
  } else {
    semanticSelectedRows.push({ label: "Real data transfer · frozen layer 27", n: "In progress", metrics: null });
  }
  document.getElementById("semantic-reasoning-selected-results").innerHTML = semanticSelectedRows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${row.n}</td>
      <td>${semanticMetric(row.metrics, "macro_subtype_auroc")}</td>
      <td>${semanticMetric(row.metrics, "auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_vs_wrong_auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_vs_false_attribution_auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_attribution_acceptance_tpr", true)}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_rejection", true)}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_rejection", true)}</td></tr>`)
    .join("");
  const semanticResultCells = (row) => `<tr>
    <th scope="row">${escapeHtml(row.component)}</th><td>${row.n}</td>
    <td>${semanticMetric(row.metrics, "macro_subtype_auroc")}</td>
    <td>${semanticMetric(row.metrics, "auroc")}</td>
    <td>${semanticMetric(row.metrics, "correct_vs_wrong_auroc")}</td>
    <td>${semanticMetric(row.metrics, "correct_vs_false_attribution_auroc")}</td>
    <td>${semanticMetric(row.metrics, "correct_attribution_acceptance_tpr", true)}</td>
    <td>${semanticMetric(row.metrics, "wrong_attribution_rejection", true)}</td>
    <td>${semanticMetric(row.metrics, "false_attribution_rejection", true)}</td>
    <td>${row.selected_layers.join(", ")}</td></tr>`;
  const semanticAnchorSelect = document.getElementById("semantic-reasoning-anchor-select");
  semanticAnchorSelect.innerHTML = semanticStudy.anchors
    .map((row) => `<option value="${escapeHtml(row.anchor_id)}">${escapeHtml(row.anchor)}</option>`).join("");
  if (semanticStudy.anchors.some((row) => row.anchor_id === "attribution_relevant_tokens_mean")) {
    semanticAnchorSelect.value = "attribution_relevant_tokens_mean";
  }
  const renderSemanticIndividuals = () => {
    document.getElementById("semantic-reasoning-individual-runs").innerHTML = semanticStudy.individual_runs
      .filter((row) => row.anchor_id === semanticAnchorSelect.value)
      .map(semanticResultCells).join("");
  };
  semanticAnchorSelect.addEventListener("change", renderSemanticIndividuals);
  renderSemanticIndividuals();
  const semanticFusionSelect = document.getElementById("semantic-reasoning-fusion-select");
  const semanticFusionOptions = [...new Map(semanticStudy.fusion_runs.map((row) => [row.fusion_id, row.fusion])).entries()];
  semanticFusionSelect.innerHTML = semanticFusionOptions
    .map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join("");
  const renderSemanticFusions = () => {
    document.getElementById("semantic-reasoning-fusion-runs").innerHTML = semanticStudy.fusion_runs
      .filter((row) => row.fusion_id === semanticFusionSelect.value)
      .map(semanticResultCells).join("");
  };
  semanticFusionSelect.addEventListener("change", renderSemanticFusions);
  renderSemanticFusions();
  const semanticTransitions = semanticStudy.transitions;
  document.getElementById("semantic-transition-status").textContent = semanticTransitions.status;
  document.getElementById("semantic-transition-definition").textContent = semanticTransitions.definition;
  const transitionSelection = semanticTransitions.selection;
  document.getElementById("semantic-transition-selection").textContent = transitionSelection
    ? `${transitionSelection.selected_complementary_representation.description} It is retained as a complementary wrong-focused representation, not as a replacement for the balanced primary gate.`
    : "No transition selection is frozen.";
  const semanticTransitionSelect = document.getElementById("semantic-transition-select");
  const semanticTransitionOptions = [...new Map(semanticTransitions.runs.map((row) => [row.transition_id, row.transition])).entries()];
  semanticTransitionSelect.innerHTML = semanticTransitionOptions
    .map(([id, label]) => `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`).join("");
  if (semanticTransitionOptions.some(([id]) => id === "first_evidence_application_mean_to_pre_final")) {
    semanticTransitionSelect.value = "first_evidence_application_mean_to_pre_final";
  }
  const renderSemanticTransitions = () => {
    document.getElementById("semantic-transition-runs").innerHTML = semanticTransitions.runs
      .filter((row) => row.transition_id === semanticTransitionSelect.value)
      .map(semanticResultCells).join("");
  };
  semanticTransitionSelect.addEventListener("change", renderSemanticTransitions);
  renderSemanticTransitions();
  const transitionSelectedRows = [];
  if (transitionSelection) {
    const selected = transitionSelection.selected_complementary_representation;
    const selectedDevelopment = semanticTransitions.runs.find((row) =>
      row.component_id === selected.component &&
      row.transition_id === "first_evidence_application_mean_to_pre_final");
    if (selectedDevelopment) transitionSelectedRows.push({
      label: "Initial Synthetic · meeting-grouped OOF",
      n: selectedDevelopment.n,
      metrics: selectedDevelopment.metrics,
    });
    if (semanticTransitions.real_transfer) {
      semanticTransitions.real_transfer.metrics.layers.forEach((item) => {
        const layer = Number(item.layer);
        transitionSelectedRows.push({
          label: layer === Number(selected.primary_layer)
            ? `Real data transfer · frozen primary layer ${layer}`
            : `Real data transfer · predeclared robustness layer ${layer}`,
          n: semanticTransitions.real_transfer.examples.eligible,
          metrics: item.metrics,
        });
      });
    } else {
      transitionSelectedRows.push({ label: "Real data transfer · frozen primary layer 30", n: "In progress", metrics: null });
    }
  }
  document.getElementById("semantic-transition-selected-results").innerHTML = transitionSelectedRows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${row.n}</td>
      <td>${semanticMetric(row.metrics, "macro_subtype_auroc")}</td>
      <td>${semanticMetric(row.metrics, "auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_vs_wrong_auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_vs_false_attribution_auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_attribution_acceptance_tpr", true)}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_rejection", true)}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_rejection", true)}</td></tr>`)
    .join("");
  const scoreFusion = semanticStudy.score_fusion;
  document.getElementById("semantic-score-fusion-conclusion").textContent = scoreFusion
    ? scoreFusion.conclusion
    : "The controlled fusion is pending.";
  const scoreFusionRows = [];
  if (scoreFusion) {
    const sections = [
      ["Initial Synthetic · meeting-grouped OOF", scoreFusion.exact_common_scope.initial_synthetic.total, scoreFusion.initial_synthetic_grouped_oof],
      ["Real data · frozen transfer", scoreFusion.exact_common_scope.real_data.total, scoreFusion.real_frozen_transfer],
    ];
    const representations = [
      ["Balanced late-decision input", "balanced_input_layer_27"],
      ["Evidence→decision transition input", "transition_input_layer_30"],
      ["Calibrated score fusion", "calibrated_score_fusion"],
    ];
    sections.forEach(([evaluation, n, metricsByRepresentation]) => {
      representations.forEach(([representation, key]) => scoreFusionRows.push({
        evaluation, representation, n, metrics: metricsByRepresentation[key],
      }));
    });
  }
  document.getElementById("semantic-score-fusion-results").innerHTML = scoreFusionRows
    .map((row) => `<tr><td>${escapeHtml(row.evaluation)}</td><th scope="row">${escapeHtml(row.representation)}</th><td>${row.n}</td>
      <td>${semanticMetric(row.metrics, "macro_subtype_auroc")}</td>
      <td>${semanticMetric(row.metrics, "overall_auroc")}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_auroc")}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_attribution_retention", true)}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_rejection", true)}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_rejection", true)}</td></tr>`)
    .join("");
  const componentFusions = semanticStudy.component_fusions;
  document.getElementById("semantic-component-fusion-conclusion").textContent = componentFusions.conclusion;
  document.getElementById("semantic-component-fusion-results").innerHTML = componentFusions.runs
    .map((row) => semanticResultCells({ ...row, component: row.fusion }))
    .join("");
  const denseLayerStudy = semanticStudy.dense_layer_stability;
  document.getElementById("semantic-dense-layer-conclusion").textContent = denseLayerStudy
    ? `Layer ${denseLayerStudy.best_single_pooled_layer} is the highest single pooled point, but nested training-fold selection chose layers ${denseLayerStudy.nested_layer_selection.selected_layers_by_fold.join(", ")}. ${denseLayerStudy.decision.rationale}`
    : "Dense layer stability study is pending.";
  const denseLayerRows = denseLayerStudy ? [
    ...denseLayerStudy.layers.map((row) => ({ label: `Layer ${row.layer}`, metrics: row })),
    { label: "Fully nested layer selection", metrics: denseLayerStudy.nested_layer_selection },
  ] : [];
  document.getElementById("semantic-dense-layer-results").innerHTML = denseLayerRows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${denseLayerStudy.examples.total}</td>
      <td>${semanticMetric(row.metrics, "macro_subtype_auroc")}</td>
      <td>${semanticMetric(row.metrics, "overall_auroc")}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_auroc")}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_attribution_retention", true)}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_rejection", true)}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_rejection", true)}</td></tr>`)
    .join("");
  const answerStudy = semanticStudy.generated_answer_study;
  const answerSummary = answerStudy.summary;
  document.getElementById("semantic-answer-conclusion").textContent = answerSummary
    ? answerSummary.conclusion
    : "Generated-answer token study is pending.";
  document.getElementById("semantic-answer-comparison-results").innerHTML = answerSummary
    ? answerSummary.comparison.map((row) => `<tr>
      <th scope="row">${escapeHtml(row.anchor)}</th><td>${escapeHtml(row.component)}</td><td>${answerSummary.examples.total}</td>
      <td>${semanticMetric(row, "macro_subtype_auroc")}</td>
      <td>${semanticMetric(row, "overall_auroc")}</td>
      <td>${semanticMetric(row, "wrong_attribution_auroc")}</td>
      <td>${semanticMetric(row, "false_attribution_auroc")}</td>
      <td>${semanticMetric(row, "correct_attribution_retention", true)}</td>
      <td>${semanticMetric(row, "wrong_attribution_rejection", true)}</td>
      <td>${semanticMetric(row, "false_attribution_rejection", true)}</td>
      <td>${row.selected_layers.join(", ")}</td></tr>`).join("")
    : "";
  const answerRealRows = answerSummary ? [
    ["Primary layer 18 · frozen", answerSummary.real_frozen_transfer.primary_layer_18],
    ["Robustness layer 21", answerSummary.real_frozen_transfer.robustness_layer_21],
    ["Robustness layer 24", answerSummary.real_frozen_transfer.robustness_layer_24],
  ] : [];
  document.getElementById("semantic-answer-real-results").innerHTML = answerRealRows
    .map(([label, row]) => `<tr><th scope="row">${escapeHtml(label)}</th><td>${answerSummary.real_frozen_transfer.examples.total}</td>
      <td>${semanticMetric(row, "macro_subtype_auroc")}</td>
      <td>${semanticMetric(row, "overall_auroc")}</td>
      <td>${semanticMetric(row, "wrong_attribution_auroc")}</td>
      <td>${semanticMetric(row, "false_attribution_auroc")}</td>
      <td>${semanticMetric(row, "correct_attribution_retention", true)}</td>
      <td>${semanticMetric(row, "wrong_attribution_rejection", true)}</td>
      <td>${semanticMetric(row, "false_attribution_rejection", true)}</td></tr>`)
    .join("");
  const answerScoreFusion = answerStudy.score_fusion;
  document.getElementById("semantic-answer-score-fusion-conclusion").textContent = answerScoreFusion
    ? answerScoreFusion.decision
    : "The semantic-plus-answer score fusion is pending.";
  const answerScoreFusionRows = [];
  if (answerScoreFusion) {
    const sections = [
      ["Initial Synthetic · meeting-grouped OOF", answerScoreFusion.exact_common_scope.initial_synthetic.total, answerScoreFusion.initial_synthetic_grouped_oof],
      ["Real data · frozen transfer", answerScoreFusion.exact_common_scope.real_data.total, answerScoreFusion.real_frozen_transfer],
    ];
    const representations = [
      ["Balanced semantic reasoning · layer 27", "balanced_semantic_layer_27"],
      ["Generated answer token · layer 18", "generated_answer_layer_18"],
      ["Calibrated score fusion", "calibrated_score_fusion"],
    ];
    sections.forEach(([evaluation, n, metricsByRepresentation]) => {
      representations.forEach(([representation, key]) => answerScoreFusionRows.push({
        evaluation, representation, n, metrics: metricsByRepresentation[key],
      }));
    });
  }
  document.getElementById("semantic-answer-score-fusion-results").innerHTML = answerScoreFusionRows
    .map((row) => `<tr><td>${escapeHtml(row.evaluation)}</td><th scope="row">${escapeHtml(row.representation)}</th><td>${row.n}</td>
      <td>${semanticMetric(row.metrics, "macro_subtype_auroc")}</td>
      <td>${semanticMetric(row.metrics, "overall_auroc")}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_auroc")}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_attribution_retention", true)}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_rejection", true)}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_rejection", true)}</td></tr>`)
    .join("");
  const correctedReference = semanticStudy.corrected_1242_reference;
  document.getElementById("corrected-1242-reference-status").textContent = correctedReference.status.replaceAll("_", " ");
  document.getElementById("corrected-1242-reference-scope").textContent = correctedReference.scope;
  document.getElementById("corrected-1242-reference-position").textContent = `Representation: ${correctedReference.position}`;
  document.getElementById("corrected-1242-reference-selection").textContent = correctedReference.selection;
  const correctedReferenceRows = [];
  correctedReference.tracks.forEach((track) => {
    correctedReferenceRows.push({
      label: track.label,
      evaluation: "Non-Real grouped OOF",
      layer: track.selected_layer,
      metrics: track.synthetic,
    });
    correctedReferenceRows.push({
      label: track.label,
      evaluation: "Real291 frozen transfer",
      layer: track.selected_layer,
      metrics: track.real,
    });
  });
  if (correctedReference.baseline) {
    correctedReferenceRows.push({
      label: "Native output-confidence baseline",
      evaluation: "Full Synthetic threshold selection",
      layer: "—",
      metrics: correctedReference.baseline,
    });
    correctedReferenceRows.push({
      label: "Native output-confidence baseline",
      evaluation: "Real291 · Synthetic-frozen threshold",
      layer: "—",
      metrics: correctedReference.baseline_frozen_real,
    });
  }
  document.getElementById("corrected-1242-reference-results").innerHTML = correctedReferenceRows.length
    ? correctedReferenceRows.map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th>
      <td>${escapeHtml(row.evaluation)}</td><td>${row.layer}</td>
      <td>${pct(row.metrics.correct_retention)}</td>
      <td>${pct(row.metrics.wrong_attribution_rejection)}</td>
      <td>${pct(row.metrics.false_attribution_rejection)}</td>
      <td>${decimal(row.metrics.auroc)}</td>
      <td>${decimal(row.metrics.correct_vs_wrong_auroc)}</td>
      <td>${decimal(row.metrics.correct_vs_false_attribution_auroc)}</td></tr>`).join("")
    : `<tr><td colspan="9">Pending</td></tr>`;
  const correctedMatchedRetentionRows = correctedReference.tracks.map((track) => `<tr><th scope="row">${escapeHtml(track.label)}</th>
      <td>${track.selected_layer}</td>
      <td>${pct(track.real_at_90pct.correct_retention)}</td>
      <td>${pct(track.real_at_90pct.wrong_attribution_rejection)}</td>
      <td>${pct(track.real_at_90pct.false_attribution_rejection)}</td></tr>`);
  if (correctedReference.baseline_real_matched_retention) {
    const row = correctedReference.baseline_real_matched_retention;
    correctedMatchedRetentionRows.push(`<tr><th scope="row">Native output-confidence baseline</th>
      <td>—</td><td>${pct(row.correct_retention)}</td>
      <td>${pct(row.wrong_attribution_rejection)}</td>
      <td>${pct(row.false_attribution_rejection)}</td></tr>`);
  }
  document.getElementById("corrected-1242-real-90-results").innerHTML = correctedMatchedRetentionRows.length
    ? correctedMatchedRetentionRows.join("")
    : `<tr><td colspan="5">Pending</td></tr>`;
  document.getElementById("corrected-1242-reference-conclusion").textContent = correctedReference.conclusion;
  document.getElementById("corrected-1242-reference-calibration").textContent = correctedReference.calibration_warning;
  document.getElementById("corrected-1242-reference-overfitting").textContent = correctedReference.overfitting_warning;
  const componentStudy = semanticStudy.corrected_component_study;
  document.getElementById("corrected-component-status").textContent = `Status: ${componentStudy.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-component-scope").textContent = componentStudy.scope;
  document.getElementById("corrected-component-synthetic-results").innerHTML = componentStudy.synthetic
    .map((row) => `<tr><th scope="row">${escapeHtml(row.component)}</th><td>${row.layer}</td>
      <td>${pct(row.metrics.correct_retention)}</td><td>${pct(row.metrics.wrong_attribution_rejection)}</td>
      <td>${pct(row.metrics.false_attribution_rejection)}</td><td>${decimal(row.metrics.overall_auroc)}</td>
      <td>${decimal(row.metrics.wrong_auroc)}</td><td>${decimal(row.metrics.false_auroc)}</td>
      <td>${escapeHtml(row.decision.replaceAll("_", " "))}</td></tr>`).join("");
  document.getElementById("corrected-component-real-results").innerHTML = componentStudy.real.length
    ? componentStudy.real.map((row) => `<tr><th scope="row">${escapeHtml(row.component.replaceAll("_", " "))}</th>
      <td>${pct(row.correct_retention)}</td><td>${pct(row.wrong_attribution_rejection)}</td>
      <td>${pct(row.false_attribution_rejection)}</td><td>${decimal(row.overall_auroc)}</td>
      <td>${decimal(row.wrong_auroc)}</td><td>${decimal(row.false_auroc)}</td></tr>`).join("")
    : `<tr><td colspan="7">Pending</td></tr>`;
  document.getElementById("corrected-component-conclusion").textContent = componentStudy.conclusion;
  const anchorStudy = semanticStudy.corrected_anchor_study;
  document.getElementById("corrected-anchor-status").textContent = `Status: ${anchorStudy.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-anchor-hypothesis").textContent = `Hypothesis: ${anchorStudy.hypothesis}`;
  document.getElementById("corrected-anchor-scope").textContent = anchorStudy.scope;
  const anchorLabels = {
    prompt_end: "End of prompt",
    "attribution_evidence_span:mean": "Evidence span · mean",
    "target_response_span:mean": "Target response · mean",
    reasoning_last: "Last reasoning token",
    final_cue_pre_prediction: "':' ending FINAL: · pre-answer",
  };
  const anchorRows = [
    ...anchorStudy.synthetic.map((row) => ({ ...row, evaluation: "Non-Real grouped OOF" })),
    ...anchorStudy.real.map((row) => ({ ...row, evaluation: "Frozen Real291 transfer" })),
  ];
  document.getElementById("corrected-anchor-results").innerHTML = anchorRows.length
    ? anchorRows.map((row) => `<tr><th scope="row">${escapeHtml(anchorLabels[row.anchor] || row.anchor)}</th>
      <td>${escapeHtml(row.evaluation)}</td><td>${pct(row.correct_retention)}</td>
      <td>${pct(row.wrong_attribution_rejection)}</td><td>${pct(row.false_attribution_rejection)}</td>
      <td>${decimal(row.overall_auroc)}</td><td>${decimal(row.wrong_auroc)}</td>
      <td>${decimal(row.false_auroc)}</td></tr>`).join("")
    : `<tr><td colspan="8">Pending</td></tr>`;
  document.getElementById("corrected-anchor-conclusion").textContent = anchorStudy.conclusion
    ? anchorStudy.conclusion.finding
    : "Pending.";
  document.getElementById("corrected-anchor-shortcut").textContent = anchorStudy.conclusion
    ? anchorStudy.conclusion.shortcut
    : "";
  document.getElementById("corrected-anchor-token-distinction").textContent = anchorStudy.conclusion
    ? anchorStudy.conclusion.token_distinction
    : "";
  const lateDecisionStudy = semanticStudy.corrected_late_decision_study;
  document.getElementById("corrected-late-decision-status").textContent = `Status: ${lateDecisionStudy.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-late-decision-hypothesis").textContent = `Hypothesis: ${lateDecisionStudy.hypothesis}`;
  document.getElementById("corrected-late-decision-scope").textContent = lateDecisionStudy.scope;
  const lateAnchorLabels = {
    reasoning_last: "Last reasoning token",
    final_cue_pre_prediction: "':' ending FINAL: · pre-answer",
    generated_answer_token: "Generated answer token",
  };
  const lateRole = (anchor) => anchor === "generated_answer_token" ? "Post-decision diagnostic" : "Pre-answer";
  const lateRows = [
    ...lateDecisionStudy.non_real.map((row) => ({ ...row, evaluation: "Non-Real grouped OOF" })),
    ...lateDecisionStudy.real.map((row) => ({ ...row, evaluation: "Frozen Real291 transfer" })),
  ];
  document.getElementById("corrected-late-decision-results").innerHTML = lateRows.length
    ? lateRows.map((row) => `<tr><th scope="row">${escapeHtml(row.component)}</th>
      <td>${escapeHtml(lateAnchorLabels[row.anchor] || row.anchor)}</td><td>${lateRole(row.anchor)}</td>
      <td>${escapeHtml(row.evaluation)}</td><td>${row.layer}</td><td>${pct(row.correct_retention)}</td>
      <td>${pct(row.wrong_attribution_rejection)}</td><td>${pct(row.false_attribution_rejection)}</td>
      <td>${decimal(row.overall_auroc)}</td><td>${decimal(row.wrong_auroc)}</td>
      <td>${decimal(row.false_auroc)}</td></tr>`).join("")
    : `<tr><td colspan="11">Pending</td></tr>`;
  const commonRows = lateDecisionStudy.real_common_retention
    ? lateDecisionStudy.real_common_retention.rows
    : [];
  document.getElementById("corrected-late-decision-common-retention").innerHTML = commonRows.length
    ? commonRows.map((row) => `<tr><th scope="row">${escapeHtml(row.component)}</th>
      <td>${escapeHtml(lateAnchorLabels[row.anchor] || row.anchor)}</td>
      <td>${pct(row.wrong_attribution_rejection)}</td><td>${pct(row.false_attribution_rejection)}</td></tr>`).join("")
    : `<tr><td colspan="4">Pending</td></tr>`;
  document.getElementById("corrected-late-decision-complementarity").textContent = lateDecisionStudy.complementarity
    ? `Pre-FINAL residual/MLP score correlation on Real291: ${decimal(lateDecisionStudy.complementarity.real_score_pearson)}. ${lateDecisionStudy.complementarity.fusion_decision}`
    : "";
  document.getElementById("corrected-late-decision-conclusion").textContent = lateDecisionStudy.conclusion
    ? `${lateDecisionStudy.conclusion.timing} ${lateDecisionStudy.conclusion.deployable_component} ${lateDecisionStudy.conclusion.comparison_to_reference}`
    : "Pending.";
  const transitionStudy = semanticStudy.corrected_transition_study;
  document.getElementById("corrected-transition-status").textContent = `Status: ${transitionStudy.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-transition-hypothesis").textContent = `Hypothesis: ${transitionStudy.hypothesis}`;
  document.getElementById("corrected-transition-scope").textContent = transitionStudy.scope;
  const transitionRows = [
    ...transitionStudy.non_real.map((row) => ({ ...row, evaluation: "Non-Real grouped OOF" })),
    ...transitionStudy.real.map((row) => ({ ...row, evaluation: "Frozen Real291 transfer" })),
  ];
  document.getElementById("corrected-transition-results").innerHTML = transitionRows.length
    ? transitionRows.map((row) => `<tr><th scope="row">${escapeHtml(row.evaluation)}</th><td>${row.layer}</td>
      <td>${row.layer === transitionStudy.selected_layer ? "Synthetic-selected" : "Predeclared robustness"}</td>
      <td>${pct(row.correct_retention)}</td><td>${pct(row.wrong_rejection)}</td>
      <td>${pct(row.false_rejection)}</td><td>${decimal(row.overall_auroc)}</td>
      <td>${decimal(row.wrong_auroc)}</td><td>${decimal(row.false_auroc)}</td></tr>`).join("")
    : `<tr><td colspan="9">Pending</td></tr>`;
  document.getElementById("corrected-transition-common-retention").innerHTML = transitionStudy.real_common_retention.length
    ? transitionStudy.real_common_retention.map((row) => `<tr><th scope="row">${row.layer}</th>
      <td>${pct(row.correct_retention)}</td><td>${pct(row.wrong_rejection)}</td>
      <td>${pct(row.false_rejection)}</td></tr>`).join("")
    : `<tr><td colspan="4">Pending</td></tr>`;
  document.getElementById("corrected-transition-comparison").textContent = transitionStudy.comparison || "";
  document.getElementById("corrected-transition-conclusion").textContent = transitionStudy.conclusion || "Pending.";
  document.getElementById("corrected-transition-next").textContent = transitionStudy.next_hypothesis
    ? `Next hypothesis: ${transitionStudy.next_hypothesis}`
    : "";
  const traceAudit = semanticStudy.corrected_trace_subtype_audit;
  document.getElementById("corrected-trace-audit-status").textContent = `Status: ${traceAudit.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-trace-audit-hypothesis").textContent = `Hypothesis: ${traceAudit.hypothesis}`;
  const traceGateLabels = {
    exp69_wrong_primary_residual_l27: "Experiment 69 · wrong-primary residual L27",
    exp69_false_primary_residual_l21: "Experiment 69 · false-primary residual L21",
    exp70_pre_attention_l24: "Experiment 70 · pre-attention L24",
  };
  const traceCell = (bucket) => bucket
    ? `${bucket.rejected} / ${bucket.n} rejected (${pct(bucket.rejection_rate)}); AUROC ${decimal(bucket.correct_vs_bucket_auroc)}`
    : "—";
  const traceRows = traceAudit.results.flatMap((row) => [
    { gate: row.gate, evaluation: "Non-Real grouped OOF", buckets: row.non_real_oof },
    { gate: row.gate, evaluation: "Frozen Real291 transfer", buckets: row.real291 },
  ]);
  document.getElementById("corrected-trace-audit-results").innerHTML = traceRows
    .map((row) => `<tr><th scope="row">${escapeHtml(traceGateLabels[row.gate] || row.gate)}</th>
      <td>${escapeHtml(row.evaluation)}</td><td>${traceCell(row.buckets.clean_natural)}</td>
      <td>${traceCell(row.buckets.forced_active)}</td><td>${traceCell(row.buckets.unsupported_final)}</td></tr>`).join("");
  document.getElementById("corrected-trace-audit-finding").textContent = traceAudit.finding;
  document.getElementById("corrected-trace-audit-interpretation").textContent = traceAudit.interpretation;
  document.getElementById("corrected-trace-audit-limitations").textContent = `Limitation: ${traceAudit.limitations}`;
  document.getElementById("corrected-trace-audit-decision").textContent = `Decision: ${traceAudit.decision}`;
  document.getElementById("corrected-trace-audit-next").textContent = `Next hypothesis: ${traceAudit.next_hypothesis}`;
  const traceWeighting = semanticStudy.corrected_trace_weighting_study;
  document.getElementById("corrected-trace-weighting-status").textContent = `Status: ${traceWeighting.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-trace-weighting-hypothesis").textContent = `Hypothesis: ${traceWeighting.hypothesis}`;
  document.getElementById("corrected-trace-weighting-scope").textContent = traceWeighting.scope;
  const nonRealReference = traceWeighting.non_real.experiment_70_reference;
  const nonRealWeighted = traceWeighting.non_real.experiment_75_trace_aware;
  const realReference = traceWeighting.real.experiment_70_common_90pct_reference;
  const realWeighted = traceWeighting.real.common_90pct_retention_diagnostic;
  const weightingRows = [
    { evaluation: "Non-Real grouped OOF", gate: "Experiment 70 · standard weights", values: nonRealReference },
    { evaluation: "Non-Real grouped OOF", gate: "Experiment 75 · trace-aware weights", values: nonRealWeighted },
    { evaluation: "Real291 · common high retention", gate: "Experiment 70 · standard weights", values: realReference },
    { evaluation: "Real291 · common high retention", gate: "Experiment 75 · trace-aware weights", values: realWeighted },
  ];
  document.getElementById("corrected-trace-weighting-results").innerHTML = weightingRows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.evaluation)}</th><td>${escapeHtml(row.gate)}</td>
      <td>${pct(row.values.correct_retention)}</td><td>${pct(row.values.wrong_attribution_rejection)}</td>
      <td>${pct(row.values.false_attribution_rejection)}</td><td>${row.values.auroc == null ? "—" : decimal(row.values.auroc)}</td></tr>`).join("");
  const weightingBuckets = [
    { evaluation: "Non-Real grouped OOF", buckets: traceWeighting.trace_buckets.non_real },
    { evaluation: "Frozen Real291 transfer", buckets: traceWeighting.trace_buckets.real_frozen },
  ];
  document.getElementById("corrected-trace-weighting-buckets").innerHTML = weightingBuckets
    .map((row) => `<tr><th scope="row">${escapeHtml(row.evaluation)}</th>
      <td>${traceCell(row.buckets.natural_explicit_wrong_conclusion)}</td>
      <td>${traceCell(row.buckets.forced_active_wrong_hypothesis)}</td>
      <td>${traceCell(row.buckets.forced_unsupported_final_token)}</td></tr>`).join("");
  document.getElementById("corrected-trace-weighting-finding").textContent = traceWeighting.finding;
  document.getElementById("corrected-trace-weighting-decision").textContent = `Decision: ${traceWeighting.decision}`;
  document.getElementById("corrected-trace-weighting-next").textContent = `Next hypothesis: ${traceWeighting.next_hypothesis}`;
  const transferMismatch = semanticStudy.corrected_transfer_mismatch_study;
  document.getElementById("corrected-transfer-mismatch-status").textContent =
    `Status: ${transferMismatch.status.replaceAll("_", " ")}. Scope: ${transferMismatch.scope.non_real_usable_wrong} non-Real usable wrongs and ${transferMismatch.scope.real291_usable_wrong} Real291 usable wrongs.`;
  document.getElementById("corrected-transfer-mismatch-hypothesis").textContent =
    `Hypothesis: ${transferMismatch.hypothesis}`;
  const rateFeatures = new Set([
    "Target says another candidate name",
    "Dense candidate-name context",
    "Immediate cue-response",
  ]);
  const mismatchValue = (feature, value) => rateFeatures.has(feature) ? pct(value) : decimal(value);
  document.getElementById("corrected-transfer-mismatch-results").innerHTML = transferMismatch.comparison
    .map((row) => `<tr><th scope="row">${escapeHtml(row.feature)}</th>
      <td>${mismatchValue(row.feature, row.non_real_usable_wrong)}</td>
      <td>${mismatchValue(row.feature, row.real291_usable_wrong)}</td>
      <td>${mismatchValue(row.feature, row.non_real_correct)}</td>
      <td>${mismatchValue(row.feature, row.real291_correct)}</td></tr>`).join("");
  document.getElementById("corrected-transfer-mismatch-finding").textContent = transferMismatch.finding;
  document.getElementById("corrected-transfer-mismatch-interpretation").textContent = transferMismatch.interpretation;
  document.getElementById("corrected-transfer-mismatch-real-use").textContent = transferMismatch.real291_use;
  document.getElementById("corrected-transfer-mismatch-decision").textContent = `Decision: ${transferMismatch.decision}`;
  document.getElementById("corrected-transfer-mismatch-limitations").textContent = `Limitation: ${transferMismatch.limitations}`;
  const mediasumYield = semanticStudy.corrected_mediasum_yield_study;
  document.getElementById("corrected-mediasum-yield-status").textContent =
    `Status: ${mediasumYield.status.replaceAll("_", " ")}. ${mediasumYield.scope.examples} evaluated MediaSum evidence examples.`;
  document.getElementById("corrected-mediasum-yield-hypothesis").textContent =
    `Hypothesis: ${mediasumYield.hypothesis}`;
  document.getElementById("corrected-mediasum-yield-results").innerHTML = mediasumYield.comparison
    .map((row) => `<tr><th scope="row">${escapeHtml(row.stratum)}</th><td>${row.n}</td>
      <td>${row.raw_wrong} (${pct(row.raw_wrong_rate)})</td>
      <td>${row.clean_natural} (${pct(row.clean_natural_rate)})</td>
      <td>${row.forced_active} (${pct(row.forced_active_rate)})</td>
      <td>${row.unsupported}</td></tr>`).join("");
  document.getElementById("corrected-mediasum-yield-finding").textContent = mediasumYield.finding;
  document.getElementById("corrected-mediasum-yield-decision").textContent = `Decision: ${mediasumYield.decision}`;
  document.getElementById("corrected-mediasum-yield-next").textContent = `Next hypothesis: ${mediasumYield.next_hypothesis}`;
  document.getElementById("corrected-mediasum-yield-limitations").textContent = `Limitation: ${mediasumYield.limitations}`;
  const mediasumMechanisms = semanticStudy.corrected_mediasum_mechanism_study;
  document.getElementById("corrected-mediasum-mechanism-status").textContent =
    `Status: ${mediasumMechanisms.status.replaceAll("_", " ")}. ${mediasumMechanisms.scope.total} manually classified traces: ${mediasumMechanisms.scope.natural_explicit_wrong_conclusion} natural and ${mediasumMechanisms.scope.forced_active_wrong_hypothesis} forced-active.`;
  document.getElementById("corrected-mediasum-mechanism-hypothesis").textContent =
    `Hypothesis: ${mediasumMechanisms.hypothesis}`;
  document.getElementById("corrected-mediasum-mechanism-results").innerHTML = mediasumMechanisms.mechanisms
    .map((row) => `<tr><th scope="row">${escapeHtml(row.mechanism)}</th><td>${row.total}</td>
      <td>${row.natural}</td><td>${row.forced_active}</td><td>${escapeHtml(row.description)}</td></tr>`).join("");
  document.getElementById("corrected-mediasum-mechanism-finding").textContent = mediasumMechanisms.finding;
  document.getElementById("corrected-mediasum-mechanism-decision").textContent = `Decision: ${mediasumMechanisms.decision}`;
  const outputMargin = semanticStudy.corrected_output_margin_study;
  document.getElementById("corrected-output-margin-status").textContent =
    `Status: ${outputMargin.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-output-margin-hypothesis").textContent =
    `Hypothesis: ${outputMargin.hypothesis}`;
  document.getElementById("corrected-output-margin-scope").textContent =
    `${outputMargin.scope.development} Real291 is frozen transfer evidence and fits nothing.`;
  const outputMarginRows = [
    ["Non-Real grouped OOF", "Experiment 70 · pre-attention L24", outputMargin.comparison.reference_experiment_70.development],
    ["Non-Real grouped OOF", "Experiment 79 · + output margin", outputMargin.comparison.margin_augmented.development],
    ["Real291 frozen transfer", "Experiment 70 · pre-attention L24", outputMargin.comparison.reference_experiment_70.real291],
    ["Real291 frozen transfer", "Experiment 79 · + output margin", outputMargin.comparison.margin_augmented.real291],
  ];
  document.getElementById("corrected-output-margin-results").innerHTML = outputMarginRows
    .map(([evaluation, gate, metrics]) => `<tr><th scope="row">${escapeHtml(evaluation)}</th>
      <td>${escapeHtml(gate)}</td><td>${pct(metrics.correct_retention)}</td>
      <td>${pct(metrics.wrong_attribution_rejection)}</td>
      <td>${pct(metrics.false_attribution_rejection)}</td>
      <td>${decimal(metrics.overall_auroc)}</td></tr>`).join("");
  document.getElementById("corrected-output-margin-conclusion").textContent = outputMargin.conclusion;
  document.getElementById("corrected-output-margin-next").textContent = `Next: ${outputMargin.next_step}`;
  const mediasumAblation = semanticStudy.corrected_mediasum_ablation_study;
  document.getElementById("corrected-mediasum-ablation-status").textContent =
    `Status: ${mediasumAblation.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-mediasum-ablation-hypothesis").textContent =
    `Hypothesis: ${mediasumAblation.hypothesis}`;
  document.getElementById("corrected-mediasum-ablation-scope").textContent =
    "This is an explanatory source ablation, not a replacement gate. The development populations differ; Real291 at identical 90.7% correct retention is the common transfer comparison.";
  const ablationDevelopment = mediasumAblation.development;
  const ablationReal = mediasumAblation.real_common_retention;
  const mediasumAblationRows = [
    ["Non-Real grouped OOF · n=1,242", "All sources", ablationDevelopment.all_1242_reference],
    ["Non-Real grouped OOF · n=1,051", "Initial + Hard Synthetic only", ablationDevelopment.synthetic_only_ablation],
    ["Real291 · common 90.7% retention", "All sources", {correct_retention: ablationReal.correct_retention, ...ablationReal.all_1242_reference}],
    ["Real291 · common 90.7% retention", "Initial + Hard Synthetic only", {correct_retention: ablationReal.correct_retention, ...ablationReal.synthetic_only_ablation}],
  ];
  document.getElementById("corrected-mediasum-ablation-results").innerHTML = mediasumAblationRows
    .map(([evaluation, authority, metrics]) => `<tr><th scope="row">${escapeHtml(evaluation)}</th>
      <td>${escapeHtml(authority)}</td><td>${pct(metrics.correct_retention)}</td>
      <td>${pct(metrics.wrong_attribution_rejection)}</td>
      <td>${pct(metrics.false_attribution_rejection)}</td>
      <td>${decimal(metrics.overall_auroc)}</td></tr>`).join("");
  document.getElementById("corrected-mediasum-ablation-finding").textContent = mediasumAblation.finding;
  document.getElementById("corrected-mediasum-ablation-conclusion").textContent = mediasumAblation.conclusion;
  document.getElementById("corrected-mediasum-ablation-next").textContent = `Next: ${mediasumAblation.next_step}`;
  const layer21Write = semanticStudy.corrected_layer21_write_path_study;
  document.getElementById("corrected-layer21-write-status").textContent =
    `Status: ${layer21Write.status.replaceAll("_", " ")}.`;
  document.getElementById("corrected-layer21-write-hypothesis").textContent =
    `Hypothesis: ${layer21Write.hypothesis}`;
  document.getElementById("corrected-layer21-write-scope").textContent =
    `${layer21Write.protocol.training} Real291 is used only as frozen transfer evidence; the common comparison retains 107/118 correct attributions (90.7%).`;
  const layer21Labels = {
    pre_attention_norm: "Pre-attention norm",
    attention_output: "Attention output",
    post_attention_residual: "Post-attention residual",
    pre_mlp_norm: "Pre-MLP norm",
    block_delta: "Full block delta",
  };
  const layer21Rows = [
    ...layer21Write.non_real.map((metrics) => ["Non-Real grouped OOF", metrics]),
    ...layer21Write.real_common_retention.map((metrics) => ["Real291 · common 90.7% retention", metrics]),
  ];
  document.getElementById("corrected-layer21-write-results").innerHTML = layer21Rows
    .map(([evaluation, metrics]) => `<tr><th scope="row">${escapeHtml(evaluation)}</th>
      <td>${escapeHtml(layer21Labels[metrics.component] || metrics.component)}</td>
      <td>${pct(metrics.correct_retention)}</td>
      <td>${pct(metrics.wrong_attribution_rejection)}</td>
      <td>${pct(metrics.false_attribution_rejection)}</td>
      <td>${decimal(metrics.overall_auroc)}</td></tr>`).join("");
  document.getElementById("corrected-layer21-write-finding").textContent = layer21Write.finding;
  document.getElementById("corrected-layer21-write-interpretation").textContent = layer21Write.interpretation;
  document.getElementById("corrected-layer21-write-decision").textContent = `Decision: ${layer21Write.decision}`;
  document.getElementById("corrected-layer21-write-next").textContent = `Next: ${layer21Write.next_step}`;
  const attentionHeads = semanticStudy.corrected_attention_head_study;
  document.getElementById("corrected-attention-head-status").textContent =
    `Status: ${attentionHeads.status.replaceAll("_", " ")}. No activation extraction or probe fitting has started.`;
  document.getElementById("corrected-attention-head-observation").textContent =
    `Observation: ${attentionHeads.observation}`;
  document.getElementById("corrected-attention-head-hypothesis").textContent =
    `Hypothesis: ${attentionHeads.hypothesis}`;
  document.getElementById("corrected-attention-head-scope").textContent =
    `Scope: layer ${attentionHeads.scope.layer}, ${attentionHeads.scope.heads} query heads, immediate pre-answer token; ${attentionHeads.scope.training_proposals.toLocaleString()} non-Real development proposals and ${attentionHeads.scope.real_proposals} Real291 transfer proposals. Wrong and false rejection remain separate.`;
  document.getElementById("corrected-attention-head-results").innerHTML = attentionHeads.results
    ? attentionHeads.results.heads.map((row) => `<tr><th scope="row">${row.head}</th>
      <td>${pct(row.non_real_oof.correct_retention)}</td>
      <td>${pct(row.non_real_oof.wrong_attribution_rejection)}</td>
      <td>${pct(row.non_real_oof.false_attribution_rejection)}</td>
      <td>${pct(row.real_frozen_threshold.correct_retention)}</td>
      <td>${pct(row.real_frozen_threshold.wrong_attribution_rejection)}</td>
      <td>${pct(row.real_frozen_threshold.false_attribution_rejection)}</td></tr>`).join("")
    : '<tr><td colspan="7">Awaiting explicit activation-extraction and probe-training approval.</td></tr>';
  document.getElementById("corrected-attention-head-decision").textContent = attentionHeads.results
    ? attentionHeads.results.claim_scope
    : `Decision rule: ${attentionHeads.decision_rule.advance}`;
  document.getElementById("corrected-mediasum-mechanism-next").textContent = `Next hypothesis: ${mediasumMechanisms.next_hypothesis}`;
  document.getElementById("corrected-mediasum-mechanism-limitations").textContent = `Limitation: ${mediasumMechanisms.limitations}`;
  const fixedReference = semanticStudy.fixed_1242_reference;
  document.getElementById("fixed-1242-reference-status").textContent = fixedReference.status;
  document.getElementById("fixed-1242-reference-scope").textContent = fixedReference.scope;
  document.getElementById("fixed-1242-activation-coverage").textContent = fixedReference.activation_coverage;
  document.getElementById("fixed-1242-reference-protocol").textContent = fixedReference.protocol;
  document.getElementById("fixed-1242-corrected-reselection").textContent = fixedReference.corrected_reselection;
  const fixedPositionLabels = {
    prompt_end: "End of prompt",
    reasoning_last: "Last reasoning token",
    final_cue_pre_prediction: "':' ending FINAL: · pre-answer",
    generated_answer_token: "Generated answer token",
  };
  document.getElementById("fixed-1242-reference-results").innerHTML = fixedReference.runs.length
    ? fixedReference.runs.map((row) => `<tr><th scope="row">${escapeHtml(row.component)}</th>
      <td>${escapeHtml(fixedPositionLabels[row.position] || row.position)}</td>
      <td>${row.outcomes.correct}</td><td>${row.outcomes.wrong}</td><td>${row.outcomes.false_attribution}</td>
      <td>${semanticMetric(row.metrics, "correct_attribution_acceptance_tpr", true)}</td>
      <td>${semanticMetric(row.metrics, "wrong_attribution_rejection", true)}</td>
      <td>${semanticMetric(row.metrics, "false_attribution_rejection", true)}</td>
      <td>${semanticMetric(row.metrics, "auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_vs_wrong_auroc")}</td>
      <td>${semanticMetric(row.metrics, "correct_vs_false_attribution_auroc")}</td>
      <td>${row.selected_layers.join(", ")}</td></tr>`).join("")
    : `<tr><td colspan="12">Running</td></tr>`;
  const candidateStudy = semanticStudy.candidate_target_study;
  document.getElementById("semantic-candidate-status").textContent = candidateStudy.status;
  document.getElementById("semantic-candidate-capture").textContent = candidateStudy.capture;
  document.getElementById("semantic-candidate-scope").textContent = candidateStudy.scope;
  const candidateAnchorSelect = document.getElementById("semantic-candidate-anchor-select");
  candidateAnchorSelect.innerHTML = candidateStudy.anchors
    .map((row) => `<option value="${escapeHtml(row.anchor_id)}">${escapeHtml(row.anchor)}</option>`).join("");
  if (candidateStudy.anchors.some((row) => row.anchor_id === "selected_candidate_name_mean")) {
    candidateAnchorSelect.value = "selected_candidate_name_mean";
  }
  const renderCandidateRuns = () => {
    const rows = candidateStudy.runs.filter((row) => row.anchor_id === candidateAnchorSelect.value);
    document.getElementById("semantic-candidate-results").innerHTML = rows.length
      ? rows.map(semanticResultCells).join("")
      : `<tr><td colspan="10">In progress</td></tr>`;
  };
  candidateAnchorSelect.addEventListener("change", renderCandidateRuns);
  renderCandidateRuns();
  const semanticChartSelect = document.getElementById("semantic-reasoning-chart-run");
  const semanticChartMetric = document.getElementById("semantic-reasoning-chart-metric");
  const semanticCharts = [
    ...(denseLayerStudy ? [{
      id: "dense_post_attention_residual_attribution_relevant_mean_plus_pre_final_24_30",
      label: "Selected semantic representation · dense layers 24–30",
      layers: denseLayerStudy.layers.map((row) => ({
        layer: row.layer,
        macro_auroc: row.macro_subtype_auroc,
        auroc: row.overall_auroc,
        wrong_auroc: row.wrong_attribution_auroc,
        false_auroc: row.false_attribution_auroc,
      })),
    }] : []),
    ...answerStudy.charts,
    ...candidateStudy.charts,
    ...semanticStudy.fusion_charts,
    ...semanticTransitions.charts,
    ...componentFusions.charts,
    ...semanticStudy.individual_charts,
  ];
  semanticChartSelect.innerHTML = semanticCharts
    .map((run) => `<option value="${escapeHtml(run.id)}">${escapeHtml(run.label)}</option>`).join("");
  if (semanticCharts.some((run) => run.id === "fusion_post_attention_residual_attribution_relevant_mean_plus_pre_final")) {
    semanticChartSelect.value = denseLayerStudy
      ? "dense_post_attention_residual_attribution_relevant_mean_plus_pre_final_24_30"
      : "fusion_post_attention_residual_attribution_relevant_mean_plus_pre_final";
  }
  const renderSemanticChart = () => {
    const run = semanticCharts.find((item) => item.id === semanticChartSelect.value) || semanticCharts[0];
    if (!run) return;
    const field = semanticChartMetric.value;
    const labels = { macro_auroc: "Macro subtype AUROC", auroc: "Overall AUROC", wrong_auroc: "Wrong-attribution AUROC", false_auroc: "False-attribution AUROC" };
    const values = run.layers.map((row) => Number(row[field]));
    const bounds = { left: 54, right: 805, top: 26, bottom: 292 };
    const x = (index) => bounds.left + index * (bounds.right - bounds.left) / (run.layers.length - 1);
    const step = .1;
    const yMin = Math.max(0, Math.floor((Math.min(...values) - .04) / step) * step);
    const yMax = Math.min(1, Math.max(yMin + .2, Math.ceil((Math.max(...values) + .04) / step) * step));
    const y = (value) => bounds.bottom - ((Number(value) - yMin) / (yMax - yMin)) * (bounds.bottom - bounds.top);
    const ticks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, index) => yMin + index * step);
    const points = run.layers.map((row, index) => `${x(index)},${y(row[field])}`).join(" ");
    document.getElementById("semantic-reasoning-chart").innerHTML = `<svg viewBox="0 0 840 350" role="img" aria-label="${escapeHtml(labels[field])} by transformer layer for ${escapeHtml(run.label)}">
      ${ticks.map((tick) => `<line class="probe-grid" x1="${bounds.left}" y1="${y(tick)}" x2="${bounds.right}" y2="${y(tick)}"/><text class="probe-axis-label" x="45" y="${y(tick) + 4}" text-anchor="end">${Number(tick).toFixed(1)}</text>`).join("")}
      ${run.layers.map((row, index) => `<text class="probe-axis-label" x="${x(index)}" y="315" text-anchor="middle">${row.layer}</text>`).join("")}
      <polyline class="probe-line validation" points="${points}"/>
      ${run.layers.map((row, index) => `<circle class="probe-point validation" cx="${x(index)}" cy="${y(row[field])}" r="3.5"><title>Layer ${row.layer}: ${Number(row[field]).toFixed(3)}</title></circle>`).join("")}
      <text class="probe-axis-title" x="430" y="344" text-anchor="middle">Transformer layer</text>
      <text class="probe-axis-title" transform="translate(13 160) rotate(-90)" text-anchor="middle">${escapeHtml(labels[field])}</text>
    </svg>`;
  };
  semanticChartSelect.addEventListener("change", renderSemanticChart);
  semanticChartMetric.addEventListener("change", renderSemanticChart);
  renderSemanticChart();
  document.getElementById("corrected-semantic-positions").innerHTML = corrected.position_study.semantic_positions
    .map((row) => `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${escapeHtml(row.hypothesis)}</td><td>${escapeHtml(row.scope)}</td></tr>`)
    .join("");
  document.getElementById("corrected-position-scope").textContent = corrected.position_study.scope;
  const positionLabels = {
    prompt_end: "End of prompt",
    evidence_span_last: "Attribution-evidence span · last token",
    evidence_span_mean: "Attribution-evidence span · mean",
    evidence_span_max: "Attribution-evidence span · max",
    target_response_last: "Target-response span · last token",
    target_response_mean: "Target-response span · mean",
    target_response_max: "Target-response span · max",
    reasoning_25pct: "Reasoning 25%",
    reasoning_50pct: "Reasoning 50%",
    reasoning_75pct: "Reasoning 75%",
    reasoning_last: "Last reasoning token",
    final_cue_pre_prediction: "Immediate pre-answer state",
  };
  const metricOrDash = (value) => value === undefined ? "—" : Number(value).toFixed(3);
  document.getElementById("corrected-position-runs").innerHTML = corrected.position_study.runs
    .map((row) => `<tr>
      <th scope="row">${escapeHtml(row.component)}</th>
      <td>${escapeHtml(positionLabels[row.position] || row.position)}</td>
      <td>${escapeHtml(row.priority)}</td>
      <td>${escapeHtml(row.status)}</td>
      <td>${metricOrDash(row.auroc)}</td>
      <td>${metricOrDash(row.wrong_auroc)}</td>
      <td>${metricOrDash(row.false_auroc)}</td>
    </tr>`).join("");
  const correctedRunSelect = document.getElementById("corrected-position-run");
  const correctedMetricSelect = document.getElementById("corrected-position-metric");
  correctedRunSelect.innerHTML = corrected.position_study.completed_runs
    .map((run) => `<option value="${escapeHtml(run.id)}">${escapeHtml(run.label)}</option>`)
    .join("");
  const renderCorrectedPositionChart = () => {
    const run = corrected.position_study.completed_runs.find((item) => item.id === correctedRunSelect.value)
      || corrected.position_study.completed_runs[0];
    if (!run) {
      document.getElementById("corrected-position-chart").textContent = "No completed position experiment yet.";
      return;
    }
    const field = correctedMetricSelect.value;
    const labels = { auroc: "Overall AUROC", wrong_auroc: "Wrong-attribution AUROC", false_auroc: "False-attribution AUROC" };
    const values = run.layers.map((row) => Number(row[field]));
    const bounds = { left: 54, right: 805, top: 26, bottom: 292 };
    const x = (index) => bounds.left + index * (bounds.right - bounds.left) / (run.layers.length - 1);
    const step = .1;
    const yMin = Math.max(0, Math.floor((Math.min(...values) - .04) / step) * step);
    const yMax = Math.min(1, Math.max(yMin + .2, Math.ceil((Math.max(...values) + .04) / step) * step));
    const y = (value) => bounds.bottom - ((Number(value) - yMin) / (yMax - yMin)) * (bounds.bottom - bounds.top);
    const ticks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, index) => yMin + index * step);
    const points = run.layers.map((row, index) => `${x(index)},${y(row[field])}`).join(" ");
    document.getElementById("corrected-position-chart").innerHTML = `<svg viewBox="0 0 840 350" role="img" aria-label="${escapeHtml(labels[field])} by transformer layer for ${escapeHtml(run.label)}">
      ${ticks.map((tick) => `<line class="probe-grid" x1="${bounds.left}" y1="${y(tick)}" x2="${bounds.right}" y2="${y(tick)}"/><text class="probe-axis-label" x="45" y="${y(tick) + 4}" text-anchor="end">${Number(tick).toFixed(1)}</text>`).join("")}
      ${run.layers.map((row, index) => `<text class="probe-axis-label" x="${x(index)}" y="315" text-anchor="middle">${row.layer}</text>`).join("")}
      <polyline class="probe-line validation" points="${points}"/>
      ${run.layers.map((row, index) => `<circle class="probe-point validation" cx="${x(index)}" cy="${y(row[field])}" r="3.5"><title>Layer ${row.layer}: ${Number(row[field]).toFixed(3)}</title></circle>`).join("")}
      <text class="probe-axis-title" x="430" y="344" text-anchor="middle">Transformer layer</text>
      <text class="probe-axis-title" transform="translate(13 160) rotate(-90)" text-anchor="middle">${escapeHtml(labels[field])}</text>
    </svg>`;
  };
  correctedRunSelect.addEventListener("change", renderCorrectedPositionChart);
  correctedMetricSelect.addEventListener("change", renderCorrectedPositionChart);
  renderCorrectedPositionChart();
  const semanticTransferLabels = {
    evidence_span_mean: "Attribution-evidence span · mean",
    evidence_span_last: "Attribution-evidence span · last token",
    target_response_mean: "Target-response span · mean",
    target_response_last: "Target-response span · last token",
    initial_prompt_end: "End of prompt",
    initial_reasoning_last: "Last reasoning token",
    initial_final_cue_pre_prediction: "Immediate pre-answer state",
    evidence_last_plus_pre_final: "Evidence last + immediate pre-answer",
  };
  document.getElementById("corrected-semantic-transfer-runs").innerHTML =
    corrected.position_study.semantic_transfer_runs
      .map((row) => `<tr>
        <th scope="row">${escapeHtml(row.component)}</th>
        <td>${escapeHtml(semanticTransferLabels[row.position] || row.position)}</td>
        <td>${row.layer}</td>
        <td>${Number(row.synthetic.auroc).toFixed(3)}</td>
        <td>${Number(row.synthetic.correct_vs_wrong_auroc).toFixed(3)}</td>
        <td>${Number(row.synthetic.correct_vs_false_attribution_auroc).toFixed(3)}</td>
        <td>${Number(row.real.auroc).toFixed(3)}</td>
        <td>${Number(row.real.correct_vs_wrong_auroc).toFixed(3)}</td>
        <td>${Number(row.real.correct_vs_false_attribution_auroc).toFixed(3)}</td>
      </tr>`)
      .join("");
  const fusionTransfer = corrected.position_study.real_transfer;
  document.getElementById("corrected-fusion-transfer-selection").textContent =
    `${fusionTransfer.label}. ${fusionTransfer.selection}`;
  const transferMetricCell = (metrics, field, percent = false) => {
    if (metrics[field] === undefined) return "—";
    return percent ? pct(metrics[field]) : Number(metrics[field]).toFixed(3);
  };
  const transferRows = [
    {
      label: fusionTransfer.synthetic.dataset,
      n: fusionTransfer.synthetic.n,
      metrics: fusionTransfer.synthetic.metrics,
    },
    {
      label: fusionTransfer.real.dataset,
      n: fusionTransfer.real.n,
      metrics: fusionTransfer.real.metrics,
    },
    {
      label: "Real data · model output-probability baseline",
      n: fusionTransfer.real.n,
      metrics: fusionTransfer.output_probability_baseline,
    },
  ];
  document.getElementById("corrected-fusion-transfer-rows").innerHTML = transferRows
    .map((row) => `<tr>
      <th scope="row">${escapeHtml(row.label)}</th>
      <td>${row.n}</td>
      <td>${transferMetricCell(row.metrics, "auroc")}</td>
      <td>${transferMetricCell(row.metrics, "correct_vs_wrong_auroc")}</td>
      <td>${transferMetricCell(row.metrics, "correct_vs_false_attribution_auroc")}</td>
      <td>${transferMetricCell(row.metrics, "correct_attribution_acceptance_tpr", true)}</td>
      <td>${transferMetricCell(row.metrics, "wrong_attribution_rejection", true)}</td>
      <td>${transferMetricCell(row.metrics, "false_attribution_rejection", true)}</td>
    </tr>`)
    .join("");
  document.getElementById("corrected-fusion-transfer-conclusion").textContent =
    fusionTransfer.conclusion;
  const probe = coarseProbing.probe;
  document.getElementById("coarse-probe-input").innerHTML = probe.input
    .map((item) => `<dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd>`)
    .join("");
  document.getElementById("coarse-probe-results-summary").textContent = probe.summary;
  document.getElementById("coarse-probe-accuracy-definition").textContent = probe.accuracy_definition;
  document.getElementById("coarse-probe-chart-description").textContent = probe.chart_description;
  document.getElementById("coarse-probe-results-counts").innerHTML = probe.counts
    .map((row) => {
      const split = row.split === "validation"
        ? "Validation"
        : row.split[0].toUpperCase() + row.split.slice(1);
      return `<tr>
        <th scope="row">${escapeHtml(split)}</th>
        <td>${row.correct}</td>
        <td>${row.wrong}</td>
        <td>${row.false_attribution}</td>
        <td>${row.eligible}</td>
      </tr>`;
    })
    .join("");
  document.getElementById("coarse-probe-comparison-note").textContent = probe.comparison.note;
  document.getElementById("coarse-probe-best-layer-heading").textContent = `Best observed probe · layer ${probe.comparison.best_layer}`;
  document.getElementById("coarse-probe-comparison").innerHTML = probe.comparison.rows
    .map((row) => {
      const format = (value) => row.label === "AUROC" ? Number(value).toFixed(3) : pct(value);
      return `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${format(row.baseline)}</td><td>${format(row.best_probe)}</td></tr>`;
    })
    .join("");
  document.getElementById("coarse-probe-training").textContent = probe.training;
  document.getElementById("coarse-probe-threshold").textContent = probe.threshold;
  document.getElementById("coarse-probe-limitations").textContent = probe.limitations;
  const probeMetricSelect = document.getElementById("coarse-probe-metric");
  probeMetricSelect.innerHTML = probe.metrics
    .map((metric) => `<option value="${escapeHtml(metric.id)}">${escapeHtml(metric.label)}</option>`)
    .join("");
  const renderProbeChart = () => {
    const metric = probe.metrics.find((item) => item.id === probeMetricSelect.value) || probe.metrics[0];
    const bounds = { left: 54, right: 805, top: 26, bottom: 292 };
    const x = (index) => bounds.left + index * (bounds.right - bounds.left) / (probe.layers.length - 1);
    const series = [
      { id: "train", label: "Train" },
      { id: "validation", label: "Validation" },
      { id: "test", label: "Test" },
    ];
    const displayedValues = series.flatMap((item) =>
      probe.layers.map((layer) => Number(layer[item.id][metric.field]))
    );
    const rawMin = Math.min(...displayedValues);
    const rawMax = Math.max(...displayedValues);
    const rawRange = rawMax - rawMin;
    const tickStep = rawRange > .6 ? .2 : rawRange > .3 ? .1 : .05;
    let yMin = Math.max(0, Math.floor((rawMin - .02) / tickStep) * tickStep);
    let yMax = Math.min(1, Math.ceil((rawMax + .02) / tickStep) * tickStep);
    while (yMax - yMin < 4 * tickStep && (yMin > 0 || yMax < 1)) {
      if (yMin > 0) yMin = Math.max(0, yMin - tickStep);
      if (yMax < 1 && yMax - yMin < 4 * tickStep) yMax = Math.min(1, yMax + tickStep);
    }
    const yTicks = Array.from(
      { length: Math.round((yMax - yMin) / tickStep) + 1 },
      (_, index) => yMin + index * tickStep
    );
    const y = (value) => bounds.bottom
      - ((Number(value) - yMin) / (yMax - yMin)) * (bounds.bottom - bounds.top);
    const rangeLabel = `${Math.round(yMin * 100)}–${Math.round(yMax * 100)}%`;
    document.getElementById("coarse-probe-chart-title").textContent = `${metric.label} by layer · Focused y-axis: ${rangeLabel}`;
    document.getElementById("coarse-probe-chart").innerHTML = `<svg viewBox="0 0 840 350" role="img" aria-label="${escapeHtml(metric.label)} by transformer layer with focused y-axis ${rangeLabel}">
      ${yTicks.map((tick) => `<line class="probe-grid" x1="${bounds.left}" y1="${y(tick)}" x2="${bounds.right}" y2="${y(tick)}"/><text class="probe-axis-label" x="45" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>`).join("")}
      ${probe.layers.map((layer, index) => `<text class="probe-axis-label" x="${x(index)}" y="315" text-anchor="middle">${layer.layer}</text>`).join("")}
      ${series.map((item) => {
        const points = probe.layers.map((layer, index) => `${x(index)},${y(layer[item.id][metric.field])}`).join(" ");
        return `<polyline class="probe-line ${item.id}" points="${points}"/>${probe.layers.map((layer, index) => `<circle class="probe-point ${item.id}" cx="${x(index)}" cy="${y(layer[item.id][metric.field])}" r="3.5"><title>${item.label} · layer ${layer.layer}: ${pct(layer[item.id][metric.field])}</title></circle>`).join("")}`;
      }).join("")}
      <text class="probe-axis-title" x="430" y="344" text-anchor="middle">Transformer layer</text>
      <text class="probe-axis-title" transform="translate(13 160) rotate(-90)" text-anchor="middle">${escapeHtml(metric.label)}</text>
    </svg>`;
  };
  probeMetricSelect.addEventListener("change", renderProbeChart);
  renderProbeChart();

  const probe02 = coarseProbing.probe_experiment_02;
  document.getElementById("coarse-probe-02-input").innerHTML = probe02.input
    .map((item) => `<dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd>`)
    .join("");
  document.getElementById("coarse-probe-02-data-usage-note").textContent = probe02.data_usage.note;
  document.getElementById("coarse-probe-02-data-usage").innerHTML = probe02.data_usage.rows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.stage)}</th><td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.examples)}</td><td>${escapeHtml(row.use)}</td></tr>`)
    .join("");
  document.getElementById("coarse-probe-02-summary").textContent = probe02.summary;
  document.getElementById("coarse-probe-02-accuracy-definition").textContent = probe02.accuracy_definition;
  document.getElementById("coarse-probe-02-chart-description").textContent = probe02.chart_description;
  document.getElementById("coarse-probe-02-training").textContent = probe02.training;
  document.getElementById("coarse-probe-02-threshold").textContent = probe02.threshold;
  document.getElementById("coarse-probe-02-limitations").textContent = probe02.limitations;
  document.getElementById("coarse-probe-02-counts").innerHTML = probe02.counts
    .map((row) => `<tr>
      <th scope="row">${escapeHtml(row.split)}</th>
      <td>${row.correct}</td>
      <td>${row.wrong}</td>
      <td>${row.false_attribution}</td>
      <td>${row.eligible}</td>
    </tr>`)
    .join("");
  document.getElementById("coarse-probe-02-comparison-note").textContent = probe02.comparison.note;
  document.getElementById("coarse-probe-02-best-layer-heading").textContent = `Best observed probe · layer ${probe02.comparison.best_layer}`;
  document.getElementById("coarse-probe-02-comparison").innerHTML = probe02.comparison.rows
    .map((row) => {
      const format = (value) => row.label === "AUROC" ? Number(value).toFixed(3) : pct(value);
      return `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${format(row.baseline)}</td><td>${format(row.best_probe)}</td></tr>`;
    })
    .join("");
  const probe02MetricSelect = document.getElementById("coarse-probe-02-metric");
  probe02MetricSelect.innerHTML = probe02.metrics
    .map((metric) => `<option value="${escapeHtml(metric.id)}">${escapeHtml(metric.label)}</option>`)
    .join("");
  const renderProbe02Chart = () => {
    const metric = probe02.metrics.find((item) => item.id === probe02MetricSelect.value) || probe02.metrics[0];
    const bounds = { left: 54, right: 805, top: 26, bottom: 292 };
    const x = (index) => bounds.left + index * (bounds.right - bounds.left) / (probe02.layers.length - 1);
    const series = [
      { id: "train", label: "Outer-fold train mean" },
      { id: "validation", label: "Out-of-fold development" },
    ];
    const displayedValues = series.flatMap((item) =>
      probe02.layers.map((layer) => Number(layer[item.id][metric.field]))
    );
    const rawMin = Math.min(...displayedValues);
    const rawMax = Math.max(...displayedValues);
    const rawRange = rawMax - rawMin;
    const tickStep = rawRange > .6 ? .2 : rawRange > .3 ? .1 : .05;
    let yMin = Math.max(0, Math.floor((rawMin - .02) / tickStep) * tickStep);
    let yMax = Math.min(1, Math.ceil((rawMax + .02) / tickStep) * tickStep);
    while (yMax - yMin < 4 * tickStep && (yMin > 0 || yMax < 1)) {
      if (yMin > 0) yMin = Math.max(0, yMin - tickStep);
      if (yMax < 1 && yMax - yMin < 4 * tickStep) yMax = Math.min(1, yMax + tickStep);
    }
    const yTicks = Array.from(
      { length: Math.round((yMax - yMin) / tickStep) + 1 },
      (_, index) => yMin + index * tickStep
    );
    const y = (value) => bounds.bottom
      - ((Number(value) - yMin) / (yMax - yMin)) * (bounds.bottom - bounds.top);
    const rangeLabel = `${Math.round(yMin * 100)}–${Math.round(yMax * 100)}%`;
    document.getElementById("coarse-probe-02-chart-title").textContent = `${metric.label} by layer · Focused y-axis: ${rangeLabel}`;
    document.getElementById("coarse-probe-02-chart").innerHTML = `<svg viewBox="0 0 840 350" role="img" aria-label="${escapeHtml(metric.label)} by transformer layer">
      ${yTicks.map((tick) => `<line class="probe-grid" x1="${bounds.left}" y1="${y(tick)}" x2="${bounds.right}" y2="${y(tick)}"/><text class="probe-axis-label" x="45" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>`).join("")}
      ${probe02.layers.map((layer, index) => `<text class="probe-axis-label" x="${x(index)}" y="315" text-anchor="middle">${layer.layer}</text>`).join("")}
      ${series.map((item) => {
        const points = probe02.layers.map((layer, index) => `${x(index)},${y(layer[item.id][metric.field])}`).join(" ");
        return `<polyline class="probe-line ${item.id}" points="${points}"/>${probe02.layers.map((layer, index) => `<circle class="probe-point ${item.id}" cx="${x(index)}" cy="${y(layer[item.id][metric.field])}" r="3.5"><title>${item.label} · layer ${layer.layer}: ${pct(layer[item.id][metric.field])}</title></circle>`).join("")}`;
      }).join("")}
      <text class="probe-axis-title" x="430" y="344" text-anchor="middle">Transformer layer</text>
      <text class="probe-axis-title" transform="translate(13 160) rotate(-90)" text-anchor="middle">${escapeHtml(metric.label)}</text>
    </svg>`;
  };
  probe02MetricSelect.addEventListener("change", renderProbe02Chart);
  renderProbe02Chart();

  const probe03 = coarseProbing.probe_experiment_03;
  document.getElementById("coarse-probe-03-input").innerHTML = probe03.input
    .map((item) => `<dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd>`)
    .join("");
  document.getElementById("coarse-probe-03-data-usage-note").textContent = probe03.data_usage.note;
  document.getElementById("coarse-probe-03-data-usage").innerHTML = probe03.data_usage.rows
    .map((row) => `<tr><th scope="row">${escapeHtml(row.stage)}</th><td>${escapeHtml(row.data)}</td><td>${escapeHtml(row.examples)}</td><td>${escapeHtml(row.use)}</td></tr>`)
    .join("");
  document.getElementById("coarse-probe-03-counts").innerHTML = probe03.counts
    .map((row) => `<tr><th scope="row">${escapeHtml(row.source)}</th><td>${row.correct}</td><td>${row.wrong}</td><td>${row.false_attribution}</td><td>${row.eligible}</td></tr>`)
    .join("");
  document.getElementById("coarse-probe-03-folds").innerHTML = probe03.folds
    .map((row) => `<tr><th scope="row">${row.fold}</th><td>${row.train.correct} / ${row.train.wrong} / ${row.train.false_attribution} / ${row.train.total}</td><td>${row.validation.correct} / ${row.validation.wrong} / ${row.validation.false_attribution} / ${row.validation.total}</td></tr>`)
    .join("");
  document.getElementById("coarse-probe-03-comparison").innerHTML = probe03.comparison
    .map((row) => {
      const format = (value) => row.metric === "AUROC" ? Number(value).toFixed(3) : pct(value);
      const delta = row.metric === "AUROC"
        ? `${row.delta >= 0 ? "+" : ""}${Number(row.delta).toFixed(3)}`
        : `${row.delta >= 0 ? "+" : ""}${(100 * Number(row.delta)).toFixed(1)} pp`;
      return `<tr><th scope="row">${escapeHtml(row.evaluation)}</th><td>${escapeHtml(row.metric)}</td><td>${format(row.experiment_02)}</td><td>${format(row.experiment_03)}</td><td>${delta}</td></tr>`;
    })
    .join("");
  const probe03MetricSelect = document.getElementById("coarse-probe-03-metric");
  const probe03MetricLabels = {
    accuracy: "Gate accuracy",
    auroc: "AUROC",
    correct_attribution_acceptance_tpr: "Correct-attribution acceptance",
    wrong_attribution_rejection: "Wrong-attribution rejection",
    false_attribution_rejection: "False-attribution rejection",
  };
  const renderProbe03LayerChart = () => {
    const field = probe03MetricSelect.value;
    const label = probe03MetricLabels[field];
    const bounds = { left: 54, right: 805, top: 26, bottom: 292 };
    const x = (index) => bounds.left + index * (bounds.right - bounds.left) / (probe03.layers.length - 1);
    const series = [
      { id: "experiment-02", label: "Experiment 02 · Synthetic OOF", field: "experiment_02_synthetic" },
      { id: "experiment-03", label: "Experiment 03 · Synthetic OOF", field: "experiment_03_synthetic" },
      { id: "experiment-03-real", label: "Experiment 03 · Real data", field: "experiment_03_real" },
    ];
    const values = series.flatMap((item) => probe03.layers.map((layer) => Number(layer[item.field][field])));
    const step = .1;
    const yMin = Math.max(0, Math.floor((Math.min(...values) - .04) / step) * step);
    const yMax = Math.min(1, Math.ceil((Math.max(...values) + .04) / step) * step);
    const y = (value) => bounds.bottom - ((Number(value) - yMin) / (yMax - yMin)) * (bounds.bottom - bounds.top);
    const ticks = Array.from({ length: Math.round((yMax - yMin) / step) + 1 }, (_, index) => yMin + index * step);
    document.getElementById("coarse-probe-03-layer-chart").innerHTML = `<svg viewBox="0 0 840 350" role="img" aria-label="${escapeHtml(label)} across transformer layers">
      ${ticks.map((tick) => `<line class="probe-grid" x1="${bounds.left}" y1="${y(tick)}" x2="${bounds.right}" y2="${y(tick)}"/><text class="probe-axis-label" x="45" y="${y(tick) + 4}" text-anchor="end">${Math.round(tick * 100)}%</text>`).join("")}
      ${probe03.layers.map((layer, index) => `<text class="probe-axis-label" x="${x(index)}" y="315" text-anchor="middle">${layer.layer}</text>`).join("")}
      ${series.map((item) => {
        const points = probe03.layers.map((layer, index) => `${x(index)},${y(layer[item.field][field])}`).join(" ");
        return `<polyline class="probe-line ${item.id}" points="${points}"/>${probe03.layers.map((layer, index) => `<circle class="probe-point ${item.id}" cx="${x(index)}" cy="${y(layer[item.field][field])}" r="3.5"><title>${item.label} · layer ${layer.layer}: ${pct(layer[item.field][field])}</title></circle>`).join("")}`;
      }).join("")}
      <text class="probe-axis-title" x="430" y="344" text-anchor="middle">Transformer layer</text>
      <text class="probe-axis-title" transform="translate(13 160) rotate(-90)" text-anchor="middle">${escapeHtml(label)}</text>
    </svg>`;
  };
  probe03MetricSelect.addEventListener("change", renderProbe03LayerChart);
  renderProbe03LayerChart();
  document.getElementById("coarse-probe-03-summary").textContent = probe03.summary;
  document.getElementById("coarse-probe-03-conclusion").textContent = probe03.conclusion;

  const realTransfer = coarseProbing.real_transfer;
  document.getElementById("coarse-probe-real-input").innerHTML = realTransfer.input
    .map((item) => `<dt>${escapeHtml(item.label)}</dt><dd>${escapeHtml(item.value)}</dd>`)
    .join("");
  document.getElementById("coarse-probe-real-note").textContent = realTransfer.note;
  document.getElementById("coarse-probe-real-results").innerHTML = realTransfer.rows
    .map((row) => {
      const format = (value) => row.label === "AUROC" ? Number(value).toFixed(3) : pct(value);
      const interval = `${format(row.gate_interval.lower_95pct)}–${format(row.gate_interval.upper_95pct)}`;
      return `<tr><th scope="row">${escapeHtml(row.label)}</th><td>${format(row.baseline)}</td><td>${format(row.gate)}</td><td>${interval}</td></tr>`;
    })
    .join("");
  document.getElementById("coarse-probe-real-conclusion").textContent = realTransfer.conclusion;

  const factorData = data.factor_effects;
  const factorResearch = factorData.analysis;
  document.getElementById("factor-effects-summary").textContent = factorResearch.headline;
  document.getElementById("factor-shared-conditions").innerHTML = factorResearch.shared_conditions
    .map((condition) => `<span>${escapeHtml(condition)}</span>`).join("");
  document.getElementById("factor-variable-map").innerHTML = factorResearch.variables
    .map((variable) => `<li><strong>${escapeHtml(variable.label)}:</strong> ${escapeHtml(variable.values)}</li>`).join("");
  document.getElementById("factor-robustness-note").textContent = factorResearch.robustness_check;
  const factorViews = [
    { id: "final_cue", title: "Final decision cue", baselineLabel: "Require one unambiguous identity", variantLabel: "Choose the best-supported identity", metric: "unknown", metricLabel: "Missed-attribution rate", takeaway: "The model committed more often in all three comparisons. Later paired tests confirmed the cost: false attribution rose by 22 points on Real data and 24 points on the initial synthetic data." },
    { id: "distractor_windows", title: "Distractor-rich window selection", baselineLabel: "Ordinary valid window", variantLabel: "Same length, more other-name mentions", metric: "unknown", metricLabel: "Missed-attribution rate", takeaway: "The model committed more often in all three comparisons. Most additional decisions were correct; the wrong-attribution change was inconsistent." },
    { id: "participant_scope", title: "Candidate-set size", baselineLabel: "Only identified speakers who spoke", variantLabel: "Full supplied meeting roster", metric: "correct", metricLabel: "Correct-attribution rate", takeaway: "More candidate identities reduced correct attribution in both comparisons. The initial synthetic corpus cannot test this factor because its supplied and speaking rosters are identical." },
    { id: "candidate_placement", title: "Participant-list position", baselineLabel: "List before transcript", variantLabel: "List after transcript", metric: "wrong", metricLabel: "Wrong-attribution rate", takeaway: "Moving the same list after the transcript increased wrong attribution in both comparisons." },
    { id: "reasoning_budget", title: "Reasoning budget", baselineLabel: "Lower token allowance", variantLabel: "Higher token allowance", metric: "unknown", metricLabel: "Missed-attribution rate", takeaway: "The effect was weak: one comparison changed and one was effectively unchanged." },
    { id: "sampling_policy", title: "Sampling entropy and seed", baselineLabel: "Original sampling", variantLabel: "Entropy or seed changed", metric: "near_90_fpr", metricLabel: "FPR near 90% TPR", takeaway: "Behavioral accuracy barely moved, but probability separation changed substantially." },
  ];
  const visibleFactorIds = new Set(["final_cue", "distractor_windows", "participant_scope"]);
  const visibleFactorViews = factorViews.filter((view) => visibleFactorIds.has(view.id));
  const factorById = Object.fromEntries(factorData.factors.map((factor) => [factor.id, factor]));
  const pairColors = ["#176b55", "#315f87", "#b05d5b"];
  const signedPp = (value) => `${Number(value) > 0 ? "+" : ""}${Number(value).toFixed(1)} pp`;
  const factorMetricValue = (comparison, arm, metric) => {
    if (["correct", "wrong", "unknown"].includes(metric)) return Number(comparison[arm][metric]);
    if (metric === "near_90_fpr") return Number(comparison.probability[arm].near_90_tpr.fpr);
    if (metric === "auroc") return Number(comparison.probability[arm].auroc);
    throw new Error(`Unsupported factor metric: ${metric}`);
  };
  const averageFactorMetric = (factor, arm, metric) => factor.comparisons.reduce(
    (sum, comparison) => sum + factorMetricValue(comparison, arm, metric), 0
  ) / factor.comparisons.length;
  const metricBarSvg = (factor, view) => {
    const groups = factor.comparisons.map((comparison) => ({
      label: `S${comparison.baseline_setup}→${comparison.variant_setup}`,
      baseline: factorMetricValue(comparison, "baseline", view.metric),
      variant: factorMetricValue(comparison, "variant", view.metric),
    }));
    groups.push({
      label: "Average",
      baseline: averageFactorMetric(factor, "baseline", view.metric),
      variant: averageFactorMetric(factor, "variant", view.metric),
      average: true,
    });
    const plot = { left: 42, right: 405, top: 18, bottom: 214 };
    const observedMax = Math.max(...groups.flatMap((group) => [group.baseline, group.variant]));
    const yMax = Math.min(1, Math.max(.2, Math.ceil((observedMax + .05) * 10) / 10));
    const y = (value) => plot.bottom - Number(value) / yMax * (plot.bottom - plot.top);
    const yTicks = [0, .25, .5, .75, 1].map((position) => position * yMax);
    const groupWidth = (plot.right - plot.left) / groups.length;
    const barWidth = Math.min(24, groupWidth * 0.28);
    return `<svg viewBox="0 0 430 255" role="img" aria-label="${escapeHtml(view.metricLabel)} before and after factor change">
      ${yTicks.map((tick) => `<line class="factor-metric-grid" x1="${plot.left}" y1="${y(tick)}" x2="${plot.right}" y2="${y(tick)}"/><text class="factor-metric-tick" x="35" y="${y(tick) + 4}" text-anchor="end">${Math.round(100 * tick)}%</text>`).join("")}
      ${groups.map((group, index) => {
        const center = plot.left + groupWidth * (index + .5);
        const baselineHeight = plot.bottom - y(group.baseline);
        const variantHeight = plot.bottom - y(group.variant);
        return `<rect class="factor-metric-bar baseline ${group.average ? "average" : ""}" x="${center - barWidth - 2}" y="${y(group.baseline)}" width="${barWidth}" height="${baselineHeight}"><title>Before: ${pct(group.baseline)}</title></rect>
          <rect class="factor-metric-bar variant ${group.average ? "average" : ""}" x="${center + 2}" y="${y(group.variant)}" width="${barWidth}" height="${variantHeight}"><title>After: ${pct(group.variant)}</title></rect>
          <text class="factor-metric-value" x="${center - barWidth / 2 - 2}" y="${Math.max(12, y(group.baseline) - 5)}" text-anchor="middle">${Math.round(100 * group.baseline)}%</text>
          <text class="factor-metric-value" x="${center + barWidth / 2 + 2}" y="${Math.max(12, y(group.variant) - 5)}" text-anchor="middle">${Math.round(100 * group.variant)}%</text>
          <text class="factor-metric-group" x="${center}" y="235" text-anchor="middle">${group.label}</text>`;
      }).join("")}
      <text class="factor-metric-axis" transform="translate(10 118) rotate(-90)" text-anchor="middle">${escapeHtml(view.metricLabel)}</text>
    </svg>`;
  };
  const rocSvg = (factor) => {
    const plot = { left: 42, right: 306, top: 22, bottom: 228 };
    const x = (value) => plot.left + Number(value) * (plot.right - plot.left);
    const y = (value) => plot.bottom - Number(value) * (plot.bottom - plot.top);
    const path = (points) => points.map((point, index) => `${index ? "L" : "M"}${x(point.tpr).toFixed(1)},${y(point.fpr).toFixed(1)}`).join(" ");
    const meanBaselineAuc = averageFactorMetric(factor, "baseline", "auroc");
    const meanVariantAuc = averageFactorMetric(factor, "variant", "auroc");
    const improvedPairs = factor.comparisons.filter(
      (comparison) => comparison.probability.variant.auroc > comparison.probability.baseline.auroc
    ).length;
    return `<svg viewBox="0 0 470 270" role="img" aria-label="Matched TPR-FPR curves">
      ${[0, .5, 1].map((tick) => `<line class="factor-roc-grid" x1="${x(tick)}" y1="${plot.top}" x2="${x(tick)}" y2="${plot.bottom}"/><line class="factor-roc-grid" x1="${plot.left}" y1="${y(tick)}" x2="${plot.right}" y2="${y(tick)}"/><text class="factor-roc-tick" x="${x(tick)}" y="246" text-anchor="middle">${tick.toFixed(1)}</text><text class="factor-roc-tick" x="34" y="${y(tick) + 4}" text-anchor="end">${tick.toFixed(1)}</text>`).join("")}
      <line class="factor-roc-chance" x1="${x(0)}" y1="${y(0)}" x2="${x(1)}" y2="${y(1)}"/>
      ${factor.comparisons.map((comparison, index) => {
        const color = pairColors[index];
        const baseline = comparison.probability.baseline;
        const variant = comparison.probability.variant;
        return `<path class="factor-roc-line baseline" style="--pair-color:${color}" d="${path(baseline.roc_points)}"><title>Setup ${comparison.baseline_setup} · AUROC ${decimal(baseline.auroc)}</title></path>
          <path class="factor-roc-line variant" style="--pair-color:${color}" d="${path(variant.roc_points)}"><title>Setup ${comparison.variant_setup} · AUROC ${decimal(variant.auroc)}</title></path>
          <circle class="factor-roc-operating baseline" style="--pair-color:${color}" cx="${x(baseline.near_90_tpr.tpr)}" cy="${y(baseline.near_90_tpr.fpr)}" r="3"/>
          <circle class="factor-roc-operating variant" style="--pair-color:${color}" cx="${x(variant.near_90_tpr.tpr)}" cy="${y(variant.near_90_tpr.fpr)}" r="3"/>
          <rect x="330" y="${43 + index * 30}" width="9" height="9" rx="2" fill="${color}"/><text class="factor-roc-pair-label" x="345" y="${51 + index * 30}">${comparison.comparison_label ? escapeHtml(comparison.comparison_label) + " · " : ""}S${comparison.baseline_setup}→${comparison.variant_setup}</text>`;
      }).join("")}
      <line class="factor-roc-legend-line baseline" x1="330" y1="150" x2="352" y2="150"/><text class="factor-roc-legend-text" x="358" y="154">Baseline</text>
      <line class="factor-roc-legend-line variant" x1="330" y1="170" x2="352" y2="170"/><text class="factor-roc-legend-text" x="358" y="174">Changed</text>
      <text class="factor-roc-auc" x="330" y="203">Mean AUROC · higher better</text><text class="factor-roc-auc-value" x="330" y="220">${decimal(meanBaselineAuc)} → ${decimal(meanVariantAuc)}</text>
      <text class="factor-roc-consistency" x="330" y="239">Improved in ${improvedPairs}/${factor.comparisons.length} pairs</text>
      <text class="factor-roc-axis" x="${(plot.left + plot.right) / 2}" y="266" text-anchor="middle">TPR</text><text class="factor-roc-axis" transform="translate(10 125) rotate(-90)" text-anchor="middle">FPR</text>
    </svg>`;
  };
  document.getElementById("factor-analysis-panels").innerHTML = visibleFactorViews.map((view) => {
    const factor = factorById[view.id];
    const baselineMean = averageFactorMetric(factor, "baseline", view.metric);
    const variantMean = averageFactorMetric(factor, "variant", view.metric);
    const delta = 100 * (variantMean - baselineMean);
    const direction = Math.sign(delta);
    const consistent = factor.comparisons.filter((comparison) => Math.sign(
      factorMetricValue(comparison, "variant", view.metric) - factorMetricValue(comparison, "baseline", view.metric)
    ) === direction).length;
    return `<section class="factor-analysis-panel">
      <header><h3>${escapeHtml(view.title)}</h3><span>${factor.comparisons.length} matched pairs</span></header>
      <div class="factor-change-direction"><span>${escapeHtml(view.baselineLabel)}</span><b aria-hidden="true">→</b><span>${escapeHtml(view.variantLabel)}</span></div>
      <p class="factor-takeaway">${escapeHtml(view.takeaway)}</p>
      <div class="factor-analysis-grid single">
        <figure class="factor-chart-card"><h4><span>${escapeHtml(view.metricLabel)}</span><span class="factor-bar-legend"><i class="without"></i>Before <i class="with"></i>After</span></h4>${metricBarSvg(factor, view)}<figcaption><strong>${pct(baselineMean)} → ${pct(variantMean)} (${signedPp(delta)})</strong><span>${consistent}/${factor.comparisons.length} comparisons moved in the same direction</span></figcaption></figure>
      </div>
    </section>`;
  }).join("");

  const traceSummary = factorData.trace_summary;
  const correctTotal = Number(traceSummary.outcomes.correct);
  const correctSupported = Number(traceSummary.correct_trace_supported);
  const wrongTotal = Number(traceSummary.outcomes.wrong);
  const wrongBars = traceSummary.wrong_patterns.map((pattern) => {
    const share = Number(pattern.count) / wrongTotal;
    return `<div class="factor-pattern-row">
      <div><span>${escapeHtml(pattern.label)}</span><strong>${pattern.count} · ${pct(share)}</strong></div>
      <div class="factor-pattern-track"><i style="width:${(100 * share).toFixed(1)}%"></i></div>
    </div>`;
  }).join("");
  const boundaryRows = traceSummary.no_evidence_boundary.map((row) => {
    const setupLabel = `Setup ${String(row.setup_id).split("_")[1]}`;
    return `<div class="factor-boundary-row"><strong>${escapeHtml(setupLabel)}</strong><span>${row.forced_boundary}/${row.false_attributions} false attributions followed forced finalization</span></div>`;
  }).join("");
  document.getElementById("factor-trace-summary").innerHTML = `
    <article>
      <span class="factor-trace-label">When correct</span>
      <strong class="factor-trace-number">${correctSupported}/${correctTotal}</strong>
      <p>Correct outputs were supported by a valid identity clue in the reasoning trace.</p>
      <small>Typical chain: named address → target response → candidate mapping.</small>
    </article>
    <article class="factor-wrong-patterns">
      <span class="factor-trace-label">When wrong · ${wrongTotal} outcomes</span>
      ${wrongBars}
    </article>
    <article>
      <span class="factor-trace-label">When evidence is absent</span>
      ${boundaryRows}
      <p>The output is still wrong end-to-end, but usually not a naturally completed semantic conclusion.</p>
    </article>`;
  document.getElementById("factor-trace-note").textContent = traceSummary.independence_note;
  document.getElementById("factor-research-lessons").innerHTML = factorResearch.lessons
    .map((lesson) => `<article><strong>${escapeHtml(lesson.title)}</strong><p>${escapeHtml(lesson.text)}</p></article>`).join("");
  document.getElementById("factor-limitations").textContent = factorResearch.limitations;

  const weekly = data.weekly_report;
  document.getElementById("weekly-task-overview").innerHTML = `
    <ul>
      <li><strong>Task:</strong> map one anonymous Speaker N to a meeting participant, or output UNKNOWN.</li>
      <li><strong>Input:</strong> human transcript, participant list, and one target speaker.</li>
      <li><strong>Model:</strong> pinned Qwen3-8B with native reasoning.</li>
      <li><strong>Data:</strong> matched evidence-present and no-evidence examples.</li>
    </ul>
    <h4>Difference from NER</h4>
    <ul>
      <li><strong>Reasoning vs Instruct:</strong> NER produced a direct, single-token answer. Attribution includes variable-length reasoning, so the decision may develop across several generated tokens and requires a different mechanistic analysis.</li>
      <li><strong>Counterfactual pairs:</strong> NER had a natural clean/corrupted pair created by corrupting one name. Attribution has no obvious “corruption”, so we must separately design contrasts for correctness decision.</li>
    </ul>
  `;

  const weeklyGoals = [
    ["Attribution required (evidence)", "Correct-attribution rate ≥30% · Wrong-attribution rate ≥30% · Missed-attribution rate ≤40%"],
    ["Weak probability baseline", "Gate AUROC <0.8 · Gate FPR ≥70–80% near 90% TPR"],
    ["No attribution required (no evidence)", "False-attribution rate 20–30% · Correct-rejection rate 70–80%"],
    ["Data sufficiency", "Enough counterfactual pairs and correct/wrong proposals for causal and gate analysis"],
  ];
  document.getElementById("weekly-goals").innerHTML = `<ul>${weeklyGoals.map(([title, text]) => `
    <li><strong>${escapeHtml(title)}:</strong> ${escapeHtml(text)}</li>
  `).join("")}</ul>`;

  const weeklyFactorStories = [
    {
      view: factorViews.find((view) => view.id === "distractor_windows"),
      description: "At each tested chunk size, replace an ordinary valid window with a same-length window containing more natural mentions of other participants.",
      effect: "The model made more decisions: missed attribution fell 63.3% → 44.0%, with nearly all additional decisions correct. Confidence separation improved in 3/3 pairs (AUROC 0.425 → 0.740).",
      showRoc: true,
    },
    {
      view: factorViews.find((view) => view.id === "participant_scope"),
      description: "Candidates are either only identified participants who spoke, or everyone listed for the meeting.",
      effect: "The full meeting list made attribution harder: correct attribution fell 45.0% → 26.0% in 2/2 matched comparisons.",
      showRoc: false,
    },
    {
      view: factorViews.find((view) => view.id === "candidate_placement"),
      description: "Keep the participant list unchanged, but move it from before the transcript to after it.",
      effect: "Placing the list after the transcript increased wrong-ID from 34.0% → 39.0% in 2/2 matched comparisons.",
      showRoc: false,
    },
  ];
  document.getElementById("weekly-factor-stories").innerHTML = weeklyFactorStories.map((story) => {
    const factor = factorById[story.view.id];
    return `<article class="weekly-factor-story">
      <h4>${escapeHtml(story.view.title)}</h4>
      <p><strong>Factor.</strong> ${escapeHtml(story.description)}</p>
      <p><strong>Effect.</strong> ${escapeHtml(story.effect)}</p>
      <div class="weekly-factor-plots ${story.showRoc ? "" : "single"}">
        <figure class="factor-chart-card"><h5>${escapeHtml(story.view.metricLabel)}</h5>${metricBarSvg(factor, story.view)}</figure>
        ${story.showRoc ? `<figure class="factor-chart-card"><h5>TPR–FPR · UNKNOWN excluded</h5>${rocSvg(factor)}</figure>` : ""}
      </div>
    </article>`;
  }).join("");

  const confidence = weekly.confidence;
  document.getElementById("weekly-deep-dive").innerHTML = `
    <div class="weekly-deep-dive-plots">
      <figure><img src="${escapeHtml(confidence.plot)}" alt="Setup 31 correct and wrong output-confidence distributions"></figure>
      <figure><img src="${escapeHtml(confidence.tpr_fpr_plot)}" alt="Setup 31 TPR-FPR curve"></figure>
    </div>
    <p>Probabilities overlap: FPR near 90% TPR is <strong>${pct(confidence.near_90_fpr)}</strong> versus <strong>55.6%</strong> for NER.</p>
  `;

  const reasoningDisplay = [
    {
      kind: "correct",
      transcript: ["Other speaker: ‘Sunny, are you here?’", "Target speaker: ‘Yes, I’m here.’"],
      summary: "Tracks who was addressed and who responded, then identifies Sunny.",
      final: "Sunny · correct",
    },
    {
      kind: "wrong",
      transcript: ["Other speaker: ‘David, do you have any idea?’", "Target speaker: ‘No, I don’t know … Perin.’"],
      summary: "Finds that David was addressed, but switches to Perin because the target mentions that name.",
      final: "Perin · wrong (ground truth David)",
    },
  ];
  document.getElementById("weekly-reasoning-examples").innerHTML = reasoningDisplay.map((example) => `
      <article class="weekly-reasoning-card ${escapeHtml(example.kind)}">
        <div class="reasoning-card-heading">
          <span>${example.kind === "correct" ? "Correct reasoning" : "Wrong reasoning"}</span>
        </div>
        <div class="reasoning-transcript">
          ${example.transcript.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
        </div>
        <p class="weekly-reasoning-summary">${escapeHtml(example.summary)}</p>
        <strong class="reasoning-final">Final: ${escapeHtml(example.final)}</strong>
      </article>
    `).join("");

  const current = weekly.current_stage;
  document.getElementById("weekly-counterfactual").innerHTML = `
    <p>Each of 291 evidence examples has a minimally edited, token-aligned GT=UNKNOWN twin. The window, target, participant order, and non-evidence token positions stay fixed.</p>
    <div class="weekly-pair-example">
      <div><span>Evidence</span><strong>${escapeHtml(current.pair_example.evidence)}</strong></div>
      <div><span>No evidence</span><strong>${escapeHtml(current.pair_example.no_evidence)}</strong></div>
    </div>
    <p><strong>Next:</strong> use the completed initial synthetic baseline and evaluate Setup 20 separately on the new hard synthetic cohort before returning to gate training.</p>
  `;

  const tabMenus = [
    {
      menu: document.getElementById("behavioral-analysis-menu"),
      button: document.getElementById("behavioral-analysis-menu-button"),
      tabIds: new Set(["all-setups", "chosen-setups", "factor-effects"]),
    },
    {
      menu: document.getElementById("weekly-walkthrough-menu"),
      button: document.getElementById("weekly-walkthrough-menu-button"),
      tabIds: new Set(["weekly-report", "weekly-report-aug-16-20"]),
    },
  ];
  const weeklyTabIds = tabMenus[1].tabIds;
  const closeTabMenu = ({ menu, button }) => {
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };
  const closeTabMenus = () => tabMenus.forEach(closeTabMenu);

  const selectTab = (tabId) => {
    const selected = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (!selected) return;
    document.body.classList.toggle("weekly-view", weeklyTabIds.has(tabId));
    document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== tabId;
      panel.classList.toggle("active", panel.id === tabId);
    });
    selected.classList.add("active");
    tabMenus.forEach(({ button, tabIds }) => {
      button.classList.toggle("active", tabIds.has(tabId));
    });
  };

  tabMenus.forEach((tabMenu) => {
    tabMenu.button.addEventListener("click", () => {
      const willOpen = tabMenu.menu.hidden;
      closeTabMenus();
      tabMenu.menu.hidden = !willOpen;
      tabMenu.button.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        (tabMenu.menu.querySelector(".tab-button.active") || tabMenu.menu.querySelector(".tab-button"))?.focus();
      }
    });
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectTab(button.dataset.tab);
      window.history.replaceState(null, "", `#${button.dataset.tab}`);
      closeTabMenus();
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".tab-menu")) closeTabMenus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openMenu = tabMenus.find(({ menu }) => !menu.hidden);
    if (!openMenu) return;
    closeTabMenu(openMenu);
    openMenu.button.focus();
  });
  const initialAnchor = window.location.hash.slice(1);
  selectTab(initialAnchor === "paired-results" || initialAnchor === "evidence-results"
    ? "all-setups"
    : initialAnchor || "task-data");
})();

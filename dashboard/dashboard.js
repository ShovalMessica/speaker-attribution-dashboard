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
    const count = scheduled
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
  const pairedSetupRows = (rows, { showCounts = false, showConclusions = true } = {}) => rows.map((row) => `
    <tr class="paired-group-start">
      <td rowspan="2"><strong>Setup ${row.setup_number}</strong></td>
      ${pairedDatasetCell("Real data", "real-data", row.real, showCounts, row.progress?.real)}
      ${pairedMetricCells(row.real, row.progress?.real)}
      <td rowspan="2" class="definition-cell">${setupDetails(
        row,
        showConclusions ? row.conclusion : null,
        showConclusions ? row.status : null,
        true
      )}</td>
    </tr>
    <tr>
      ${pairedDatasetCell("Synthetic data", "synthetic-data", row.synthetic, showCounts, row.progress?.synthetic)}
      ${pairedMetricCells(row.synthetic, row.progress?.synthetic)}
    </tr>
  `).join("");
  document.getElementById("paired-shared-settings").innerHTML = `
    <strong>Shared settings</strong>
    ${data.paired_shared_settings.map((setting) => `<span><b>${escapeHtml(setting.label)}:</b> ${escapeHtml(setting.value)}</span>`).join("")}`;
  document.querySelector("#paired-setup-table tbody").innerHTML = pairedSetupRows(data.cross_domain_results);
  document.querySelector("#full-data-table tbody").innerHTML = pairedSetupRows(
    data.full_data_results,
    { showCounts: true, showConclusions: false }
  );

  const coarseProbing = data.coarse_grained_probing;
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
  document.getElementById("coarse-split-note").textContent = coarseProbing.split.note;

  const factorData = data.factor_effects;
  const factorResearch = factorData.analysis;
  document.getElementById("factor-effects-summary").textContent = factorResearch.headline;
  document.getElementById("factor-shared-conditions").innerHTML = factorResearch.shared_conditions
    .map((condition) => `<span>${escapeHtml(condition)}</span>`).join("");
  document.getElementById("factor-variable-map").innerHTML = factorResearch.variables
    .map((variable) => `<li><strong>${escapeHtml(variable.label)}:</strong> ${escapeHtml(variable.values)}</li>`).join("");
  document.getElementById("factor-robustness-note").textContent = factorResearch.robustness_check;
  const factorViews = [
    { id: "final_cue", title: "Final decision cue", baselineLabel: "Require one unambiguous identity", variantLabel: "Choose the best-supported identity", metric: "unknown", metricLabel: "Missed-attribution rate", takeaway: "The model committed more often in all three comparisons. Later paired tests confirmed the cost: false attribution rose by 22 points on Real data and 24 points on Synthetic data." },
    { id: "distractor_windows", title: "Distractor-rich window selection", baselineLabel: "Ordinary valid window", variantLabel: "Same length, more other-name mentions", metric: "unknown", metricLabel: "Missed-attribution rate", takeaway: "The model committed more often in all three comparisons. Most additional decisions were correct; the wrong-attribution change was inconsistent." },
    { id: "participant_scope", title: "Candidate-set size", baselineLabel: "Only identified speakers who spoke", variantLabel: "Full supplied meeting roster", metric: "correct", metricLabel: "Correct-attribution rate", takeaway: "More candidate identities reduced correct attribution in both comparisons. The synthetic corpus cannot test this factor because its supplied and speaking rosters are identical." },
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
    <p><strong>Next:</strong> finish Setup 20 on the full synthetic dataset, freeze the modeling splits, then begin gate and circuit work.</p>
  `;

  const behavioralMenu = document.getElementById("behavioral-analysis-menu");
  const behavioralMenuButton = document.getElementById("behavioral-analysis-menu-button");
  const behavioralTabIds = new Set(["all-setups", "chosen-setups", "factor-effects"]);
  const closeBehavioralMenu = () => {
    behavioralMenu.hidden = true;
    behavioralMenuButton.setAttribute("aria-expanded", "false");
  };

  const selectTab = (tabId) => {
    const selected = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (!selected) return;
    document.body.classList.toggle("weekly-view", tabId === "weekly-report");
    document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.hidden = panel.id !== tabId;
      panel.classList.toggle("active", panel.id === tabId);
    });
    selected.classList.add("active");
    behavioralMenuButton.classList.toggle("active", behavioralTabIds.has(tabId));
  };

  behavioralMenuButton.addEventListener("click", () => {
    const willOpen = behavioralMenu.hidden;
    behavioralMenu.hidden = !willOpen;
    behavioralMenuButton.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) {
      (behavioralMenu.querySelector(".tab-button.active") || behavioralMenu.querySelector(".tab-button"))?.focus();
    }
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectTab(button.dataset.tab);
      window.history.replaceState(null, "", `#${button.dataset.tab}`);
      closeBehavioralMenu();
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".tab-menu")) closeBehavioralMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !behavioralMenu.hidden) {
      closeBehavioralMenu();
      behavioralMenuButton.focus();
    }
  });
  const initialAnchor = window.location.hash.slice(1);
  selectTab(initialAnchor === "paired-results" || initialAnchor === "evidence-results"
    ? "all-setups"
    : initialAnchor || "task-data");
})();

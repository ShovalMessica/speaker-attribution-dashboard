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
  const setupDetails = (row, conclusion = null, status = null) => `
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

  const pairedMetricCells = (metrics) => `
    <td>${pct(metrics.accuracy)}</td>
    <td>${pct(metrics.wrong_rate)}</td>
    <td>${pct(metrics.unknown_rate)}</td>
    <td>${decimal(metrics.auroc)}</td>
    <td>${pct(metrics.near_90_fpr)}</td>
    <td>${pct(metrics.correct_rejection_rate)}</td>
    <td>${pct(metrics.false_attribution_rate)}</td>`;
  document.querySelector("#paired-setup-table tbody").innerHTML = data.cross_domain_results.map((row) => `
    <tr class="paired-group-start">
      <td rowspan="2"><strong>Setup ${row.setup_number}</strong></td>
      <td><span class="dataset-label real-data">Real data</span></td>
      ${pairedMetricCells(row.real)}
      <td rowspan="2" class="definition-cell">${setupDetails(row, row.conclusion, row.status)}</td>
    </tr>
    <tr>
      <td><span class="dataset-label synthetic-data">Synthetic data</span></td>
      ${pairedMetricCells(row.synthetic)}
    </tr>
  `).join("");

  const factorData = data.factor_effects;
  document.getElementById("factor-method-note").textContent = factorData.method_note;
  const factorViews = [
    { id: "distractor_windows", title: "Distractor-rich windows across chunk sizes", baselineLabel: "Ordinary valid window", variantLabel: "Same-length distractor-rich window", metric: "unknown", metricLabel: "Missed-attribution rate", takeaway: "The model answered more often. Nearly all additional decisions were correct; wrong attribution was inconsistent." },
    { id: "participant_scope", title: "Participant-list size", baselineLabel: "Identified speakers who spoke", variantLabel: "Full meeting participant list", metric: "correct", metricLabel: "Correct-attribution rate", takeaway: "A broader choice set reduced correct attribution in both comparisons." },
    { id: "candidate_placement", title: "Participant-list position", baselineLabel: "List before transcript", variantLabel: "List after transcript", metric: "wrong", metricLabel: "Wrong-attribution rate", takeaway: "Moving the same list after the transcript increased wrong attribution in both comparisons." },
    { id: "final_cue", title: "Prompt decision rule", baselineLabel: "Conservative review cue", variantLabel: "Most-likely-participant cue", metric: "unknown", metricLabel: "Missed-attribution rate", takeaway: "The permissive cue converted missed attributions into both correct and wrong attributions." },
    { id: "reasoning_budget", title: "Reasoning budget", baselineLabel: "Lower token allowance", variantLabel: "Higher token allowance", metric: "unknown", metricLabel: "Missed-attribution rate", takeaway: "The effect was weak: one comparison changed and one was effectively unchanged." },
    { id: "sampling_policy", title: "Sampling entropy and seed", baselineLabel: "Original sampling", variantLabel: "Entropy or seed changed", metric: "near_90_fpr", metricLabel: "FPR near 90% TPR", takeaway: "Behavioral accuracy barely moved, but probability separation changed substantially." },
  ];
  const strongFactorIds = new Set(["distractor_windows", "participant_scope", "candidate_placement", "final_cue"]);
  const strongFactorsOnly = new URLSearchParams(window.location.search).get("factors") === "strong";
  const visibleFactorViews = strongFactorsOnly
    ? factorViews.filter((view) => strongFactorIds.has(view.id))
    : factorViews;
  if (strongFactorsOnly) {
    document.getElementById("factor-effects-heading").textContent = "Most consistent factor effects";
    document.getElementById("factor-effects-summary").textContent = "Four factors with repeated same-direction behavioral shifts.";
  }
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
  const hasConsistentRocDirection = (factor) => {
    const directions = factor.comparisons.map((comparison) => Math.sign(
      comparison.probability.variant.auroc - comparison.probability.baseline.auroc
    ));
    return directions.every((direction) => direction === directions[0]);
  };
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
        return `<rect class="factor-metric-bar baseline ${group.average ? "average" : ""}" x="${center - barWidth - 2}" y="${y(group.baseline)}" width="${barWidth}" height="${baselineHeight}"><title>Baseline: ${pct(group.baseline)}</title></rect>
          <rect class="factor-metric-bar variant ${group.average ? "average" : ""}" x="${center + 2}" y="${y(group.variant)}" width="${barWidth}" height="${variantHeight}"><title>Changed: ${pct(group.variant)}</title></rect>
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
    const showRoc = !strongFactorsOnly || hasConsistentRocDirection(factor);
    return `<section class="factor-analysis-panel">
      <header><h3>${escapeHtml(view.title)}</h3><span>${factor.comparisons.length} matched pairs</span></header>
      <div class="factor-change-direction"><span>${escapeHtml(view.baselineLabel)}</span><b aria-hidden="true">→</b><span>${escapeHtml(view.variantLabel)}</span></div>
      <div class="factor-analysis-grid ${showRoc ? "" : "single"}">
        <figure class="factor-chart-card"><h4><span>${escapeHtml(view.metricLabel)} · all 50 examples</span><span class="factor-bar-legend"><i class="without"></i>Baseline <i class="with"></i>Changed</span></h4>${metricBarSvg(factor, view)}<figcaption><strong>${pct(baselineMean)} → ${pct(variantMean)} (${signedPp(delta)})</strong><span>${consistent}/${factor.comparisons.length} pairs moved in the same direction</span></figcaption></figure>
        ${showRoc ? `<figure class="factor-chart-card"><h4>TPR–FPR · lower curve is better · UNKNOWN excluded</h4>${rocSvg(factor)}</figure>` : ""}
      </div>
      <p class="factor-takeaway">${escapeHtml(view.takeaway)}</p>
    </section>`;
  }).join("");

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
    ["Weak probability baseline", "AUROC <0.8 · FPR ≥70–80% near 90% TPR"],
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
  const setup31Full = data.full_data_results.find((row) => Number(row.setup_number) === 31);
  document.getElementById("weekly-deep-dive").innerHTML = `
    <div class="weekly-deep-dive-plots">
      <figure><img src="${escapeHtml(confidence.plot)}" alt="Setup 31 correct and wrong output-confidence distributions"></figure>
      <figure><img src="${escapeHtml(setup31Full.plots.tpr_fpr)}" alt="Setup 31 TPR-FPR curve"></figure>
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

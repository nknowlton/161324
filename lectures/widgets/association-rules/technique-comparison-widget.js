export function techniqueComparisonWidget() {
  const techniques = [
    {
      name: "Association Rules",
      supervised: "No",
      output: "Rules: {A} → {B}",
      interpretability: "High — rules are human-readable",
      dataType: "Transactional / binary",
      keyMetric: "Support, Confidence, Lift",
      detail: "Discovers co-occurrence patterns among items in transactional data. No target variable needed. Rules can be used for recommendations, cross-selling, and understanding relationships. Requires minimum support and confidence thresholds."
    },
    {
      name: "K-Means Clustering",
      supervised: "No",
      output: "Cluster assignments",
      interpretability: "Medium — cluster centres interpretable",
      dataType: "Continuous numeric",
      keyMetric: "Within-cluster variance, Silhouette",
      detail: "Groups similar observations into K clusters based on distance. Requires choosing K. Works best with spherical, similarly-sized clusters. Sensitive to scaling and outliers."
    },
    {
      name: "Decision Trees",
      supervised: "Yes",
      output: "Tree / IF-THEN rules",
      interpretability: "High — tree path = explanation",
      dataType: "Mixed (numeric + categorical)",
      keyMetric: "Accuracy, Gini impurity",
      detail: "Recursively partitions feature space to predict a target variable. Each leaf is a prediction. Produces interpretable rules, but they partition the space (each observation gets one path). Association rules find co-occurrence patterns instead."
    },
    {
      name: "Naive Bayes",
      supervised: "Yes",
      output: "Class probabilities",
      interpretability: "Medium — conditional probabilities",
      dataType: "Mixed (often categorical)",
      keyMetric: "Accuracy, posterior probability",
      detail: "Uses Bayes' theorem with independence assumption to classify. Both Naive Bayes and association rules work with conditional probabilities, but Naive Bayes predicts a specific target class while association rules discover all interesting co-occurrence patterns."
    },
    {
      name: "Collaborative Filtering",
      supervised: "No",
      output: "Recommendations / predicted ratings",
      interpretability: "Low (matrix factorisation) to High (item-based)",
      dataType: "User-item interactions",
      keyMetric: "RMSE, Precision@K",
      detail: "The direct application of association rule thinking to recommendation systems. Item-based collaborative filtering is essentially association rules. User-based CF and matrix factorisation extend the idea with continuous ratings and latent factors."
    }
  ];

  const columns = ["name", "supervised", "output", "interpretability", "dataType", "keyMetric"];
  const headers = ["Technique", "Supervised?", "Output", "Interpretability", "Data Type", "Key Metric"];

  const container = document.createElement("div");
  container.style.fontFamily = "system-ui, sans-serif";

  const table = document.createElement("table");
  table.style.borderCollapse = "collapse";
  table.style.width          = "100%";
  table.style.fontSize       = "14px";

  const thead = document.createElement("thead");
  const hrow  = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    th.style.padding          = "8px 10px";
    th.style.borderBottom     = "2px solid #333";
    th.style.textAlign        = "left";
    th.style.backgroundColor  = "#4e79a7";
    th.style.color            = "white";
    th.style.fontSize         = "13px";
    hrow.appendChild(th);
  });
  thead.appendChild(hrow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  let expandedRow = null;

  techniques.forEach((tech, idx) => {
    const row = document.createElement("tr");
    row.style.cursor          = "pointer";
    row.style.backgroundColor = idx === 0 ? "#edf3f9" : (idx % 2 === 0 ? "#f8f9fa" : "#fff");
    row.style.borderLeft      = idx === 0 ? "4px solid #4e79a7" : "4px solid transparent";
    row.style.transition      = "background-color 0.2s";

    columns.forEach(col => {
      const td = document.createElement("td");
      td.textContent   = tech[col];
      td.style.padding = "8px 10px";
      td.style.borderBottom = "1px solid #e0e0e0";
      td.style.fontSize = "13px";
      if (col === "name") td.style.fontWeight = "bold";
      row.appendChild(td);
    });

    const detailRow = document.createElement("tr");
    detailRow.style.display = "none";
    const detailTd = document.createElement("td");
    detailTd.colSpan             = columns.length;
    detailTd.style.padding       = "12px 16px";
    detailTd.style.backgroundColor = "#f0f4f8";
    detailTd.style.borderBottom  = "2px solid #4e79a7";
    detailTd.style.fontSize      = "14px";
    detailTd.style.lineHeight    = "1.6";
    detailTd.textContent         = tech.detail;
    detailRow.appendChild(detailTd);

    row.addEventListener("click", () => {
      if (expandedRow === detailRow) {
        detailRow.style.display = "none";
        expandedRow = null;
      } else {
        if (expandedRow) expandedRow.style.display = "none";
        detailRow.style.display = "";
        expandedRow = detailRow;
      }
    });

    row.addEventListener("mouseenter", () => { row.style.backgroundColor = "#e8eff7"; });
    row.addEventListener("mouseleave", () => {
      row.style.backgroundColor = idx === 0 ? "#edf3f9" : (idx % 2 === 0 ? "#f8f9fa" : "#fff");
    });

    tbody.appendChild(row);
    tbody.appendChild(detailRow);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  const hint = document.createElement("p");
  hint.style.fontSize  = "12px";
  hint.style.color     = "#888";
  hint.style.marginTop = "8px";
  hint.textContent     = "Click any row to expand/collapse the detailed comparison.";
  container.appendChild(hint);

  container.value = techniques;
  return container;
}

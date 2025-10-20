<script>
    const currencyFormatEn = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    });

    const currencyFormatEs = new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    });

    const numberFormat = currencyFormatEn;

    const percentFormat = new Intl.NumberFormat("en-GB", {
      style: "percent",
      maximumFractionDigits: 1
    });

    const tooltipEl = document.getElementById("tooltip");
    let activeTooltipSource = null;

    function showTooltip(target) {
      const en = target.getAttribute("data-tooltip-en");
      const es = target.getAttribute("data-tooltip-es");
      if (!en || !es) {
        return;
      }
      tooltipEl.innerHTML = "<strong>" + en + "</strong><em>" + es + "</em>";
      tooltipEl.classList.add("visible");
      tooltipEl.setAttribute("aria-hidden", "false");
      activeTooltipSource = target;
    }

    function hideTooltip() {
      tooltipEl.classList.remove("visible");
      tooltipEl.setAttribute("aria-hidden", "true");
      activeTooltipSource = null;
    }

    document.addEventListener("pointermove", (event) => {
      if (!tooltipEl.classList.contains("visible")) {
        return;
      }
      const offset = 18;
      tooltipEl.style.left = event.clientX + offset + "px";
      tooltipEl.style.top = event.clientY + offset + "px";
    });

    document.addEventListener("pointerover", (event) => {
      const source = event.target.closest && event.target.closest("[data-tooltip-en]");
      if (!source || source === activeTooltipSource) {
        return;
      }
      showTooltip(source);
    });

    document.addEventListener("pointerout", (event) => {
      if (!activeTooltipSource) {
        return;
      }
      const related = event.relatedTarget;
      if (related && related.closest && related.closest("[data-tooltip-en]") === activeTooltipSource) {
        return;
      }
      hideTooltip();
    });

    document.addEventListener("focusin", (event) => {
      const source = event.target.closest && event.target.closest("[data-tooltip-en]");
      if (!source) {
        return;
      }
      showTooltip(source);
      const rect = source.getBoundingClientRect();
      tooltipEl.style.left = rect.right + 14 + "px";
      tooltipEl.style.top = rect.top + window.scrollY + "px";
    });

    document.addEventListener("focusout", (event) => {
      if (activeTooltipSource === event.target) {
        hideTooltip();
      }
    });

    const inputs = {
      gross: document.getElementById("grossSalary"),
      employer: document.getElementById("employerSs"),
      employee: document.getElementById("employeeSs"),
      allowance: document.getElementById("personalAllowance"),
      vat: document.getElementById("vatRate"),
      indirect: document.getElementById("indirectRate")
    };

    const defaultTaxBrackets = [
      { min: 0, max: 12450, rate: 0.19 },
      { min: 12450, max: 20200, rate: 0.24 },
      { min: 20200, max: 35200, rate: 0.30 },
      { min: 35200, max: 60000, rate: 0.37 },
      { min: 60000, max: 300000, rate: 0.45 },
      { min: 300000, max: Infinity, rate: 0.47 }
    ];

    const bracketTableBody = document.getElementById("bracket-table-body");
    const addBracketBtn = document.getElementById("add-bracket");
    const resetBracketsBtn = document.getElementById("reset-brackets");

    function cloneBracket(bracket) {
      return {
        min: Number(bracket.min) || 0,
        max: Number.isFinite(bracket.max) ? bracket.max : Infinity,
        rate: Number(bracket.rate) || 0
      };
    }

    let taxBrackets = defaultTaxBrackets.map(cloneBracket);

    function normalizeBrackets(brackets) {
      const sorted = brackets.map((bracket) => {
        const minValue = Math.max(0, Number(bracket.min) || 0);
        let maxValue;
        if (bracket.max === "" || bracket.max === null || bracket.max === undefined || !Number.isFinite(bracket.max)) {
          maxValue = Infinity;
        } else {
          maxValue = Math.max(minValue, Number(bracket.max) || 0);
        }
        const rateValue = Math.max(0, Number(bracket.rate) || 0);
        return { min: minValue, max: maxValue, rate: rateValue };
      }).sort((a, b) => a.min - b.min);
      for (let i = 1; i < sorted.length; i += 1) {
        const previous = sorted[i - 1];
        const current = sorted[i];
        if (current.min < previous.min) {
          current.min = previous.min;
        }
        previous.max = Number.isFinite(previous.max) ? Math.min(Math.max(previous.min, previous.max), current.min) : current.min;
      }
      if (sorted.length > 0) {
        sorted[sorted.length - 1].max = Infinity;
      }
      return sorted;
    }

    function formatRangeEn(bracket) {
      const minLabel = currencyFormatEn.format(bracket.min);
      if (!Number.isFinite(bracket.max)) {
        return minLabel + " and above";
      }
      return minLabel + " – " + currencyFormatEn.format(bracket.max);
    }

    function formatRangeEs(bracket) {
      const minLabel = currencyFormatEs.format(bracket.min);
      if (!Number.isFinite(bracket.max)) {
        return minLabel + " en adelante";
      }
      return minLabel + " – " + currencyFormatEs.format(bracket.max);
    }

    function renderTaxBracketTable() {
      taxBrackets = normalizeBrackets(taxBrackets);
      bracketTableBody.innerHTML = "";
      taxBrackets.forEach((bracket, index) => {
        const row = document.createElement("tr");
        row.dataset.index = String(index);

        const minCell = document.createElement("td");
        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.inputMode = "decimal";
        minInput.min = "0";
        minInput.step = "100";
        minInput.value = bracket.min ? String(Math.round(bracket.min)) : "0";
        minInput.dataset.field = "min";
        minInput.addEventListener("input", () => updateBracketValue(index, "min", minInput.value));
        minInput.addEventListener("change", handleBracketChange);
        minCell.appendChild(minInput);

        const maxCell = document.createElement("td");
        const maxInput = document.createElement("input");
        maxInput.type = "number";
        maxInput.inputMode = "decimal";
        maxInput.min = "0";
        maxInput.step = "100";
        maxInput.placeholder = "∞";
        maxInput.value = Number.isFinite(bracket.max) ? String(Math.round(bracket.max)) : "";
        maxInput.dataset.field = "max";
        maxInput.addEventListener("input", () => updateBracketValue(index, "max", maxInput.value));
        maxInput.addEventListener("change", handleBracketChange);
        maxCell.appendChild(maxInput);

        const rateCell = document.createElement("td");
        const rateInput = document.createElement("input");
        rateInput.type = "number";
        rateInput.inputMode = "decimal";
        rateInput.min = "0";
        rateInput.step = "0.01";
        const percentValue = (bracket.rate * 100).toFixed(2).replace(/\.00$/, "");
        rateInput.value = percentValue;
        rateInput.dataset.field = "rate";
        rateInput.addEventListener("input", () => updateBracketValue(index, "rate", rateInput.value));
        rateInput.addEventListener("change", handleBracketChange);
        rateCell.appendChild(rateInput);

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-row tooltip-source";
        deleteButton.textContent = "Delete";
        deleteButton.tabIndex = 0;
        deleteButton.setAttribute("data-tooltip-en", "Delete bracket: remove this range from the table.");
        deleteButton.setAttribute("data-tooltip-es", "Eliminar tramo: quita este rango de la tabla.");
        deleteButton.addEventListener("click", () => deleteBracket(index));
        actionCell.appendChild(deleteButton);

        row.appendChild(minCell);
        row.appendChild(maxCell);
        row.appendChild(rateCell);
        row.appendChild(actionCell);

        bracketTableBody.appendChild(row);
      });
    }

    function updateBracketValue(index, field, rawValue) {
      const bracket = taxBrackets[index];
      if (!bracket) {
        return;
      }
      if (field === "rate") {
        const percent = parseFloat(rawValue);
        bracket.rate = Number.isNaN(percent) ? 0 : Math.max(0, percent) / 100;
      } else if (field === "max") {
        if (rawValue === "" || rawValue === null) {
          bracket.max = Infinity;
        } else {
          const parsed = parseFloat(rawValue);
          bracket.max = Number.isNaN(parsed) ? Infinity : Math.max(0, parsed);
        }
      } else {
        const parsed = parseFloat(rawValue);
        bracket.min = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
      }
      compute();
    }

    function handleBracketChange() {
      taxBrackets = normalizeBrackets(taxBrackets);
      renderTaxBracketTable();
      compute();
    }

    function deleteBracket(index) {
      if (taxBrackets.length <= 1) {
        return;
      }
      taxBrackets.splice(index, 1);
      taxBrackets = normalizeBrackets(taxBrackets);
      renderTaxBracketTable();
      compute();
    }

    function addBracket() {
      taxBrackets = normalizeBrackets(taxBrackets);
      if (taxBrackets.length === 0) {
        taxBrackets.push({ min: 0, max: Infinity, rate: 0.2 });
      } else {
        const lastIndex = taxBrackets.length - 1;
        const last = taxBrackets[lastIndex];
        if (!Number.isFinite(last.max)) {
          const newMin = last.min;
          const newMax = newMin + 10000;
          const newRate = last.rate;
          taxBrackets[lastIndex] = { ...last, min: newMax, max: Infinity };
          taxBrackets.splice(lastIndex, 0, { min: newMin, max: newMax, rate: newRate });
        } else {
          const newMin = last.max;
          const newMax = newMin + 10000;
          const newRate = last.rate;
          taxBrackets.push({ min: newMin, max: newMax, rate: newRate });
        }
      }
      taxBrackets = normalizeBrackets(taxBrackets);
      renderTaxBracketTable();
      compute();
    }

    function resetBrackets() {
      taxBrackets = defaultTaxBrackets.map(cloneBracket);
      renderTaxBracketTable();
      compute();
    }

    addBracketBtn.addEventListener("click", (event) => {
      event.preventDefault();
      addBracket();
    });

    resetBracketsBtn.addEventListener("click", (event) => {
      event.preventDefault();
      resetBrackets();
    });

    function calculateIncomeTax(taxableBase) {
      const sorted = normalizeBrackets(taxBrackets).map(cloneBracket);
      let remaining = Math.max(0, taxableBase);
      const breakdown = sorted.map((bracket) => {
        const span = Number.isFinite(bracket.max) ? Math.max(0, bracket.max - bracket.min) : remaining;
        const taxableAmount = Math.max(0, Math.min(remaining, span));
        const taxAmount = taxableAmount * bracket.rate;
        remaining = Math.max(0, remaining - taxableAmount);
        return { ...bracket, taxableAmount, taxAmount };
      });
      if (remaining > 0) {
        const last = breakdown[breakdown.length - 1];
        if (last) {
          last.taxableAmount += remaining;
          last.taxAmount += remaining * last.rate;
        } else {
          breakdown.push({ min: 0, max: Infinity, rate: 0, taxableAmount: remaining, taxAmount: 0 });
        }
        remaining = 0;
      }
      const total = breakdown.reduce((sum, item) => sum + item.taxAmount, 0);
      return { total, breakdown, sorted };
    }

    function renderIncomeTaxChart(breakdown, taxableBase, sorted) {
      const svg = document.getElementById("income-tax-chart");
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      const baseline = document.createElementNS("http://www.w3.org/2000/svg", "line");
      baseline.setAttribute("x1", "0");
      baseline.setAttribute("x2", "100");
      baseline.setAttribute("y1", "55");
      baseline.setAttribute("y2", "55");
      baseline.setAttribute("stroke", "rgba(148, 163, 184, 0.25)");
      baseline.setAttribute("stroke-width", "0.6");
      svg.appendChild(baseline);

      const maxRate = Math.max(0.01, ...sorted.map((item) => item.rate));
      const displayCap = Math.max(350000, ...sorted.map((bracket) => Number.isFinite(bracket.max) ? bracket.max : bracket.min + taxableBase));
      const rawWidths = sorted.map((bracket) => {
        if (!Number.isFinite(bracket.max)) {
          return displayCap * 0.2;
        }
        return Math.max(1, bracket.max - bracket.min);
      });
      const totalWidth = rawWidths.reduce((sum, value) => sum + value, 0) || 1;
      const widths = rawWidths.map((value) => (value / totalWidth) * 100);

      let cursor = 0;

      breakdown.forEach((item, index) => {
        const width = widths[index] || (100 / breakdown.length);
        const barHeight = (item.rate / maxRate) * 46;
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("tabindex", "0");
        const tooltipEn = formatRangeEn(item) + " taxed at " + Math.round(item.rate * 100) + "% (Income Tax, IRPF equivalent).";
        const tooltipEs = formatRangeEs(item) + " gravado al " + Math.round(item.rate * 100) + " % (IRPF, equivalente español).";
        group.setAttribute("data-tooltip-en", tooltipEn);
        group.setAttribute("data-tooltip-es", tooltipEs);

        const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bar.setAttribute("x", cursor.toFixed(2));
        bar.setAttribute("y", (55 - barHeight).toFixed(2));
        bar.setAttribute("width", width.toFixed(2));
        bar.setAttribute("height", barHeight.toFixed(2));
        bar.setAttribute("rx", "2");
        bar.setAttribute("fill", item.taxableAmount > 0 ? "#38bdf8" : "rgba(56, 189, 248, 0.3)");
        group.appendChild(bar);

        const bracketSpan = Number.isFinite(item.max) ? Math.max(1, item.max - item.min) : Math.max(1, taxableBase - item.min);
        const coverage = Math.min(1, Math.max(0, item.taxableAmount / bracketSpan));
        if (coverage > 0) {
          const highlight = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const highlightHeight = barHeight * coverage;
          highlight.setAttribute("x", cursor.toFixed(2));
          highlight.setAttribute("y", (55 - highlightHeight).toFixed(2));
          highlight.setAttribute("width", width.toFixed(2));
          highlight.setAttribute("height", highlightHeight.toFixed(2));
          highlight.setAttribute("fill", "rgba(14, 165, 233, 0.4)");
          group.appendChild(highlight);
        }

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", (cursor + width / 2).toFixed(2));
        text.setAttribute("y", "59");
        text.setAttribute("fill", "#cbd5f5");
        text.setAttribute("font-size", "3.3");
        text.setAttribute("text-anchor", "middle");
        text.textContent = Math.round(item.rate * 100) + "%";
        group.appendChild(text);

        svg.appendChild(group);
        cursor += width;
      });
    }

    function renderCompanyBar(companyCost, employerSS, grossSalary) {
      const bar = document.getElementById("company-cost-bar");
      bar.innerHTML = "";
      const segments = [
        {
          label: "Employer SS",
          value: employerSS,
          color: "linear-gradient(135deg, #f97316 0%, #fb923c 95%)",
          tooltipEn: "Company total cost (CTC): total expense for the employer including social security.",
          tooltipEs: "Coste total empresa (CTC): gasto total para el empleador incluyendo cotización patronal."
        },
        {
          label: "Gross salary",
          value: grossSalary,
          color: "linear-gradient(135deg, #38bdf8 0%, #0ea5e9 95%)",
          tooltipEn: "Gross salary: amount before employee contributions and taxes.",
          tooltipEs: "Salario bruto: importe antes de cotizaciones y retenciones del empleado."
        }
      ];

      const total = companyCost || 1;

      segments.forEach((segment) => {
        const percent = total ? (segment.value / total) * 100 : 0;
        const element = document.createElement("div");
        element.className = "stacked-segment tooltip-source";
        element.tabIndex = 0;
        element.style.flexGrow = String(segment.value || 0.0001);
        element.style.flexBasis = "0";
        element.style.background = segment.color;
        element.setAttribute("data-tooltip-en", segment.tooltipEn);
        element.setAttribute("data-tooltip-es", segment.tooltipEs);
        element.innerHTML = `
          <strong>${segment.label}</strong>
          <span>${numberFormat.format(segment.value)} &middot; ${percent.toFixed(1)}%</span>
        `;
        bar.appendChild(element);
      });
    }

    function renderGrossToNetBar(gross, employeeSS, incomeTax, net) {
      const bar = document.getElementById("gross-to-net-bar");
      bar.innerHTML = "";
      const segments = [
        {
          label: "Employee SS",
          value: employeeSS,
          color: "linear-gradient(135deg, #6366f1 0%, #818cf8 95%)",
          tooltipEn: "Employee SS: contribution for healthcare and pension.",
          tooltipEs: "Seguridad Social del empleado: contribución a sanidad y pensiones."
        },
        {
          label: "Income Tax",
          value: incomeTax,
          color: "linear-gradient(135deg, #f43f5e 0%, #fb7185 95%)",
          tooltipEn: "Income Tax (IRPF is the Spanish equivalent): personal income tax withheld by the employer.",
          tooltipEs: "Impuesto sobre la renta (IRPF es el equivalente español): retención practicada por la empresa."
        },
        {
          label: "Net salary",
          value: net,
          color: "linear-gradient(135deg, #4ade80 0%, #22c55e 95%)",
          tooltipEn: "Net salary: the amount you receive after withholdings.",
          tooltipEs: "Salario neto: cantidad que recibes tras las retenciones."
        }
      ];

      const total = gross || 1;

      segments.forEach((segment) => {
        const percent = total ? (segment.value / total) * 100 : 0;
        const element = document.createElement("div");
        element.className = "stacked-segment tooltip-source";
        element.tabIndex = 0;
        element.style.flexGrow = String(segment.value || 0.0001);
        element.style.flexBasis = "0";
        element.style.background = segment.color;
        element.setAttribute("data-tooltip-en", segment.tooltipEn);
        element.setAttribute("data-tooltip-es", segment.tooltipEs);
        element.innerHTML = `
          <strong>${segment.label}</strong>
          <span>${numberFormat.format(segment.value)} &middot; ${percent.toFixed(1)}%</span>
        `;
        bar.appendChild(element);
      });
    }

    function polarToCartesian(cx, cy, radius, angleInDegrees) {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
      return {
        x: cx + radius * Math.cos(angleInRadians),
        y: cy + radius * Math.sin(angleInRadians)
      };
    }

    function describeArc(x, y, radius, startAngle, endAngle) {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        "L", x, y,
        "Z"
      ].join(" ");
    }

    function renderPieChart(vatAmount, otherAmount, disposable) {
      const svg = document.getElementById("after-tax-pie");
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild);
      }

      const total = vatAmount + otherAmount + disposable;
      const slices = [
        {
          label: "VAT",
          value: vatAmount,
          color: "#facc15",
          tooltipEn: "VAT: value-added tax paid on most purchases.",
          tooltipEs: "IVA: impuesto sobre el valor añadido."
        },
        {
          label: "Other indirect taxes",
          value: otherAmount,
          color: "#f97316",
          tooltipEn: "Other indirect taxes: fuel, tobacco, or electricity taxes.",
          tooltipEs: "Otros impuestos indirectos: combustibles, tabaco, electricidad…"
        },
        {
          label: "Real disposable income",
          value: disposable,
          color: "#22c55e",
          tooltipEn: "Disposable income: net salary after your indirect tax burden.",
          tooltipEs: "Renta disponible: salario neto tras soportar los impuestos indirectos."
        }
      ];

      if (total <= 0) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "100");
        circle.setAttribute("cy", "100");
        circle.setAttribute("r", "82");
        circle.setAttribute("fill", "rgba(148, 163, 184, 0.15)");
        circle.setAttribute("data-tooltip-en", "No net salary: there is nothing to split into taxes or spending.");
        circle.setAttribute("data-tooltip-es", "Sin salario neto: no hay nada que repartir entre impuestos o gasto.");
        circle.setAttribute("tabindex", "0");
        svg.appendChild(circle);
      } else {
        let startAngle = 0;
        slices.forEach((slice) => {
          if (slice.value <= 0) {
            return;
          }
          const angle = (slice.value / total) * 360;
          const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
          path.setAttribute("d", describeArc(100, 100, 82, startAngle, startAngle + angle));
          path.setAttribute("fill", slice.color);
          path.setAttribute("data-tooltip-en", slice.tooltipEn);
          path.setAttribute("data-tooltip-es", slice.tooltipEs);
          path.setAttribute("tabindex", "0");
          svg.appendChild(path);
          startAngle += angle;
        });
      }

      const center = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      center.setAttribute("cx", "100");
      center.setAttribute("cy", "100");
      center.setAttribute("r", "50");
      center.setAttribute("fill", "rgba(15, 23, 42, 0.92)");
      svg.appendChild(center);

      const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
      title.setAttribute("x", "100");
      title.setAttribute("y", "96");
      title.setAttribute("fill", "#cbd5f5");
      title.setAttribute("font-size", "10");
      title.setAttribute("text-anchor", "middle");
      title.textContent = "Post-tax";
      svg.appendChild(title);

      const amount = document.createElementNS("http://www.w3.org/2000/svg", "text");
      amount.setAttribute("x", "100");
      amount.setAttribute("y", "114");
      amount.setAttribute("fill", "#38bdf8");
      amount.setAttribute("font-size", "12");
      amount.setAttribute("text-anchor", "middle");
      amount.textContent = total > 0 ? numberFormat.format(disposable) : "€0";
      svg.appendChild(amount);

      renderPieLegend(slices, total);
    }

    function renderPieLegend(slices, total) {
      const legend = document.getElementById("pie-legend");
      legend.innerHTML = "";
      slices.forEach((slice) => {
        const item = document.createElement("div");
        item.className = "legend-item tooltip-source";
        item.tabIndex = 0;
        item.setAttribute("data-tooltip-en", slice.tooltipEn);
        item.setAttribute("data-tooltip-es", slice.tooltipEs);
        const percent = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
        item.innerHTML = `
          <div class="legend-swatch" style="background:${slice.color};"></div>
          <div>
            <strong style="display:block;color:var(--fg);font-weight:600;">${slice.label}</strong>
            <span style="color:var(--fg-muted);font-size:0.85rem;">${numberFormat.format(slice.value)} &middot; ${percent}% of net</span>
          </div>
        `;
        legend.appendChild(item);
      });
    }

    function updateSummary(values) {
      document.querySelector('[data-summary="companyCost"]').textContent = numberFormat.format(values.companyCost);
      document.querySelector('[data-summary="companyCostShare"]').textContent = values.companyCost > 0 ? percentFormat.format(values.employerSS / values.companyCost) + " employer SS of CTC" : "—";
      document.querySelector('[data-summary="grossSalary"]').textContent = numberFormat.format(values.grossSalary);
      document.querySelector('[data-summary="grossShare"]').textContent = values.companyCost > 0 ? percentFormat.format(values.grossSalary / values.companyCost) + " of CTC" : "—";
      document.querySelector('[data-summary="employerSS"]').textContent = numberFormat.format(values.employerSS);
      document.querySelector('[data-summary="employerRate"]').textContent = percentFormat.format(values.employerRate / 100);
      document.querySelector('[data-summary="employeeSS"]').textContent = numberFormat.format(values.employeeSS);
      document.querySelector('[data-summary="employeeRate"]').textContent = percentFormat.format(values.employeeRate / 100);
      document.querySelector('[data-summary="incomeTax"]').textContent = numberFormat.format(values.incomeTax);
      document.querySelector('[data-summary="incomeTaxEffective"]').textContent = values.grossSalary > 0 ? percentFormat.format(values.incomeTax / values.grossSalary) + " of gross" : "—";
      document.querySelector('[data-summary="net"]').textContent = numberFormat.format(values.netSalary);
      document.querySelector('[data-summary="netShare"]').textContent = values.companyCost > 0 ? percentFormat.format(values.netSalary / values.companyCost) + " of CTC" : "—";
      document.querySelector('[data-summary="indirectTotal"]').textContent = numberFormat.format(values.indirectTaxes);
      document.querySelector('[data-summary="indirectShare"]').textContent = values.netSalary > 0 ? percentFormat.format(values.indirectTaxes / values.netSalary) + " of net" : "—";
      document.querySelector('[data-summary="disposable"]').textContent = numberFormat.format(values.disposableIncome);
      document.querySelector('[data-summary="disposableShare"]').textContent = values.netSalary > 0 ? percentFormat.format(values.disposableIncome / values.netSalary) + " of net" : "—";
      document.querySelector('[data-summary="effectiveGross"]').textContent = values.grossSalary > 0 ? percentFormat.format(values.totalTaxes / values.grossSalary) + " of gross" : "—";
      document.querySelector('[data-summary="effectiveCTC"]').textContent = values.companyCost > 0 ? percentFormat.format(values.totalTaxes / values.companyCost) + " of CTC" : "—";
    }

    function safeNumber(input) {
      const value = parseFloat(input.value);
      if (Number.isNaN(value) || value < 0) {
        return 0;
      }
      return value;
    }

    function compute() {
      const grossSalary = safeNumber(inputs.gross);
      const employerRate = safeNumber(inputs.employer);
      const employeeRate = safeNumber(inputs.employee);
      const personalAllowance = safeNumber(inputs.allowance);
      const vatRate = safeNumber(inputs.vat);
      const indirectRate = safeNumber(inputs.indirect);

      const employerSS = grossSalary * (employerRate / 100);
      const employeeSS = grossSalary * (employeeRate / 100);
      const taxableBase = Math.max(0, grossSalary - personalAllowance);
      const { total: incomeTaxTotal, breakdown, sorted } = calculateIncomeTax(taxableBase);
      const netSalary = Math.max(0, grossSalary - employeeSS - incomeTaxTotal);
      const vatAmount = Math.max(0, netSalary * (vatRate / 100));
      const otherIndirect = Math.max(0, netSalary * (indirectRate / 100));
      const disposableIncome = Math.max(0, netSalary - vatAmount - otherIndirect);
      const companyCost = grossSalary + employerSS;
      const indirectTaxes = vatAmount + otherIndirect;
      const totalTaxes = employerSS + employeeSS + incomeTaxTotal + indirectTaxes;

      renderIncomeTaxChart(breakdown, taxableBase, sorted);
      renderCompanyBar(companyCost, employerSS, grossSalary);
      renderGrossToNetBar(grossSalary, employeeSS, incomeTaxTotal, netSalary);
      renderPieChart(vatAmount, otherIndirect, disposableIncome);
      updateSummary({
        companyCost,
        grossSalary,
        employerSS,
        employerRate,
        employeeSS,
        employeeRate,
        incomeTax: incomeTaxTotal,
        netSalary,
        indirectTaxes,
        disposableIncome,
        totalTaxes
      });
    }

    Object.values(inputs).forEach((input) => {
      input.addEventListener("input", compute);
    });

    renderTaxBracketTable();
    compute();
  </script>

/**
 * Classify-D - Application Logic
 * Interactive Drug Solubility Prediction & Cheminformatics Analysis
 */

document.addEventListener('DOMContentLoaded', () => {
  // State variables
  let radarChart = null;
  let predictionHistory = JSON.parse(localStorage.getItem('classify_d_history') || '[]');

  // DOM Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabViews = document.querySelectorAll('.tab-view');
  const predictorForm = document.getElementById('predictorForm');
  const presetContainer = document.getElementById('presetContainer');
  const historyTableBody = document.getElementById('historyTableBody');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const exportHistoryBtn = document.getElementById('exportHistoryBtn');
  const batchFileInput = document.getElementById('batchFileInput');
  const uploadDropzone = document.getElementById('uploadDropzone');
  const batchResultsWrapper = document.getElementById('batchResultsWrapper');
  const batchTableBody = document.getElementById('batchTableBody');
  const downloadBatchCsvBtn = document.getElementById('downloadBatchCsvBtn');

  // Input elements and range sliders
  const descriptors = ['MolLogP', 'MolWt', 'NumRotatableBonds', 'AromaticProportion'];

  // Initialize event listeners for dual slider & number input synchronization
  descriptors.forEach(desc => {
    const rangeInput = document.getElementById(`${desc}_range`);
    const numberInput = document.getElementById(`${desc}_num`);
    const badgeVal = document.getElementById(`${desc}_badge`);

    if (rangeInput && numberInput) {
      rangeInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        numberInput.value = val;
        if (badgeVal) badgeVal.textContent = val;
        triggerAutoPredict();
      });

      numberInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          rangeInput.value = val;
          if (badgeVal) badgeVal.textContent = val;
          triggerAutoPredict();
        }
      });
    }
  });

  // Debounced auto-prediction
  let autoPredictTimeout = null;
  function triggerAutoPredict() {
    clearTimeout(autoPredictTimeout);
    autoPredictTimeout = setTimeout(() => {
      runPrediction();
    }, 250);
  }

  // Theme Toggler
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('classify_d_theme', newTheme);
    themeToggleBtn.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
  });

  // Restore saved theme
  const savedTheme = localStorage.getItem('classify_d_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  themeToggleBtn.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';

  // Navigation Tabs
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      navBtns.forEach(b => b.classList.remove('active'));
      tabViews.forEach(v => v.classList.remove('active'));

      btn.classList.add('active');
      document.getElementById(`${targetTab}Tab`).classList.add('active');
    });
  });

  // Load Preset Drug Compounds from API
  async function loadPresets() {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();

      if (data.success && data.presets) {
        presetContainer.innerHTML = '';
        Object.keys(data.presets).forEach(key => {
          const item = data.presets[key];
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'preset-btn';
          btn.textContent = item.name;
          btn.addEventListener('click', () => applyPreset(item, btn));
          presetContainer.appendChild(btn);
        });
      }
    } catch (err) {
      console.warn('Could not load presets:', err);
    }
  }

  function applyPreset(item, btnElement) {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    descriptors.forEach(desc => {
      if (item[desc] !== undefined) {
        const range = document.getElementById(`${desc}_range`);
        const num = document.getElementById(`${desc}_num`);
        const badge = document.getElementById(`${desc}_badge`);
        if (range) range.value = item[desc];
        if (num) num.value = item[desc];
        if (badge) badge.textContent = item[desc];
      }
    });

    runPrediction(item.name);
  }

  // Submit Single Prediction Form
  predictorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    runPrediction();
  });

  async function runPrediction(customName = null) {
    const payload = {};
    descriptors.forEach(desc => {
      const num = document.getElementById(`${desc}_num`);
      payload[desc] = parseFloat(num ? num.value : 0);
    });

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        updateResultsUI(data.results, payload, customName);
      } else {
        alert('Prediction error: ' + data.error);
      }
    } catch (err) {
      console.error('API call failed:', err);
    }
  }

  // Update UI Elements with API Output
  function updateResultsUI(results, inputs, compoundName = null) {
    // logS Score Value
    const logValEl = document.getElementById('logS_value');
    if (logValEl) logValEl.textContent = results.logS;

    // Solubility Class Badge
    const solTagEl = document.getElementById('solubility_tag');
    if (solTagEl) {
      solTagEl.textContent = results.solubility_class;
      solTagEl.className = `solubility-tag badge-${results.solubility_color}`;
    }

    // Description text
    const solDescEl = document.getElementById('solubility_desc');
    if (solDescEl) solDescEl.textContent = results.solubility_description;

    // Numerical concentrations
    const gLVal = document.getElementById('g_l_val');
    if (gLVal) gLVal.textContent = `${results.concentration_g_per_l} g/L`;

    const molarVal = document.getElementById('molar_val');
    if (molarVal) molarVal.textContent = `${results.molar_concentration} M`;

    // Lipinski Status
    const lipinskiTag = document.getElementById('lipinski_status_tag');
    if (lipinskiTag) {
      lipinskiTag.textContent = results.lipinski.status;
      lipinskiTag.className = `solubility-tag badge-${results.lipinski.status_color}`;
    }

    const mwRule = document.getElementById('mw_rule_chip');
    if (mwRule) {
      mwRule.className = `rule-chip ${results.lipinski.mw_pass ? 'badge-emerald' : 'badge-rose'}`;
      mwRule.innerHTML = `<span>MolWt ≤ 500 g/mol</span> <span>${results.lipinski.mw_pass ? '✓ Pass' : '✗ Exceeded'}</span>`;
    }

    const logpRule = document.getElementById('logp_rule_chip');
    if (logpRule) {
      logpRule.className = `rule-chip ${results.lipinski.logp_pass ? 'badge-emerald' : 'badge-rose'}`;
      logpRule.innerHTML = `<span>MolLogP ≤ 5.0</span> <span>${results.lipinski.logp_pass ? '✓ Pass' : '✗ Exceeded'}</span>`;
    }

    // Update Radar Chart
    renderRadarChart(results.normalized_radar);

    // Save to history
    savePredictionHistory({
      timestamp: new Date().toLocaleTimeString(),
      name: compoundName || `Compound (${inputs.MolWt} g/mol)`,
      inputs: inputs,
      logS: results.logS,
      class: results.solubility_class,
      color: results.solubility_color
    });
  }

  // Chart.js Radar Chart setup
  function renderRadarChart(normData) {
    const ctx = document.getElementById('radarChartCanvas');
    if (!ctx) return;

    if (radarChart) {
      radarChart.destroy();
    }

    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['MolLogP', 'Molecular Weight', 'Rotatable Bonds', 'Aromatic Proportion'],
        datasets: [{
          label: 'Normalized Profile (%)',
          data: [
            normData.MolLogP,
            normData.MolWt,
            normData.NumRotatableBonds,
            normData.AromaticProportion
          ],
          backgroundColor: 'rgba(16, 185, 129, 0.25)',
          borderColor: '#10b981',
          borderWidth: 2,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#10b981'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
            grid: { color: 'rgba(255, 255, 255, 0.08)' },
            pointLabels: {
              color: '#94a3b8',
              font: { family: 'Outfit', size: 11 }
            },
            ticks: { display: false },
            suggestedMin: 0,
            suggestedMax: 100
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // Prediction History Management
  function savePredictionHistory(item) {
    predictionHistory.unshift(item);
    if (predictionHistory.length > 20) predictionHistory.pop();
    localStorage.setItem('classify_d_history', JSON.stringify(predictionHistory));
    renderHistoryTable();
  }

  function renderHistoryTable() {
    if (!historyTableBody) return;
    historyTableBody.innerHTML = '';

    if (predictionHistory.length === 0) {
      historyTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim);">No previous prediction history recorded.</td></tr>`;
      return;
    }

    predictionHistory.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.timestamp}</td>
        <td><strong>${item.name}</strong></td>
        <td>MW: ${item.inputs.MolWt} | LogP: ${item.inputs.MolLogP}</td>
        <td>${item.logS}</td>
        <td><span class="solubility-tag badge-${item.color}">${item.class}</span></td>
        <td><button class="preset-btn reload-hist-btn">Re-test</button></td>
      `;

      tr.querySelector('.reload-hist-btn').addEventListener('click', () => {
        applyPreset(item.inputs);
        document.querySelector('[data-tab="predictor"]').click();
      });

      historyTableBody.appendChild(tr);
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      predictionHistory = [];
      localStorage.removeItem('classify_d_history');
      renderHistoryTable();
    });
  }

  if (exportHistoryBtn) {
    exportHistoryBtn.addEventListener('click', () => {
      if (predictionHistory.length === 0) {
        alert('No prediction history to export.');
        return;
      }
      let csvContent = "data:text/csv;charset=utf-8,Timestamp,Compound Name,MolLogP,MolWt,NumRotatableBonds,AromaticProportion,logS,Solubility Class\n";
      predictionHistory.forEach(row => {
        csvContent += `"${row.timestamp}","${row.name}",${row.inputs.MolLogP},${row.inputs.MolWt},${row.inputs.NumRotatableBonds},${row.inputs.AromaticProportion},${row.logS},"${row.class}"\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "classify_d_prediction_history.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Batch Upload Drag & Drop & Handling
  if (uploadDropzone && batchFileInput) {
    uploadDropzone.addEventListener('click', () => batchFileInput.click());

    ['dragenter', 'dragover'].forEach(eventName => {
      uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadDropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      uploadDropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        uploadDropzone.classList.remove('dragover');
      });
    });

    uploadDropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0) processBatchFile(files[0]);
    });

    batchFileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) processBatchFile(e.target.files[0]);
    });
  }

  let currentBatchData = [];

  async function processBatchFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/batch-predict', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        currentBatchData = data.results;
        renderBatchTable(data.results);
      } else {
        alert('Batch prediction failed: ' + data.error);
      }
    } catch (err) {
      console.error('Batch API call failed:', err);
    }
  }

  function renderBatchTable(results) {
    if (!batchTableBody) return;
    batchTableBody.innerHTML = '';
    batchResultsWrapper.style.display = 'block';

    results.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.id}</td>
        <td><strong>${row.name}</strong></td>
        <td>${row.MolLogP}</td>
        <td>${row.MolWt}</td>
        <td>${row.NumRotatableBonds}</td>
        <td>${row.AromaticProportion}</td>
        <td>${row.logS}</td>
        <td><span class="solubility-tag badge-${row.solubility_color}">${row.solubility_class}</span></td>
        <td>${row.lipinski_status}</td>
      `;
      batchTableBody.appendChild(tr);
    });
  }

  if (downloadBatchCsvBtn) {
    downloadBatchCsvBtn.addEventListener('click', () => {
      if (currentBatchData.length === 0) return;
      let csvContent = "data:text/csv;charset=utf-8,ID,Name,MolLogP,MolWt,NumRotatableBonds,AromaticProportion,logS,Solubility Class,Lipinski Status\n";
      currentBatchData.forEach(row => {
        csvContent += `${row.id},"${row.name}",${row.MolLogP},${row.MolWt},${row.NumRotatableBonds},${row.AromaticProportion},${row.logS},"${row.solubility_class}","${row.lipinski_status}"\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "classify_d_batch_predictions.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Initial Bootup Calls
  loadPresets();
  renderHistoryTable();
  runPrediction('Aspirin (Default)');
});

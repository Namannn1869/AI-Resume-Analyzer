/* =====================================================
   RESUME AI — Frontend App (Vanilla JS)
   ===================================================== */

'use strict';

// ── DOM refs ──────────────────────────────────────────
const dropZone      = document.getElementById('drop-zone');
const fileInput     = document.getElementById('file-input');
const fileDisplay   = document.getElementById('file-display');
const fileName      = document.getElementById('file-name');
const fileSize      = document.getElementById('file-size');
const removeFileBtn = document.getElementById('remove-file');
const errorMsg      = document.getElementById('error-msg');
const errorText     = document.getElementById('error-text');
const analyzeBtn    = document.getElementById('analyze-btn');

const loadingSection = document.getElementById('loading-section');
const resultsSection = document.getElementById('results-section');
const uploadSection  = document.getElementById('upload-section');
const analyzeAnother = document.getElementById('analyze-another');

const gaugeProgress  = document.getElementById('gauge-progress');
const gaugeScore     = document.getElementById('gauge-score');
const verdictBadge   = document.getElementById('verdict-badge');
const sectionsGrid   = document.getElementById('sections-grid');
const keywordsFound  = document.getElementById('keywords-found');
const keywordsMissing= document.getElementById('keywords-missing');
const suggestionsList= document.getElementById('suggestions-list');
const quickStats     = document.getElementById('quick-stats');

// Loading steps
const loadingSteps = [
  document.getElementById('ls-1'),
  document.getElementById('ls-2'),
  document.getElementById('ls-3'),
  document.getElementById('ls-4'),
];

// ── State ─────────────────────────────────────────────
let selectedFile = null;
let loadingInterval = null;

// ── Constants ─────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 80; // r=80 → ~502.65

const SECTION_LABELS = {
  contactInfo: 'Contact Info',
  summary:     'Summary',
  skills:      'Skills',
  experience:  'Experience',
  education:   'Education',
  keywords:    'Keywords',
};

// ── Drag & Drop ───────────────────────────────────────
['dragenter', 'dragover'].forEach(evt => {
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach(evt => {
  dropZone.addEventListener(evt, e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', e => {
  const file = e.dataTransfer.files[0];
  if (file) handleFileSelect(file);
});

// Click / keyboard on drop zone
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFileSelect(fileInput.files[0]);
});

// ── File handling ─────────────────────────────────────
function handleFileSelect(file) {
  clearError();

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    showError('Please upload a PDF file.');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showError('File is too large. Maximum size is 5MB.');
    return;
  }

  selectedFile = file;
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  fileDisplay.classList.remove('hidden');
  analyzeBtn.disabled = false;
  analyzeBtn.setAttribute('aria-disabled', 'false');
}

removeFileBtn.addEventListener('click', () => {
  resetFileState();
});

function resetFileState() {
  selectedFile = null;
  fileInput.value = '';
  fileDisplay.classList.add('hidden');
  analyzeBtn.disabled = true;
  analyzeBtn.setAttribute('aria-disabled', 'true');
  clearError();
}

// ── Analyze ───────────────────────────────────────────
analyzeBtn.addEventListener('click', startAnalysis);

async function startAnalysis() {
  if (!selectedFile) return;

  // Show loading, hide upload
  uploadSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
  loadingSection.classList.remove('hidden');
  loadingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

  startLoadingAnimation();

  try {
    const formData = new FormData();
    formData.append('resume', selectedFile);

    const response = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Analysis failed. Please try again.');
    }

    stopLoadingAnimation();
    renderResults(data);

  } catch (err) {
    stopLoadingAnimation();
    loadingSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    showError(err.message || 'Something went wrong. Please try again.');
    uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── Loading animation ─────────────────────────────────
function startLoadingAnimation() {
  let step = 0;
  resetLoadingSteps();
  loadingSteps[0].classList.add('active');

  loadingInterval = setInterval(() => {
    if (step < loadingSteps.length - 1) {
      loadingSteps[step].classList.remove('active');
      loadingSteps[step].classList.add('done');
      step++;
      loadingSteps[step].classList.add('active');
    }
  }, 1800);
}

function stopLoadingAnimation() {
  clearInterval(loadingInterval);
  loadingInterval = null;
}

function resetLoadingSteps() {
  loadingSteps.forEach(s => {
    s.classList.remove('active', 'done');
  });
}

// ── Render Results ────────────────────────────────────
function renderResults(data) {
  loadingSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 1. Animate gauge
  animateGauge(data.score);

  // 2. Verdict badge
  renderVerdict(data.verdict);

  // 3. Quick stats
  renderQuickStats(data);

  // 4. Section breakdown
  renderSections(data.sections);

  // 5. Keywords
  renderKeywords(data.keywordsFound, data.keywordsMissing);

  // 6. Suggestions
  renderSuggestions(data.suggestions);
}

// Gauge animation
function animateGauge(score) {
  const clampedScore = Math.max(0, Math.min(100, score));

  // Animate number counter
  let current = 0;
  const duration = 1400;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    current = Math.round(eased * clampedScore);
    gaugeScore.textContent = current;

    // SVG dash offset: full circle = GAUGE_CIRCUMFERENCE, 0 score = full offset
    const offset = GAUGE_CIRCUMFERENCE * (1 - eased * clampedScore / 100);
    gaugeProgress.style.strokeDashoffset = offset;

    // Color the gauge based on score zones
    if (clampedScore >= 80) {
      gaugeProgress.style.stroke = 'url(#gaugeGrad)';
    } else if (clampedScore >= 60) {
      gaugeProgress.style.stroke = '#10b981';
    } else if (clampedScore >= 40) {
      gaugeProgress.style.stroke = '#f59e0b';
    } else {
      gaugeProgress.style.stroke = '#ef4444';
    }

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

// Verdict
function renderVerdict(verdict) {
  const map = {
    'Poor':      'verdict-poor',
    'Average':   'verdict-average',
    'Good':      'verdict-good',
    'Excellent': 'verdict-excellent',
  };
  verdictBadge.className = `verdict-badge ${map[verdict] || 'verdict-average'}`;
  verdictBadge.textContent = verdict;
}

// Quick stats
function renderQuickStats(data) {
  const sections = data.sections;
  const sectionValues = Object.values(sections);
  const avgScore = Math.round(sectionValues.reduce((a, s) => a + s.score, 0) / sectionValues.length);
  const goodCount = sectionValues.filter(s => s.status === 'good').length;
  const weakCount = sectionValues.filter(s => s.status === 'weak').length;
  const kwFound   = data.keywordsFound.length;

  const stats = [
    { label: 'Avg Section Score', value: `${avgScore}`, status: avgScore >= 70 ? 'good' : avgScore >= 45 ? 'average' : 'weak' },
    { label: 'Strong Sections',   value: `${goodCount}/6`, status: goodCount >= 4 ? 'good' : goodCount >= 2 ? 'average' : 'weak' },
    { label: 'Weak Sections',     value: `${weakCount}`,   status: weakCount === 0 ? 'good' : weakCount <= 2 ? 'average' : 'weak' },
    { label: 'Keywords Found',    value: `${kwFound}`,     status: kwFound >= 8 ? 'good' : kwFound >= 4 ? 'average' : 'weak' },
  ];

  quickStats.innerHTML = stats.map(s => `
    <div class="qs-item">
      <span class="qs-label">${s.label}</span>
      <span class="qs-value ${s.status}">${s.value}</span>
    </div>
  `).join('');
}

// Section breakdown
function renderSections(sections) {
  sectionsGrid.innerHTML = Object.entries(sections).map(([key, sec]) => `
    <div class="section-card ${sec.status}">
      <div class="sc-header">
        <span class="sc-name">${SECTION_LABELS[key] || key}</span>
        <span class="sc-score">${sec.score}</span>
      </div>
      <div class="sc-bar-wrap">
        <div class="sc-bar" data-width="${sec.score}" style="width:0%"></div>
      </div>
      <p class="sc-feedback">${escapeHtml(sec.feedback)}</p>
    </div>
  `).join('');

  // Animate bars after DOM insertion
  requestAnimationFrame(() => {
    document.querySelectorAll('.sc-bar[data-width]').forEach(bar => {
      requestAnimationFrame(() => {
        bar.style.width = `${bar.dataset.width}%`;
      });
    });
  });
}

// Keywords
function renderKeywords(found, missing) {
  keywordsFound.innerHTML = found.map((kw, i) => `
    <span class="kw-chip found" role="listitem" style="animation-delay:${i * 40}ms">${escapeHtml(kw)}</span>
  `).join('');

  keywordsMissing.innerHTML = missing.map((kw, i) => `
    <span class="kw-chip missing" role="listitem" style="animation-delay:${i * 40}ms">${escapeHtml(kw)}</span>
  `).join('');
}

// Suggestions
function renderSuggestions(suggestions) {
  suggestionsList.innerHTML = suggestions.map((s, i) => `
    <li class="suggestion-item" style="animation-delay:${i * 80}ms">
      <span class="suggestion-num">${i + 1}</span>
      <span>${escapeHtml(s)}</span>
    </li>
  `).join('');
}

// ── Analyze Another ───────────────────────────────────
analyzeAnother.addEventListener('click', () => {
  resultsSection.classList.add('hidden');
  uploadSection.classList.remove('hidden');
  resetFileState();
  // Reset gauge
  gaugeProgress.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
  gaugeScore.textContent = '0';
  uploadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// ── Helpers ───────────────────────────────────────────
function showError(msg) {
  errorText.textContent = msg;
  errorMsg.classList.remove('hidden');
}

function clearError() {
  errorMsg.classList.add('hidden');
  errorText.textContent = '';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

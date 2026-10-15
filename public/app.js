/**
 * ReturnLess — Frontend Application Logic
 * Manages reactive state, YouCam S2S tasks, overlap radar visualizer, and audit ledger.
 */

// Application State
const state = {
  shoppers: [],
  candidates: [],
  ownedWardrobe: [],
  selectedShopper: null,
  selectedCandidate: null,
  currentAnalysis: null,
  currentTryOnTask: null,
  isGeneratingTryOn: false,
};

// DOM Elements
const el = {
  engineStatusPill: document.getElementById('engineStatusPill'),
  engineStatusLabel: document.getElementById('engineStatusLabel'),
  headerAuditCount: document.getElementById('headerAuditCount'),
  btnAuditLogToggle: document.getElementById('btnAuditLogToggle'),

  // Metrics Ticker HUD
  metricAvoidedSpend: document.getElementById('metricAvoidedSpend'),
  metricAvoidedCO2: document.getElementById('metricAvoidedCO2'),
  metricRejectedCount: document.getElementById('metricRejectedCount'),
  metricRejectionRate: document.getElementById('metricRejectionRate'),

  // Shopper Profile
  profileSelectorRow: document.getElementById('profileSelectorRow'),
  shopperAvatarImg: document.getElementById('shopperAvatarImg'),
  shopperName: document.getElementById('shopperName'),
  shopperDesc: document.getElementById('shopperDesc'),

  // Candidate Garments
  candidateCardsGrid: document.getElementById('candidateCardsGrid'),

  // Try-On Stage
  vtoDisplayImg: document.getElementById('vtoDisplayImg'),
  vtoOverlayLoader: document.getElementById('vtoOverlayLoader'),
  loaderText: document.getElementById('loaderText'),
  btnExecuteTryOn: document.getElementById('btnExecuteTryOn'),
  tryonStatusTag: document.getElementById('tryonStatusTag'),
  lblTaskId: document.getElementById('lblTaskId'),
  lblMode: document.getElementById('lblMode'),

  // Overlap Gauge & Cockpit
  verdictBadge: document.getElementById('verdictBadge'),
  verdictText: document.getElementById('verdictText'),
  overlapScoreNumber: document.getElementById('overlapScoreNumber'),
  overlapBarFill: document.getElementById('overlapBarFill'),
  verdictReasoning: document.getElementById('verdictReasoning'),

  // Closest Garment
  closestImg: document.getElementById('closestImg'),
  closestName: document.getElementById('closestName'),
  closestCategoryBadge: document.getElementById('closestCategoryBadge'),
  closestSimilarityBadge: document.getElementById('closestSimilarityBadge'),
  closestDeltaEBadge: document.getElementById('closestDeltaEBadge'),
  swatchCandidate: document.getElementById('swatchCandidate'),
  hexCandidate: document.getElementById('hexCandidate'),
  swatchOwned: document.getElementById('swatchOwned'),
  hexOwned: document.getElementById('hexOwned'),

  // Decisions
  rationaleSelect: document.getElementById('rationaleSelect'),
  customRationaleInput: document.getElementById('customRationaleInput'),
  btnReject: document.getElementById('btnReject'),
  btnApprove: document.getElementById('btnApprove'),

  // Closet
  closetItemsGrid: document.getElementById('closetItemsGrid'),
  ownedCountBadge: document.getElementById('ownedCountBadge'),

  // Audit Modal
  auditModalBackdrop: document.getElementById('auditModalBackdrop'),
  btnCloseAuditModal: document.getElementById('btnCloseAuditModal'),
  auditTableBody: document.getElementById('auditTableBody'),
  modalTotalSpend: document.getElementById('modalTotalSpend'),
  modalTotalCO2: document.getElementById('modalTotalCO2'),
  modalRejected: document.getElementById('modalRejected'),
  modalKept: document.getElementById('modalKept'),
  btnExportJson: document.getElementById('btnExportJson'),
  btnPrintReceipt: document.getElementById('btnPrintReceipt'),
};

/**
 * Initialize application
 */
async function init() {
  bindEvents();
  await checkHealth();
  await loadFixtures();
  await refreshAuditLog();
}

/**
 * Check backend health and engine mode
 */
async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.status === 'ok') {
      const modeText = data.engine.isLive
        ? 'YouCam S2S API: LIVE CREDENTIAL'
        : 'YouCam API: SIMULATION FIXTURE MODE';
      el.engineStatusLabel.textContent = modeText;
      el.lblMode.textContent = data.engine.isLive ? 'YouCam Live API' : 'Simulation Mode';
    }
  } catch (err) {
    el.engineStatusLabel.textContent = 'API Offline (Check Local Server)';
    console.error('Health check failed:', err);
  }
}

/**
 * Load fixtures
 */
async function loadFixtures() {
  try {
    const res = await fetch('/api/fixtures');
    const data = await res.json();
    state.shoppers = data.shoppers || [];
    state.candidates = data.candidates || [];
    state.ownedWardrobe = data.ownedWardrobe || [];

    renderShopperSelectors();
    renderCandidateCards();
    renderClosetGrid();

    // Select defaults
    if (state.shoppers.length > 0) {
      selectShopper(state.shoppers[0]);
    }
    if (state.candidates.length > 0) {
      selectCandidate(state.candidates[0]);
    }
  } catch (err) {
    console.error('Failed to load fixtures:', err);
  }
}

/**
 * Render Shopper selection buttons
 */
function renderShopperSelectors() {
  el.profileSelectorRow.innerHTML = '';
  state.shoppers.forEach((shopper, idx) => {
    const btn = document.createElement('button');
    btn.className = `btn-profile-toggle ${idx === 0 ? 'active' : ''}`;
    btn.textContent = shopper.name;
    btn.addEventListener('click', () => selectShopper(shopper));
    el.profileSelectorRow.appendChild(btn);
  });
}

/**
 * Select active shopper model
 */
function selectShopper(shopper) {
  state.selectedShopper = shopper;

  // Update active button style
  const buttons = el.profileSelectorRow.querySelectorAll('.btn-profile-toggle');
  buttons.forEach((b) => {
    b.classList.toggle('active', b.textContent === shopper.name);
  });

  el.shopperAvatarImg.src = shopper.avatarUrl;
  el.shopperName.textContent = shopper.name;
  el.shopperDesc.textContent = shopper.description;

  // Reset Try-On stage to baseline photo
  el.vtoDisplayImg.src = shopper.avatarUrl;
  el.tryonStatusTag.textContent = 'Ready to Fit';
  el.lblTaskId.textContent = 'None';
}

/**
 * Render Candidate Garment Cards
 */
function renderCandidateCards() {
  el.candidateCardsGrid.innerHTML = '';
  state.candidates.forEach((cand, idx) => {
    const card = document.createElement('div');
    card.className = `candidate-card ${idx === 0 ? 'selected' : ''}`;
    card.dataset.id = cand.id;

    const paletteDots = (cand.palette || [])
      .map((hex) => `<span class="palette-dot" style="background-color: ${hex}"></span>`)
      .join('');

    card.innerHTML = `
      <div class="candidate-thumb-wrap">
        <img src="${cand.imageUrl}" alt="${cand.name}" class="candidate-thumb">
        <div class="candidate-price-pill">$${cand.price.toFixed(2)}</div>
      </div>
      <div class="candidate-body">
        <h4 class="candidate-name">${cand.name}</h4>
        <span class="candidate-retailer">${cand.brand} &bull; ${cand.category}</span>
        <div class="candidate-footer-row">
          <div class="palette-dots">${paletteDots}</div>
          <span class="candidate-select-indicator">Review Item &rarr;</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => selectCandidate(cand));
    el.candidateCardsGrid.appendChild(card);
  });
}

/**
 * Select a candidate garment and run overlap analysis
 */
async function selectCandidate(candidate) {
  state.selectedCandidate = candidate;

  // Highlight card
  const cards = el.candidateCardsGrid.querySelectorAll('.candidate-card');
  cards.forEach((c) => {
    c.classList.toggle('selected', c.dataset.id === candidate.id);
  });

  // Reset Try-On stage
  if (state.selectedShopper) {
    el.vtoDisplayImg.src = state.selectedShopper.avatarUrl;
  }
  el.tryonStatusTag.textContent = 'Ready to Fit';
  el.lblTaskId.textContent = 'Pending Generation';

  // Run wardrobe overlap analysis
  await runOverlapAnalysis(candidate);
}

/**
 * Run wardrobe overlap analysis via API
 */
async function runOverlapAnalysis(candidate) {
  try {
    const res = await fetch('/api/analyze-overlap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate,
        ownedWardrobe: state.ownedWardrobe,
      }),
    });

    const analysis = await res.json();
    state.currentAnalysis = analysis;
    updateOverlapUI(analysis);
  } catch (err) {
    console.error('Overlap analysis failed:', err);
  }
}

/**
 * Update Overlap Radar & Evidence Cockpit UI
 */
function updateOverlapUI(analysis) {
  const score = analysis.overallOverlapScore;
  el.overlapScoreNumber.textContent = score;
  el.overlapBarFill.style.width = `${score}%`;

  // Verdict Badge
  el.verdictBadge.className = 'verdict-badge';
  if (analysis.verdict === 'REDUNDANT') {
    el.verdictBadge.classList.add('verdict-redundant');
    el.verdictText.textContent = 'REDUNDANT PURCHASE';
  } else if (analysis.verdict === 'BORDERLINE') {
    el.verdictBadge.classList.add('verdict-borderline');
    el.verdictText.textContent = 'BORDERLINE OVERLAP';
  } else {
    el.verdictBadge.classList.add('verdict-distinctive');
    el.verdictText.textContent = 'DISTINCTIVE ADDITION';
  }

  // Reasoning
  el.verdictReasoning.textContent = analysis.reasoning;

  // Closest Owned Garment
  if (analysis.closestMatch) {
    const closest = analysis.closestMatch;
    el.closestImg.src = closest.imageUrl;
    el.closestName.textContent = closest.name;
    el.closestCategoryBadge.textContent = closest.category.replace('_', ' ').toUpperCase();
    el.closestSimilarityBadge.textContent = `${closest.similarityScore}% Overlap`;
    el.closestDeltaEBadge.textContent = `Delta-E: ${closest.deltaE}`;

    const candidateColor = closest.matchedPair?.candidateColor || '#000000';
    const ownedColor = closest.matchedPair?.ownedColor || '#000000';

    el.swatchCandidate.style.backgroundColor = candidateColor;
    el.hexCandidate.textContent = candidateColor;
    el.swatchOwned.style.backgroundColor = ownedColor;
    el.hexOwned.textContent = ownedColor;
  }
}

/**
 * Execute YouCam Virtual Try-On
 */
async function executeTryOn() {
  if (state.isGeneratingTryOn) return;
  if (!state.selectedShopper || !state.selectedCandidate) {
    alert('Please select both a shopper model and a candidate garment.');
    return;
  }

  state.isGeneratingTryOn = true;
  el.btnExecuteTryOn.disabled = true;
  el.vtoOverlayLoader.classList.remove('hidden');
  el.tryonStatusTag.textContent = 'Generating...';

  try {
    const res = await fetch('/api/tryon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userImage: state.selectedShopper.avatarUrl,
        garmentImage: state.selectedCandidate.imageUrl,
        garmentCategory: state.selectedCandidate.category,
        candidateId: state.selectedCandidate.id,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start try-on');

    el.lblTaskId.textContent = data.taskId;

    // Poll for completion
    let pollCount = 0;
    const pollInterval = setInterval(async () => {
      pollCount++;
      const pollRes = await fetch(`/api/tryon/${data.taskId}`);
      const pollData = await pollRes.json();

      if (pollData.status === 'success') {
        clearInterval(pollInterval);
        state.isGeneratingTryOn = false;
        el.btnExecuteTryOn.disabled = false;
        el.vtoOverlayLoader.classList.add('hidden');
        el.vtoDisplayImg.src = pollData.resultUrl;
        el.tryonStatusTag.textContent = 'Render Complete';
        state.currentTryOnTask = pollData;
      } else if (pollData.status === 'error' || pollCount > 30) {
        clearInterval(pollInterval);
        state.isGeneratingTryOn = false;
        el.btnExecuteTryOn.disabled = false;
        el.vtoOverlayLoader.classList.add('hidden');
        el.tryonStatusTag.textContent = 'Error';
        alert(`Try-on task failed: ${pollData.error || 'Timed out'}`);
      }
    }, 1000);
  } catch (err) {
    state.isGeneratingTryOn = false;
    el.btnExecuteTryOn.disabled = false;
    el.vtoOverlayLoader.classList.add('hidden');
    el.tryonStatusTag.textContent = 'Failed';
    alert(err.message);
  }
}

/**
 * Record Keep or Reject Decision
 */
async function recordDecision(decision) {
  if (!state.selectedCandidate) return;

  const candidate = state.selectedCandidate;
  const analysis = state.currentAnalysis;

  let rationale = el.rationaleSelect.value;
  if (rationale === 'Custom rationale...') {
    rationale = el.customRationaleInput.value.trim() || 'Custom shopper decision';
  }

  const avoidedCost = decision === 'REJECT' ? candidate.price : 0;
  const overlapScore = analysis ? analysis.overallOverlapScore : 0;

  try {
    const res = await fetch('/api/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateId: candidate.id,
        candidateName: candidate.name,
        decision,
        rationale,
        avoidedCost,
        overlapScore,
        tryOnTaskId: state.currentTryOnTask?.taskId || null,
      }),
    });

    const data = await res.json();
    if (data.success) {
      updateHUD(data.summary);
      await refreshAuditLog();

      const actionText = decision === 'REJECT'
        ? `Purchase REJECTED. Spared $${candidate.price.toFixed(2)} and avoided a duplicate wardrobe item!`
        : `Purchase APPROVED for ${candidate.name}.`;
      alert(actionText);
    }
  } catch (err) {
    console.error('Failed to record decision:', err);
  }
}

/**
 * Update Top Metrics HUD
 */
function updateHUD(summary) {
  if (!summary) return;
  el.metricAvoidedSpend.textContent = summary.totalAvoidedSpend.toFixed(2);
  el.metricAvoidedCO2.textContent = summary.totalAvoidedCO2Kg.toFixed(1);
  el.metricRejectedCount.textContent = summary.totalRejected;
  el.metricRejectionRate.textContent = `${summary.rejectionRatePercent}% of total reviewed`;
  el.headerAuditCount.textContent = summary.totalEvaluations;

  // Modal stats
  el.modalTotalSpend.textContent = `$${summary.totalAvoidedSpend.toFixed(2)}`;
  el.modalTotalCO2.textContent = `${summary.totalAvoidedCO2Kg.toFixed(1)} kg`;
  el.modalRejected.textContent = summary.totalRejected;
  el.modalKept.textContent = summary.totalKept;
}

/**
 * Refresh Audit Log Table
 */
async function refreshAuditLog() {
  try {
    const res = await fetch('/api/audit-log');
    const data = await res.json();
    updateHUD(data.summary);

    const decisions = data.decisions || [];
    if (decisions.length === 0) {
      el.auditTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="empty-table-msg">No decisions recorded yet. Evaluate a garment to populate ledger.</td>
        </tr>`;
      return;
    }

    el.auditTableBody.innerHTML = decisions
      .map((d) => {
        const isReject = d.decision === 'REJECT';
        const badgeClass = isReject ? 'verdict-redundant' : 'verdict-distinctive';
        const formattedDate = new Date(d.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return `
        <tr>
          <td><code>${d.decisionId}</code></td>
          <td><strong>${d.candidateName}</strong></td>
          <td>${d.overlapScore}%</td>
          <td><span class="verdict-badge ${badgeClass}" style="padding: 2px 8px; font-size: 0.7rem;">${d.decision}</span></td>
          <td>${d.decision}</td>
          <td>${isReject ? `$${d.avoidedCost.toFixed(2)}` : '$0.00'}</td>
          <td>${d.rationale}</td>
          <td>${formattedDate}</td>
        </tr>
      `;
      })
      .join('');
  } catch (err) {
    console.error('Failed to refresh audit log:', err);
  }
}

/**
 * Render Owned Closet Gallery
 */
function renderClosetGrid() {
  el.closetItemsGrid.innerHTML = '';
  el.ownedCountBadge.textContent = `${state.ownedWardrobe.length} Items Registered`;

  state.ownedWardrobe.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'closet-card';
    const paletteDots = (item.palette || [])
      .map((hex) => `<span class="palette-dot" style="background-color: ${hex}"></span>`)
      .join('');

    card.innerHTML = `
      <div class="closet-thumb-wrap">
        <img src="${item.imageUrl}" alt="${item.name}" class="closet-thumb">
      </div>
      <div class="closet-card-body">
        <h4 class="closet-item-name">${item.name}</h4>
        <div class="closet-item-meta">
          <span>${item.brand} &bull; ${item.category}</span>
          <div class="palette-dots">${paletteDots}</div>
        </div>
      </div>
    `;
    el.closetItemsGrid.appendChild(card);
  });
}

/**
 * Export Audit Ledger as JSON file
 */
async function exportLedgerJson() {
  try {
    const res = await fetch('/api/audit-log');
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `returnless-audit-ledger-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert('Failed to export ledger');
  }
}

/**
 * Bind UI Event Listeners
 */
function bindEvents() {
  el.btnExecuteTryOn.addEventListener('click', executeTryOn);
  el.btnReject.addEventListener('click', () => recordDecision('REJECT'));
  el.btnApprove.addEventListener('click', () => recordDecision('KEEP'));

  el.rationaleSelect.addEventListener('change', () => {
    el.customRationaleInput.classList.toggle(
      'hidden',
      el.rationaleSelect.value !== 'Custom rationale...'
    );
  });

  el.btnAuditLogToggle.addEventListener('click', () => {
    el.auditModalBackdrop.classList.remove('hidden');
    refreshAuditLog();
  });

  el.btnCloseAuditModal.addEventListener('click', () => {
    el.auditModalBackdrop.classList.add('hidden');
  });

  el.auditModalBackdrop.addEventListener('click', (e) => {
    if (e.target === el.auditModalBackdrop) {
      el.auditModalBackdrop.classList.add('hidden');
    }
  });

  el.btnExportJson.addEventListener('click', exportLedgerJson);
  el.btnPrintReceipt.addEventListener('click', () => window.print());
}

// Start
document.addEventListener('DOMContentLoaded', init);

/**
 * ReturnLess Decision Store & Audit Ledger
 * Tracks shopper evaluation records, Keep/Reject actions, and cumulative return savings.
 */

import crypto from 'node:crypto';

export class DecisionStore {
  constructor() {
    this.decisions = [];
  }

  /**
   * Records a user purchase decision.
   */
  recordDecision({ candidateId, candidateName, decision, rationale, avoidedCost, overlapScore, tryOnTaskId }) {
    const record = {
      decisionId: `dec_${crypto.randomBytes(6).toString('hex')}`,
      candidateId,
      candidateName: candidateName || 'Candidate Garment',
      decision, // 'KEEP' or 'REJECT'
      rationale,
      avoidedCost: typeof avoidedCost === 'number' ? avoidedCost : 0,
      overlapScore: typeof overlapScore === 'number' ? overlapScore : 0,
      tryOnTaskId: tryOnTaskId || null,
      timestamp: new Date().toISOString(),
    };

    this.decisions.unshift(record);
    return record;
  }

  /**
   * Retrieves all decisions.
   */
  getAllDecisions() {
    return [...this.decisions];
  }

  /**
   * Calculates cumulative savings summary.
   */
  getSummaryStats() {
    let totalRejected = 0;
    let totalKept = 0;
    let totalAvoidedSpend = 0;
    let totalAvoidedCO2Kg = 0;

    for (const d of this.decisions) {
      if (d.decision === 'REJECT') {
        totalRejected += 1;
        totalAvoidedSpend += d.avoidedCost;
        // Standard return logistics carbon footprint ~2.6 kg CO2e per item
        totalAvoidedCO2Kg += 2.6;
      } else {
        totalKept += 1;
      }
    }

    return {
      totalEvaluations: this.decisions.length,
      totalKept,
      totalRejected,
      totalAvoidedSpend: Math.round(totalAvoidedSpend * 100) / 100,
      totalAvoidedCO2Kg: Math.round(totalAvoidedCO2Kg * 10) / 10,
      rejectionRatePercent: this.decisions.length > 0
        ? Math.round((totalRejected / this.decisions.length) * 100)
        : 0,
    };
  }

  /**
   * Clears all decisions (for testing or reset).
   */
  clear() {
    this.decisions = [];
  }
}

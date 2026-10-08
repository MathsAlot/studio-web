import type { FactDetail, TrickDetail } from '@/lib/api-client';
import { asDataObject, asText, TIER_LABELS } from './fields';

/**
 * Publication readiness, derived from server-reported fields only. These
 * helpers shape the UI checklist; the API's atomic gate remains the sole
 * authority and is exercised by the publish endpoints.
 */

export interface ReadinessCheck {
  key: string;
  label: string;
  passed: boolean;
  reason: string;
}

export function trickReadinessChecks(trick: TrickDetail): ReadinessCheck[] {
  const tiersPresent = trick.completeness.isComplete;
  const missing = trick.completeness.missingTiers.map((tier) => TIER_LABELS[tier]).join(', ');
  const vettingVerified = trick.vettingStatus === 'VERIFIED';
  const reviewApproved = trick.reviewStatus === 'APPROVED';
  const variantsApproved =
    trick.variants.length > 0 &&
    trick.variants.length === trick.completeness.totalTiers &&
    trick.variants.every((variant) => variant.reviewStatus === 'APPROVED');
  const aiDraft = trick.draftSource === 'AI';
  const aiApproved = !aiDraft || reviewApproved;

  return [
    {
      key: 'tiers',
      label: 'All three age tiers present',
      passed: tiersPresent,
      reason: tiersPresent
        ? 'Formative, Midrange and Mature content are saved.'
        : `Missing ${missing || 'one or more tiers'}.`,
    },
    {
      key: 'vetting',
      label: 'Vetting Verified',
      passed: vettingVerified,
      reason: vettingVerified
        ? 'Validity, domain and edge cases are verified.'
        : `Current vetting state is ${trick.vettingStatus.toLowerCase().replace('_', ' ')}.`,
    },
    {
      key: 'review',
      label: 'Review Approved',
      passed: reviewApproved,
      reason: reviewApproved
        ? 'A human reviewer has approved this Trick.'
        : 'This Trick is still awaiting human approval.',
    },
    {
      key: 'variants',
      label: 'All age-tier variants approved',
      passed: variantsApproved,
      reason: variantsApproved
        ? 'Every saved variant has been approved by a human.'
        : 'One or more variants still need approval.',
    },
    {
      key: 'ai',
      label: 'AI draft approved',
      passed: aiApproved,
      reason: aiDraft
        ? aiApproved
          ? 'The AI-drafted content has been approved by a human.'
          : 'AI-drafted content is held until a human approves it.'
        : 'Content is human-authored, so no AI approval is needed.',
    },
  ];
}

export function trickIsReady(trick: TrickDetail): boolean {
  return trickReadinessChecks(trick).every((check) => check.passed);
}

export function factReadinessChecks(fact: FactDetail): ReadinessCheck[] {
  const vettingVerified = fact.vettingStatus === 'VERIFIED';
  const reviewApproved = fact.reviewStatus === 'APPROVED';
  const dataValid = fact.validation.valid;

  return [
    {
      key: 'vetting',
      label: 'Vetting Verified',
      passed: vettingVerified,
      reason: vettingVerified
        ? 'The Fact has been verified.'
        : `Current vetting state is ${fact.vettingStatus.toLowerCase().replace('_', ' ')}.`,
    },
    {
      key: 'review',
      label: 'Review Approved',
      passed: reviewApproved,
      reason: reviewApproved
        ? 'A human reviewer has approved this Fact.'
        : 'This Fact is still awaiting human approval.',
    },
    {
      key: 'validation',
      label: 'Structured data valid',
      passed: dataValid,
      reason: dataValid
        ? 'The stored data matches its Fact type.'
        : 'The stored data fails validation and must be corrected.',
    },
  ];
}

export function factIsReady(fact: FactDetail): boolean {
  return factReadinessChecks(fact).every((check) => check.passed);
}

/** One-line summary of a Trick snapshot for the history list. */
export function trickVersionSummary(snapshot: Record<string, unknown>): string {
  const trick = asDataObject(snapshot.trick ?? snapshot);
  const parts = [asText(trick.name), asText(trick.kind)].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(' · ') : 'Snapshot';
}

/** One-line summary of a Fact snapshot for the history list. */
export function factVersionSummary(snapshot: Record<string, unknown>): string {
  const fact = asDataObject(snapshot.fact ?? snapshot);
  const parts = [asText(fact.factType), asText(fact.factText)].filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(' · ') : 'Snapshot';
}

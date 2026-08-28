import { query } from '@/lib/db';
import type {
  Evidence,
  IntelligenceAction,
  IntelligenceSignal,
  IntelligenceSignalLevel,
  IntelligenceSummary,
  OverallAssessment,
  ProductIntelligence,
  ProductPerformance,
  Signal,
  SignalStatus,
  TrendDirection,
  TrendSignal,
  VendorIntelligence,
  VendorIntelligenceOptions,
} from '@/lib/types';

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') {
    return value;
  }
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }
  return undefined;
}

function buildEvidence(
  sourceTable: string,
  sourceColumns: string[],
  filterDescription: string,
  rowCount: number,
  dateRange?: { start: string; end: string },
  note?: string,
): Evidence {
  return { sourceTable, sourceColumns, filterDescription, rowCount, dateRange, note };
}

function determineHistoryStatus(visitCount: number, distinctVisitDays: number, windowDays: number): SignalStatus {
  if (visitCount === 0) {
    return 'no_history';
  }
  if (distinctVisitDays < 2 || windowDays < 2) {
    return 'insufficient_data';
  }
  if (windowDays >= 30 && distinctVisitDays / windowDays < 0.2) {
    return 'sparse_data';
  }
  return 'ok';
}

function createFilterDescription(vendorId: string, options: VendorIntelligenceOptions): string {
  const parts: string[] = [`vendor_id = ${vendorId}`];
  if (options.market) parts.push(`market = ${options.market}`);
  if (options.startDate) parts.push(`date >= ${options.startDate}`);
  if (options.endDate) parts.push(`date <= ${options.endDate}`);
  if (options.productId) parts.push(`product_id = ${options.productId}`);
  if (options.salesRepId) parts.push(`sales_rep_id = ${options.salesRepId}`);
  return parts.join('; ');
}

function createVisitEvidenceDescription(vendorId: string, options: VendorIntelligenceOptions): string {
  const base = createFilterDescription(vendorId, options);
  return `${base}; reversed visits excluded`;
}

function computeDaysRemaining(currentStock: number, avgDailyUnits: number): number | undefined {
  if (currentStock <= 0) {
    return 0;
  }
  if (avgDailyUnits > 0) {
    return currentStock / avgDailyUnits;
  }
  return undefined;
}

function computeAverageUnitPrice(salesValue: number, unitsSold: number): number | undefined {
  return unitsSold > 0 ? salesValue / unitsSold : undefined;
}

function determineStockRemainingStatus(
  visitStatus: SignalStatus,
  currentStock: number,
  totalUnitsSold: number,
): SignalStatus {
  if (visitStatus === 'no_history' || visitStatus === 'insufficient_data') {
    return visitStatus;
  }
  if (currentStock > 0 && totalUnitsSold === 0) {
    return 'insufficient_data';
  }
  return visitStatus;
}

function hasEnoughTrendEvidence(
  visitHistoryStatus: SignalStatus,
  distinctVisitDays: number,
  windowDays: number,
  currentPeriodVisits: number,
  previousPeriodVisits: number,
): boolean {
  return (
    visitHistoryStatus === 'ok' &&
    distinctVisitDays >= 4 &&
    windowDays >= 14 &&
    currentPeriodVisits >= 2 &&
    previousPeriodVisits >= 2
  );
}

function determineTrendDirection(currentValue: number | undefined, previousValue: number | undefined): TrendDirection {
  if (currentValue === undefined || previousValue === undefined) {
    return 'insufficient_data';
  }
  if (currentValue === previousValue) {
    return 'flat';
  }
  return currentValue > previousValue ? 'up' : 'down';
}

function signLabel(change: number, unit = ''): string {
  const absChange = Math.abs(change);
  const sign = change >= 0 ? '+' : '-';
  const formatted = unit === '%' ? `${absChange.toFixed(0)}${unit}` : `${absChange.toFixed(1)}${unit}`;
  return `${sign}${formatted}`;
}

function describeTrendDirection(
  name: string,
  currentValue: number | undefined,
  previousValue: number | undefined,
  hasEvidence: boolean,
  unit = '',
): { direction: TrendDirection; note: string } {
  if (!hasEvidence) {
    return {
      direction: 'insufficient_data',
      note: `${name} trend cannot be determined from the available history.`,
    };
  }

  if (currentValue === undefined || previousValue === undefined) {
    return {
      direction: 'insufficient_data',
      note: `${name} trend is unavailable.`,
    };
  }

  const direction = determineTrendDirection(currentValue, previousValue);
  const change = currentValue - previousValue;
  const magnitude = previousValue !== 0 ? Math.abs(change / previousValue) : undefined;

  if (direction === 'flat' || change === 0) {
    return {
      direction: 'flat',
      note: `${name} is stable compared with the prior period.`,
    };
  }

  if (magnitude !== undefined && magnitude >= 0.25) {
    return {
      direction,
      note: `${name} is ${direction === 'up' ? 'increasing sharply' : 'decreasing sharply'} by ${signLabel(change, unit)} compared with the prior period.`,
    };
  }

  return {
    direction,
    note: `${name} is ${direction === 'up' ? 'increasing' : 'decreasing'} by ${signLabel(change, unit)} compared with the prior period.`,
  };
}

function formatTrendLabel(name: string, currentValue: number | undefined, previousValue: number | undefined, unit = ''): string {
  if (currentValue === undefined || previousValue === undefined) {
    return `${name} trend unavailable`;
  }
  const change = currentValue - previousValue;
  const direction = determineTrendDirection(currentValue, previousValue);
  if (direction === 'flat') {
    return `${name} is stable compared with the prior period.`;
  }
  return `${name} is ${direction === 'up' ? 'increasing' : 'decreasing'} by ${signLabel(change, unit)} compared with the prior period.`;
}

function determineOverallAssessment(
  visitHistoryStatus: SignalStatus,
  daysRemaining: number | undefined,
  collectionRate: number | undefined,
  lastVisitDate: string | undefined,
  risks: IntelligenceSignal[],
): OverallAssessment {
  if (visitHistoryStatus === 'no_history' || visitHistoryStatus === 'insufficient_data') {
    return 'Insufficient Data';
  }

  if (daysRemaining !== undefined && daysRemaining < 3) {
    return 'At Risk';
  }

  if (collectionRate !== undefined && collectionRate < 75) {
    return 'At Risk';
  }

  if (risks.some((signal) => signal.level === 'critical')) {
    return 'At Risk';
  }

  if (risks.some((signal) => signal.level === 'high')) {
    return 'Watch';
  }

  if (lastVisitDate) {
    const lastVisit = new Date(lastVisitDate);
    const daysSinceLastVisit = Math.floor((Date.now() - lastVisit.getTime()) / 86400000);
    if (daysSinceLastVisit > 14) {
      return 'Watch';
    }
  }

  return 'Healthy';
}

function buildSignalLevel(score: number): IntelligenceSignalLevel {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'watch';
  if (score >= 30) return 'opportunity';
  return 'healthy';
}

function buildRiskSignals(
  salesMomentumLabel: string,
  balanceOwed: number,
  collectionRate: number | undefined,
  daysRemaining: number | undefined,
  purchaseVelocityStatus: SignalStatus,
  lastVisitDate: string | undefined,
  summaryEvidence: Evidence[],
): IntelligenceSignal[] {
  const risks: IntelligenceSignal[] = [];

  if (collectionRate !== undefined && collectionRate < 70) {
    risks.push({
      title: 'Collection performance is weak',
      level: 'critical',
      summary: `Only ${collectionRate.toFixed(0)}% of expected cash has been collected.`,
      detail: `This vendor still carries GMD ${formatCurrency(balanceOwed)} outstanding, which increases cash exposure and may limit future supply.`,
      action: 'Prioritize collection follow-up and resolve unpaid amounts before extending more stock.',
      evidence: summaryEvidence,
    });
  } else if (collectionRate !== undefined && collectionRate < 80) {
    risks.push({
      title: 'Collection is lagging',
      level: 'high',
      summary: `Collected cash is ${collectionRate.toFixed(0)}% of expected sales.`,
      detail: 'Partial collection creates receivable risk and may reduce working capital for the vendor. ',
      action: 'Review payment timing and follow up on outstanding receipts.',
      evidence: summaryEvidence,
    });
  }

  if (daysRemaining !== undefined && daysRemaining < 5) {
    risks.push({
      title: 'Inventory coverage is low',
      level: daysRemaining < 3 ? 'critical' : 'high',
      summary: `Estimated coverage is about ${formatNumber(daysRemaining)} days.`,
      detail: 'Current stock is only enough for a few days of recent observed sales, increasing the risk of stockouts.',
      action: 'Plan replenishment for the most active products immediately.',
      evidence: summaryEvidence,
    });
  }

  if (salesMomentumLabel.includes('declining')) {
    risks.push({
      title: 'Sales momentum is weakening',
      level: 'high',
      summary: 'Recent activity is falling compared with the prior period.',
      detail: 'A downward shift in demand can reduce turnover and increase inventory risk.',
      action: 'Investigate whether product availability or market demand has changed.',
      evidence: summaryEvidence,
    });
  }

  if (lastVisitDate) {
    const lastVisit = new Date(lastVisitDate);
    const daysSinceLastVisit = Math.floor((Date.now() - lastVisit.getTime()) / 86400000);
    if (daysSinceLastVisit > 14) {
      risks.push({
        title: 'Recent visit activity is low',
        level: 'watch',
        summary: `No visit recorded for ${daysSinceLastVisit} days.`,
        detail: 'Less frequent visits can slow sales recovery and make collection follow-up harder.',
        action: 'Schedule a follow-up visit and verify current stock on hand.',
        evidence: summaryEvidence,
      });
    }
  }

  if (purchaseVelocityStatus === 'sparse_data') {
    risks.push({
      title: 'Historical visibility is limited',
      level: 'watch',
      summary: 'The vendor has sparse visit history over the chosen period.',
      detail: 'This reduces confidence in projections and suggests caution when making supply decisions.',
      action: 'Collect more visit and sales data before relying on long-term forecasts.',
      evidence: summaryEvidence,
    });
  }

  return risks;
}

function buildOpportunitySignals(
  salesMomentumLabel: string,
  collectionRate: number | undefined,
  productPerformanceList: ProductPerformance[],
  daysRemaining: number | undefined,
  evidence: Evidence[],
): IntelligenceSignal[] {
  const opportunities: IntelligenceSignal[] = [];
  const fastProduct = productPerformanceList.find((product) => product.movementClassification === 'fast');
  const slowProduct = productPerformanceList.find((product) => product.movementClassification === 'slow');
  const highConcentrationProduct = productPerformanceList.find((product) => (product.salesShare ?? 0) >= 50);

  if (fastProduct && fastProduct.currentStock <= 7) {
    opportunities.push({
      title: 'Replenish fast-moving stock',
      level: 'opportunity',
      summary: `The fast-moving product ${fastProduct.productName ?? fastProduct.productId} has low remaining stock.`,
      detail: `Current stock of ${fastProduct.currentStock} units is low against recent movement for this product.`,
      action: `Consider replenishing ${fastProduct.productName ?? fastProduct.productId} soon.`,
      evidence,
    });
  }

  if (highConcentrationProduct && (highConcentrationProduct.salesShare ?? 0) >= 50) {
    opportunities.push({
      title: 'High product concentration',
      level: 'opportunity',
      summary: `Sales are concentrated in ${highConcentrationProduct.productName ?? highConcentrationProduct.productId}.`,
      detail: 'This product drives a large share of vendor volume and should be kept available to support revenue.',
      action: `Keep ${highConcentrationProduct.productName ?? highConcentrationProduct.productId} well stocked.`,
      evidence,
    });
  }

  if (salesMomentumLabel.includes('accelerating') && collectionRate !== undefined && collectionRate >= 80) {
    opportunities.push({
      title: 'Convert momentum into reliable cash',
      level: 'opportunity',
      summary: 'Sales activity is strengthening while collection remains adequate.',
      detail: 'The vendor is generating momentum and is in a position to convert it into cash if collections stay on track.',
      action: 'Maintain supply of active products and monitor payment follow-through.',
      evidence,
    });
  }

  if (slowProduct) {
    opportunities.push({
      title: 'Review slow-moving inventory',
      level: 'opportunity',
      summary: `The product ${slowProduct.productName ?? slowProduct.productId} is moving slowly relative to recent demand.`,
      detail: 'This may be a chance to reassess assortment or shift stock to higher-demand items.',
      action: `Investigate ${slowProduct.productName ?? slowProduct.productId} for potential redistribution.`,
      evidence,
    });
  }

  if (opportunities.length === 0) {
    return [];
  }

  return opportunities;
}

function buildTrendSignals(
  recentUnitsSold: number,
  previousUnitsSold: number,
  recentCashCollected: number,
  previousCashCollected: number,
  recentExpectedCash: number,
  previousExpectedCash: number,
  currentCoverage: number | undefined,
  previousCoverage: number | undefined,
  currentVisitCount: number,
  previousVisitCount: number,
  evidence: Evidence[],
  hasTrendEvidence: boolean,
): TrendSignal[] {
  const collectionRateRecent = recentExpectedCash > 0 ? (recentCashCollected / recentExpectedCash) * 100 : undefined;
  const collectionRatePrevious = previousExpectedCash > 0 ? (previousCashCollected / previousExpectedCash) * 100 : undefined;
  const salesTrend = describeTrendDirection('Sales', recentUnitsSold, previousUnitsSold, hasTrendEvidence, 'units');
  const collectionTrend = describeTrendDirection('Collections', collectionRateRecent, collectionRatePrevious, hasTrendEvidence, '%');
  const visitTrend = describeTrendDirection('Visits', currentVisitCount, previousVisitCount, hasTrendEvidence, ' visits');
  const coverageTrend = describeTrendDirection('Coverage', currentCoverage, previousCoverage, hasTrendEvidence, ' days');

  return [
    {
      name: 'sales',
      label: 'Sales trend',
      currentValue: recentUnitsSold,
      previousValue: previousUnitsSold,
      direction: salesTrend.direction,
      note: salesTrend.note,
      evidence,
    },
    {
      name: 'collections',
      label: 'Collections trend',
      currentValue: collectionRateRecent,
      previousValue: collectionRatePrevious,
      direction: collectionTrend.direction,
      note: collectionTrend.note,
      evidence,
    },
    {
      name: 'activity',
      label: 'Visit trend',
      currentValue: currentVisitCount,
      previousValue: previousVisitCount,
      direction: visitTrend.direction,
      note: visitTrend.note,
      evidence,
    },
    {
      name: 'coverage',
      label: 'Stock coverage trend',
      currentValue: currentCoverage,
      previousValue: previousCoverage,
      direction: coverageTrend.direction,
      note: coverageTrend.note,
      evidence,
    },
  ];
}

function buildDataQualitySignals(
  visitHistoryStatus: SignalStatus,
  distinctVisitDays: number,
  windowDays: number,
  evidence: Evidence[],
): IntelligenceSignal[] {
  const signals: IntelligenceSignal[] = [];

  if (visitHistoryStatus === 'no_history') {
    signals.push({
      title: 'No historical visit data',
      level: 'watch',
      summary: 'No confirmed visits are available for this vendor within the selected period.',
      detail: 'Without visit history, trend and coverage estimates are unreliable.',
      action: 'Collect visit and sales data before making significant inventory or payment decisions.',
      evidence,
    });
    return signals;
  }

  if (visitHistoryStatus === 'insufficient_data') {
    signals.push({
      title: 'Insufficient historical coverage',
      level: 'watch',
      summary: 'Visit history exists but is too thin to establish reliable trends.',
      detail: 'Some conclusions may be provisional until more visits occur.',
      action: 'Increase visit frequency and log consistent entries.',
      evidence,
    });
  }

  if (visitHistoryStatus === 'sparse_data' || distinctVisitDays / Math.max(windowDays, 1) < 0.25) {
    signals.push({
      title: 'Sparse history',
      level: 'watch',
      summary: 'The vendor has sparse visit history relative to the selected timeframe.',
      detail: 'Estimates may carry higher uncertainty when visit coverage is thin.',
      action: 'Extend the observation window or add more visit entries for better visibility.',
      evidence,
    });
  }

  return signals;
}

function buildProductIntelligence(
  products: ProductPerformance[],
  currentStockMap: Map<string, number>,
  evidence: Evidence[],
  currentStockDate?: string,
): ProductIntelligence[] {
  return products
    .map((product) => {
      const stock = currentStockMap.get(product.productId) ?? product.currentStock;
      const coverageDays = product.unitsSold > 0 && stock > 0 && product.visitCount > 0
        ? computeDaysRemaining(stock, product.unitsSold / Math.max(product.visitCount, 1))
        : undefined;
      const hasProductTrendEvidence = product.visitCount >= 3 && product.firstSaleDate && product.lastSaleDate && product.firstSaleDate !== product.lastSaleDate;
      let trendDirection: TrendDirection = 'insufficient_data';
      let trendLabel = 'Not enough product-level history is available to determine a trend.';
      if (hasProductTrendEvidence) {
        trendDirection = 'flat';
        trendLabel = product.movementClassification === 'fast'
          ? 'Product movement is fast relative to current stock coverage.'
          : product.movementClassification === 'slow'
          ? 'Product movement is slow relative to recent sales.'
          : product.movementClassification === 'not_moving'
          ? 'No sales movement has been recorded for this product.'
          : 'Product movement is within a normal range.';
      }

      let recommendedAction: string | undefined;
      if (coverageDays !== undefined && coverageDays < 5 && product.currentStock > 0) {
        recommendedAction = `Replenish ${product.productName ?? product.productId} soon; coverage is ${formatNumber(coverageDays)} days.`;
      } else if (product.unitsSold > 0 && product.currentStock === 0) {
        recommendedAction = `Replenish ${product.productName ?? product.productId} immediately; recent demand exists but no stock remains.`;
      } else if (product.unitsSold === 0 && product.currentStock > 0 && product.visitCount >= 2) {
        recommendedAction = `Investigate ${product.productName ?? product.productId}; stock exists but recent movement is weak.`;
      } else if (product.salesShare !== undefined && product.salesShare >= 25) {
        recommendedAction = `Maintain supply of ${product.productName ?? product.productId}; it accounts for ${product.salesShare.toFixed(0)}% of sales.`;
      }

      return {
        productId: product.productId,
        productName: product.productName,
        category: product.category,
        unit: product.unit,
        currentStock: stock,
        unitsSold: product.unitsSold,
        salesValue: product.salesValue,
        expectedValue: product.expectedValue,
        salesShare: product.salesShare,
        averageUnitPrice: product.averageUnitPrice,
        coverageDays,
        movementClassification: product.movementClassification,
        trendDirection,
        trendLabel,
        recommendedAction,
        evidence,
      };
    })
    .sort((a, b) => {
      const score = (item: ProductIntelligence) => {
        if (item.recommendedAction?.includes('immediately')) return 100;
        if (item.recommendedAction?.includes('Replenish')) return 90;
        if (item.recommendedAction?.includes('Investigate')) return 80;
        if (item.movementClassification === 'fast') return 70;
        if (item.movementClassification === 'slow') return 60;
        if (item.salesShare !== undefined) return item.salesShare;
        return 0;
      };
      return score(b) - score(a);
    });
}

function selectTopSignals(signals: IntelligenceSignal[], limit = 3): IntelligenceSignal[] {
  return [...signals]
    .sort((a, b) => {
      const rank = (level: IntelligenceSignalLevel) => {
        switch (level) {
          case 'critical': return 100;
          case 'high': return 80;
          case 'watch': return 60;
          case 'opportunity': return 40;
          default: return 20;
        }
      };
      return rank(b.level) - rank(a.level);
    })
    .slice(0, limit);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number): string {
  return `GMD ${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)}`;
}

function classifyProductMovement(currentStock: number, unitsSold: number, windowDays: number) {
  if (unitsSold === 0) {
    return 'not_moving' as const;
  }
  const averageDailyUnits = windowDays > 0 ? unitsSold / windowDays : 0;
  if (averageDailyUnits <= 0) {
    return 'not_moving' as const;
  }
  const stockRemainingDays = computeDaysRemaining(currentStock, averageDailyUnits);
  if (stockRemainingDays === undefined) {
    return 'normal' as const;
  }
  if (stockRemainingDays < 7) {
    return 'fast' as const;
  }
  if (stockRemainingDays <= 21) {
    return 'normal' as const;
  }
  return 'slow' as const;
}

function buildSummary(
  vendorName: string | undefined,
  vendorLocation: string | undefined,
  totalUnitsSold: number,
  totalExpectedCash: number,
  totalCashCollected: number,
  averageDailyUnits: number,
  averageDailyValue: number,
  totalStockUnits: number,
  outstandingBalance: number,
  collectionRate: number | undefined,
  salesMomentumLabel: string,
  salesMomentumChange: number | undefined,
  daysRemaining: number | undefined,
  visitHistoryStatus: SignalStatus,
  distinctVisitDays: number,
  windowDays: number,
  productCount: number,
  evidence: Evidence[],
): IntelligenceSummary {
  const keyIssues: string[] = [];
  const actions: string[] = [];

  if (visitHistoryStatus !== 'ok') {
    keyIssues.push('Historical visit coverage is limited, so some estimates are provisional.');
  }

  if (collectionRate !== undefined) {
    if (collectionRate < 80) {
      keyIssues.push(`Collection performance is weak at ${collectionRate.toFixed(0)}% of expected cash.`);
      actions.push('Prioritize receivable collection for this vendor.');
    } else if (collectionRate < 90) {
      keyIssues.push(`Collection is moderate at ${collectionRate.toFixed(0)}% of expected cash.`);
    }
  }

  if (daysRemaining !== undefined) {
    if (daysRemaining < 5) {
      keyIssues.push(`Estimated stock coverage is low at about ${formatNumber(daysRemaining)} days.`);
      actions.push('Plan replenishment for the vendor soon.');
    } else if (daysRemaining <= 14) {
      keyIssues.push(`Stock coverage is limited at roughly ${formatNumber(daysRemaining)} days.`);
    }
  }

  if (salesMomentumLabel.includes('accelerating')) {
    actions.push('Leverage recent sales momentum to keep the most active products in stock.');
  }

  if (totalStockUnits === 0 && totalUnitsSold > 0) {
    keyIssues.push('No current stock is recorded despite recent sales activity.');
    actions.push('Verify inventory records and restock quickly.');
  }

  const headline = vendorName
    ? `${vendorName} intelligence: ${keyIssues.length > 0 ? keyIssues[0] : salesMomentumLabel}`
    : `Vendor intelligence: ${keyIssues.length > 0 ? keyIssues[0] : salesMomentumLabel}`;

  const whatIsHappening = keyIssues.length > 0
    ? keyIssues.join(' ')
    : `Recent activity is steady with ${totalUnitsSold} units recorded and no critical issues flagged.`;

  const whyItMatters = outstandingBalance > 0 && daysRemaining !== undefined
    ? `This matters because the vendor currently carries GMD ${formatNumber(outstandingBalance)} outstanding while estimated coverage is only ${formatNumber(daysRemaining)} days.`
    : outstandingBalance > 0
    ? `This matters because the vendor currently carries GMD ${formatNumber(outstandingBalance)} outstanding.`
    : daysRemaining !== undefined
    ? `This matters because estimated coverage is ${formatNumber(daysRemaining)} days, which may leave little buffer if sales continue.`
    : 'This matters because current data coverage is limited and the estimates are therefore less certain.';

  const whatToDo = actions.length > 0
    ? actions.filter((value, index, self) => self.indexOf(value) === index).join(' ')
    : 'Monitor the vendor closely and keep stock levels aligned with recent sales activity.';

  const dataQualityScore = visitHistoryStatus === 'ok' && distinctVisitDays >= 8 && windowDays >= 21 ? 2 : 1;
  const confidence = dataQualityScore >= 2 && collectionRate !== undefined && totalUnitsSold >= 10 ? 'strong' : dataQualityScore === 1 ? 'moderate' : 'limited';

  return {
    headline,
    explanation: `Based on ${evidence.reduce((sum, item) => sum + item.rowCount, 0)} confirmed visit records, ${whatIsHappening.toLowerCase()}`,
    whatIsHappening,
    whyItMatters,
    whatToDo,
    confidence,
    evidence,
  };
}


function buildOpportunities(
  salesMomentumLabel: string,
  collectionRate: number | undefined,
  productPerformanceList: ProductPerformance[],
  daysRemaining: number | undefined,
  evidence: Evidence[],
): IntelligenceAction[] {
  const actions: IntelligenceAction[] = [];

  const fastProduct = productPerformanceList.find((product) => product.movementClassification === 'fast');
  if (fastProduct) {
    actions.push({
      title: 'Prioritize fast-moving stock',
      description: `Focus follow-up visits on ${fastProduct.productName ?? fastProduct.productId}, which is selling quickly and may need replenishment soon.`,
      evidence,
    });
  }

  const slowProduct = productPerformanceList.find((product) => product.movementClassification === 'slow');
  if (slowProduct) {
    actions.push({
      title: 'Review slow-moving inventory',
      description: `Investigate why ${slowProduct.productName ?? slowProduct.productId} is not converting through sales as expected.`,
      evidence,
    });
  }

  if (collectionRate !== undefined && collectionRate < 90) {
    actions.push({
      title: 'Follow up on cash collection',
      description: `Cash is collecting at ${collectionRate.toFixed(0)}% of expected value, so a payment review is advised.`,
      evidence,
    });
  }

  if (salesMomentumLabel.includes('accelerating')) {
    actions.push({
      title: 'Leverage positive momentum',
      description: 'Use recent sales strength to maintain coverage on the most active products.',
      evidence,
    });
  }

  if (daysRemaining !== undefined && daysRemaining < 7) {
    actions.push({
      title: 'Plan resupply quickly',
      description: 'Inventory coverage is below one week, making a restock action prudent.',
      evidence,
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: 'No immediate action required',
      description: 'Available evidence does not indicate a pronounced operational risk or opportunity.',
      evidence,
    });
  }

  return actions;
}

export async function getVendorIntelligence(
  vendorId: string,
  options: VendorIntelligenceOptions = {},
): Promise<VendorIntelligence> {
  const filters: string[] = ['vl.vendor_id = :vendor_id', 'COALESCE(vl.is_reversed, 0) = 0'];
  const params: Record<string, unknown> = { vendor_id: vendorId };

  if (options.startDate) {
    filters.push('date >= :startDate');
    params.startDate = options.startDate;
  }
  if (options.endDate) {
    filters.push('date <= :endDate');
    params.endDate = options.endDate;
  }
  if (options.productId) {
    filters.push('product_id = :productId');
    params.productId = options.productId;
  }
  if (options.salesRepId) {
    filters.push('sales_rep_id = :salesRepId');
    params.salesRepId = options.salesRepId;
  }
  if (options.market) {
    filters.push('v.location = :market');
    params.market = options.market;
  }

  const whereClause = `WHERE ${filters.join(' AND ')}`;
  const filterDescription = createFilterDescription(vendorId, options);

  const [vendorNameRows] = await query<any[]>(
    'SELECT vendor_name, location FROM vendors WHERE vendor_id = ? LIMIT 1',
    [vendorId],
  );
  const vendorName = vendorNameRows[0]?.vendor_name ? String(vendorNameRows[0].vendor_name) : undefined;
  const vendorLocation = vendorNameRows[0]?.location ? String(vendorNameRows[0].location) : undefined;

  const [inventoryRows] = await query<Array<{ totalStockUnits: string; productCount: string }>>(
    `SELECT COALESCE(SUM(current_stock), 0) AS totalStockUnits, COUNT(*) AS productCount FROM vendor_inventory WHERE vendor_id = ?`,
    [vendorId],
  );
  const totalStockUnits = toNumber(inventoryRows[0]?.totalStockUnits ?? 0);
  const productCount = toNumber(inventoryRows[0]?.productCount ?? 0);
  const currentInventoryEvidence = buildEvidence(
    'vendor_inventory',
    ['vendor_id', 'product_id', 'current_stock'],
    `vendor_id = ${vendorId}`,
    productCount,
  );
  const currentInventorySignal: Signal<{ totalStockUnits: number; totalProducts: number }> = {
    name: 'currentInventory',
    value: { totalStockUnits, totalProducts: productCount },
    status: productCount > 0 ? 'ok' : 'no_history',
    evidence: [currentInventoryEvidence],
  };

  type VisitSummaryRow = {
    visitCount: string;
    distinctVisitDays: string;
    totalUnitsSold: string;
    totalExpectedCash: string;
    totalCashCollected: string;
    firstVisitDate: string | null;
    lastVisitDate: string | null;
  };

  const visitJoinClause = options.market ? 'INNER JOIN vendors v ON v.vendor_id = vl.vendor_id' : '';

  const [visitSummaryRows] = await query<VisitSummaryRow[]>(
    `SELECT
       COUNT(*) AS visitCount,
       COUNT(DISTINCT vl.date) AS distinctVisitDays,
       COALESCE(SUM(vl.stock_sold), 0) AS totalUnitsSold,
       COALESCE(SUM(vl.expected_cash), 0) AS totalExpectedCash,
       COALESCE(SUM(vl.cash_collected), 0) AS totalCashCollected,
       MIN(vl.date) AS firstVisitDate,
       MAX(vl.date) AS lastVisitDate
     FROM visit_logs vl
     ${visitJoinClause}
     ${whereClause}`,
    params,
  );
  const visitSummary = visitSummaryRows[0] ?? {
    visitCount: '0',
    distinctVisitDays: '0',
    totalUnitsSold: '0',
    totalExpectedCash: '0',
    totalCashCollected: '0',
    firstVisitDate: null,
    lastVisitDate: null,
  };

  const visitCount = toNumber(visitSummary.visitCount);
  const distinctVisitDays = toNumber(visitSummary.distinctVisitDays);
  const totalUnitsSold = toNumber(visitSummary.totalUnitsSold);
  const totalExpectedCash = toNumber(visitSummary.totalExpectedCash);
  const totalCashCollected = toNumber(visitSummary.totalCashCollected);
  const firstVisitDate = normalizeDate(visitSummary.firstVisitDate);
  const lastVisitDate = normalizeDate(visitSummary.lastVisitDate);
  const windowDays = lastVisitDate && firstVisitDate ? Math.max(1, Math.ceil((new Date(lastVisitDate).getTime() - new Date(firstVisitDate).getTime()) / 86400000) + 1) : 0;
  const visitHistoryStatus = determineHistoryStatus(visitCount, distinctVisitDays, windowDays);

  const visitEvidence = buildEvidence(
    'visit_logs',
    ['vendor_id', 'product_id', 'date', 'stock_sold', 'expected_cash', 'cash_collected', 'is_reversed'],
    createVisitEvidenceDescription(vendorId, options),
    visitCount,
    firstVisitDate && lastVisitDate ? { start: firstVisitDate, end: lastVisitDate } : undefined,
  );

  const salesVolumeSignal: Signal<{ totalUnitsSold: number; totalSalesValue: number; totalCashCollected: number }> = {
    name: 'salesVolume',
    value: {
      totalUnitsSold,
      totalSalesValue: totalExpectedCash,
      totalCashCollected,
    },
    status: visitCount > 0 ? 'ok' : 'no_history',
    evidence: [visitEvidence],
  };

  const averageDailyUnits = windowDays > 0 ? totalUnitsSold / windowDays : 0;
  const averageDailyValue = windowDays > 0 ? totalExpectedCash / windowDays : 0;
  const salesVelocitySignal: Signal<{ averageDailyUnits?: number; averageDailyValue?: number; visitCount: number; windowDays: number }> = {
    name: 'salesVelocity',
    value: {
      averageDailyUnits: visitHistoryStatus === 'ok' || visitHistoryStatus === 'sparse_data' ? averageDailyUnits : undefined,
      averageDailyValue: visitHistoryStatus === 'ok' || visitHistoryStatus === 'sparse_data' ? averageDailyValue : undefined,
      visitCount,
      windowDays,
    },
    status: visitHistoryStatus,
    evidence: [visitEvidence],
  };

  const stockRemainingStatus = determineStockRemainingStatus(visitHistoryStatus, totalStockUnits, totalUnitsSold);
  const stockRemainingValue = visitHistoryStatus === 'ok'
    ? computeDaysRemaining(totalStockUnits, averageDailyUnits)
    : undefined;
  const stockRemainingSignal: Signal<{ daysRemaining?: number; method?: 'averageDailySales'; coverageNote?: string }> = {
    name: 'stockRemaining',
    value: {
      daysRemaining: stockRemainingValue,
      ...(stockRemainingValue !== undefined ? { method: 'averageDailySales', coverageNote: `Estimated coverage: ~${formatNumber(stockRemainingValue)} days based on recent observed sales.` } : { coverageNote: 'Insufficient history to estimate coverage.' }),
    },
    status: stockRemainingStatus,
    evidence: [visitEvidence, currentInventoryEvidence],
  };

  const lastVisitSignal: Signal<{ lastVisitDate?: string }> = {
    name: 'lastVisit',
    value: { lastVisitDate: lastVisitDate ?? undefined },
    status: visitCount > 0 ? 'ok' : 'no_history',
    evidence: [visitEvidence],
  };

  const visitFrequencySignal: Signal<{ visitCount: number; distinctVisitDays: number; averageDaysBetweenVisits?: number }> = {
    name: 'visitFrequency',
    value: {
      visitCount,
      distinctVisitDays,
      averageDaysBetweenVisits: undefined,
    },
    status: visitHistoryStatus,
    evidence: [visitEvidence],
  };

  if (distinctVisitDays >= 2 && firstVisitDate && lastVisitDate) {
    const [dateRows] = await query<Array<{ date: string }>>(
      `SELECT DISTINCT vl.date FROM visit_logs vl ${visitJoinClause} ${whereClause} ORDER BY vl.date ASC`,
      params,
    );
    const dates = dateRows.map((row) => normalizeDate(row.date)).filter(Boolean) as string[];
    if (dates.length >= 2) {
      const intervals = dates.slice(1).map((date, index) => {
        const prev = new Date(dates[index]);
        return (new Date(date).getTime() - prev.getTime()) / 86400000;
      });
      const averageDaysBetweenVisits = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      visitFrequencySignal.value.averageDaysBetweenVisits = averageDaysBetweenVisits;
    }
  }

  const [balanceRows] = await query<Array<{ total_expected_cash: string; cash_collected: string; balance_owed: string }>>(
    'SELECT total_expected_cash, cash_collected, balance_owed FROM vendor_balances WHERE vendor_id = ? LIMIT 1',
    [vendorId],
  );
  const balanceRow = balanceRows[0];
  const outstandingBalance = balanceRow ? toNumber(balanceRow.balance_owed) : 0;
  const totalExpectedCashBalance = balanceRow ? toNumber(balanceRow.total_expected_cash) : 0;
  const totalCashCollectedBalance = balanceRow ? toNumber(balanceRow.cash_collected) : 0;
  const balanceEvidence = buildEvidence(
    'vendor_balances',
    ['vendor_id', 'total_expected_cash', 'cash_collected', 'balance_owed'],
    `vendor_id = ${vendorId}`,
    balanceRow ? 1 : 0,
  );
  const outstandingBalanceSignal: Signal<{ balanceOwed: number; positiveReceivables: number; vendorCredits: number; totalExpectedCash: number; totalCashCollected: number }> = {
    name: 'outstandingBalance',
    value: {
      balanceOwed: outstandingBalance,
      positiveReceivables: Math.max(outstandingBalance, 0),
      vendorCredits: Math.abs(Math.min(outstandingBalance, 0)),
      totalExpectedCash: totalExpectedCashBalance,
      totalCashCollected: totalCashCollectedBalance,
    },
    status: balanceRow ? 'ok' : 'no_history',
    evidence: [balanceEvidence],
  };

  const paymentMetricsSignal: Signal<{ totalCashCollected: number; totalExpectedCash: number; collectionRate?: number; paymentMethodBreakdown: Record<string, number> }> = {
    name: 'paymentMetrics',
    value: {
      totalCashCollected,
      totalExpectedCash,
      collectionRate: totalExpectedCash > 0 ? (totalCashCollected / totalExpectedCash) * 100 : undefined,
      paymentMethodBreakdown: {},
    },
    status: visitCount > 0 ? 'ok' : 'no_history',
    evidence: [visitEvidence],
  };

  const [paymentRows] = await query<Array<{ paymentMethod: string | null; cashCollected: string }>>(
    `SELECT COALESCE(payment_method, 'unknown') AS paymentMethod, COALESCE(SUM(cash_collected), 0) AS cashCollected FROM visit_logs vl ${visitJoinClause} ${whereClause} GROUP BY COALESCE(payment_method, 'unknown')`,
    params,
  );
  for (const row of paymentRows) {
    paymentMetricsSignal.value.paymentMethodBreakdown[row.paymentMethod ?? 'unknown'] = toNumber(row.cashCollected);
  }

  const recentWindowDays = 14;
  const recentEndDate = lastVisitDate ? new Date(lastVisitDate) : null;
  const recentStartDate = recentEndDate ? new Date(recentEndDate) : null;
  if (recentStartDate && recentEndDate) {
    recentStartDate.setDate(recentEndDate.getDate() - (recentWindowDays - 1));
  }
  let recentUnitsSold = 0;
  let recentExpectedCash = 0;
  let recentCashCollected = 0;
  let previousUnitsSold = 0;
  let previousExpectedCash = 0;
  let previousCashCollected = 0;
  let recentRows: Array<{ unitsSold: string; expectedCash: string; cashCollected: string; visitCount: string }> = [
    { unitsSold: '0', expectedCash: '0', cashCollected: '0', visitCount: '0' },
  ];
  let previousRows: Array<{ unitsSold: string; expectedCash: string; cashCollected: string; visitCount: string }> = [
    { unitsSold: '0', expectedCash: '0', cashCollected: '0', visitCount: '0' },
  ];
  if (recentStartDate) {
    const recentStart = recentStartDate.toISOString().slice(0, 10);
    const recentEnd = recentEndDate!.toISOString().slice(0, 10);
    const previousEndDate = new Date(recentStartDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - (recentWindowDays - 1));
    const previousStart = previousStartDate.toISOString().slice(0, 10);
    const previousEnd = previousEndDate.toISOString().slice(0, 10);

    const [fetchedRecentRows] = await query<Array<{ unitsSold: string; expectedCash: string; cashCollected: string; visitCount: string }>>(
      `SELECT
         COALESCE(SUM(vl.stock_sold), 0) AS unitsSold,
         COALESCE(SUM(vl.expected_cash), 0) AS expectedCash,
         COALESCE(SUM(vl.cash_collected), 0) AS cashCollected,
         COUNT(*) AS visitCount
       FROM visit_logs vl
       ${visitJoinClause}
       ${whereClause}
         AND vl.date BETWEEN :recentStart AND :recentEnd`,
      { ...params, recentStart, recentEnd },
    );

    const [fetchedPreviousRows] = await query<Array<{ unitsSold: string; expectedCash: string; cashCollected: string; visitCount: string }>>(
      `SELECT
         COALESCE(SUM(vl.stock_sold), 0) AS unitsSold,
         COALESCE(SUM(vl.expected_cash), 0) AS expectedCash,
         COALESCE(SUM(vl.cash_collected), 0) AS cashCollected,
         COUNT(*) AS visitCount
       FROM visit_logs vl
       ${visitJoinClause}
       ${whereClause}
         AND vl.date BETWEEN :previousStart AND :previousEnd`,
      { ...params, previousStart, previousEnd },
    );

    recentRows = fetchedRecentRows;
    previousRows = fetchedPreviousRows;
    recentUnitsSold = toNumber(recentRows[0]?.unitsSold);
    recentExpectedCash = toNumber(recentRows[0]?.expectedCash);
    recentCashCollected = toNumber(recentRows[0]?.cashCollected);
    previousUnitsSold = toNumber(previousRows[0]?.unitsSold);
    previousExpectedCash = toNumber(previousRows[0]?.expectedCash);
    previousCashCollected = toNumber(previousRows[0]?.cashCollected);
  }

  const recentAverageDailyUnits = recentWindowDays > 0 ? recentUnitsSold / recentWindowDays : 0;
  const previousAverageDailyUnits = recentWindowDays > 0 ? previousUnitsSold / recentWindowDays : 0;
  const recentVisitCount = recentRows[0] ? toNumber(recentRows[0].visitCount) : 0;
  const previousVisitCount = previousRows[0] ? toNumber(previousRows[0].visitCount) : 0;
  const salesMomentumChange = previousAverageDailyUnits > 0 ? recentAverageDailyUnits - previousAverageDailyUnits : undefined;
  let salesMomentumLabel = 'Sales activity is stable';
  if (recentUnitsSold === 0 && previousUnitsSold === 0) {
    salesMomentumLabel = 'No confirmed sales activity in the recent period';
  } else if (previousUnitsSold === 0 && recentUnitsSold > 0) {
    salesMomentumLabel = 'Sales momentum is building';
  } else if (salesMomentumChange !== undefined && salesMomentumChange > previousAverageDailyUnits * 0.15) {
    salesMomentumLabel = 'Sales momentum is accelerating';
  } else if (salesMomentumChange !== undefined && salesMomentumChange < -previousAverageDailyUnits * 0.15) {
    salesMomentumLabel = 'Sales momentum is declining';
  }

  const previousCoverage = previousAverageDailyUnits > 0 ? computeDaysRemaining(totalStockUnits, previousAverageDailyUnits) : undefined;

  const summaryEvidence = [visitEvidence, currentInventoryEvidence, balanceEvidence];
  const summary = buildSummary(
    vendorName,
    vendorLocation,
    totalUnitsSold,
    totalExpectedCash,
    totalCashCollected,
    averageDailyUnits,
    averageDailyValue,
    totalStockUnits,
    outstandingBalance,
    paymentMetricsSignal.value.collectionRate,
    salesMomentumLabel,
    salesMomentumChange,
    stockRemainingValue,
    visitHistoryStatus,
    distinctVisitDays,
    windowDays,
    productCount,
    summaryEvidence,
  );

  type ProductRow = {
    product_id: string;
    product_name: string;
    category: string;
    unit: string;
    unitsSold: string;
    expectedValue: string;
    cashCollected: string;
    firstSaleDate: string | null;
    lastSaleDate: string | null;
    windowDays: string;
    visitCount: string;
  };

  const [productRows] = await query<ProductRow[]>(
    `SELECT
       vl.product_id,
       COALESCE(p.product_name, '') AS product_name,
       COALESCE(p.category, '') AS category,
       COALESCE(p.unit, '') AS unit,
       COALESCE(SUM(vl.stock_sold), 0) AS unitsSold,
       COALESCE(SUM(vl.expected_cash), 0) AS expectedValue,
       COALESCE(SUM(vl.cash_collected), 0) AS cashCollected,
       MIN(vl.date) AS firstSaleDate,
       MAX(vl.date) AS lastSaleDate,
       COALESCE(DATEDIFF(MAX(vl.date), MIN(vl.date)) + 1, 0) AS windowDays,
       COUNT(*) AS visitCount
     FROM visit_logs vl
     LEFT JOIN products p ON p.product_id = vl.product_id
     ${visitJoinClause}
     ${whereClause}
     GROUP BY vl.product_id
     ORDER BY expectedValue DESC`,
    params,
  );

  const [inventoryByProductRows] = await query<Array<{ product_id: string; current_stock: string }>>(
    'SELECT product_id, current_stock FROM vendor_inventory WHERE vendor_id = ?',
    [vendorId],
  );
  const inventoryByProduct = new Map(inventoryByProductRows.map((row) => [row.product_id, toNumber(row.current_stock)]));

  const productPerformanceList: ProductPerformance[] = productRows.map((row) => {
    const productId = row.product_id;
    const unitsSold = toNumber(row.unitsSold);
    const expectedValue = toNumber(row.expectedValue);
    const cashCollected = toNumber(row.cashCollected);
    const firstSaleDate = normalizeDate(row.firstSaleDate);
    const lastSaleDate = normalizeDate(row.lastSaleDate);
    const windowDaysProduct = toNumber(row.windowDays);
    const averageUnitPrice = computeAverageUnitPrice(expectedValue, unitsSold);
    const currentStockByProduct = inventoryByProduct.get(productId) ?? 0;
    const movementClassification = classifyProductMovement(currentStockByProduct, unitsSold, windowDaysProduct);
    const stockRemainingDays = computeDaysRemaining(currentStockByProduct, unitsSold > 0 ? unitsSold / windowDaysProduct : 0);
    return {
      productId,
      productName: row.product_name,
      category: row.category,
      unit: row.unit,
      unitsSold,
      salesValue: expectedValue,
      expectedValue,
      averageUnitPrice,
      currentStock: currentStockByProduct,
      stockRemainingDays,
      movementClassification,
      visitCount: toNumber(row.visitCount),
      firstSaleDate,
      lastSaleDate,
    };
  });

  const totalSoldForShare = totalUnitsSold || 1;
  productPerformanceList.forEach((item) => {
    if (totalUnitsSold > 0) {
      item.salesShare = Number(((item.unitsSold / totalSoldForShare) * 100).toFixed(1));
    }
  });

  const productPerformanceSignal: Signal<ProductPerformance[]> = {
    name: 'productPerformance',
    value: productPerformanceList,
    status: productPerformanceList.length > 0 ? 'ok' : 'no_history',
    evidence: [
      buildEvidence(
        'visit_logs',
        ['vendor_id', 'product_id', 'stock_sold', 'expected_cash', 'cash_collected', 'date', 'is_reversed'],
        createVisitEvidenceDescription(vendorId, options),
        productPerformanceList.length,
      ),
      buildEvidence(
        'vendor_inventory',
        ['vendor_id', 'product_id', 'current_stock'],
        `vendor_id = ${vendorId}`,
        inventoryByProductRows.length,
      ),
    ],
  };

  const vendorRisks = buildRiskSignals(
    salesMomentumLabel,
    outstandingBalance,
    paymentMetricsSignal.value.collectionRate,
    stockRemainingValue,
    visitHistoryStatus,
    lastVisitDate,
    summaryEvidence,
  );

  const vendorOpportunities = buildOpportunitySignals(
    salesMomentumLabel,
    paymentMetricsSignal.value.collectionRate,
    productPerformanceList,
    stockRemainingValue,
    summaryEvidence,
  );

  const dataQualitySignals = buildDataQualitySignals(
    visitHistoryStatus,
    distinctVisitDays,
    windowDays,
    summaryEvidence,
  );

  const assessment = determineOverallAssessment(
    visitHistoryStatus,
    stockRemainingValue,
    paymentMetricsSignal.value.collectionRate,
    lastVisitDate,
    vendorRisks,
  );

  const trendEvidenceAvailable = hasEnoughTrendEvidence(
    visitHistoryStatus,
    distinctVisitDays,
    windowDays,
    recentVisitCount,
    previousVisitCount,
  );

  const trendSignals = buildTrendSignals(
    recentUnitsSold,
    previousUnitsSold,
    recentCashCollected,
    previousCashCollected,
    recentExpectedCash,
    previousExpectedCash,
    stockRemainingValue,
    previousCoverage,
    recentVisitCount,
    previousVisitCount,
    summaryEvidence,
    trendEvidenceAvailable,
  );

  const topSignals = selectTopSignals([...vendorRisks, ...vendorOpportunities], 4);
  const productIntelligence = buildProductIntelligence(productPerformanceList, inventoryByProduct, summaryEvidence, lastVisitDate);

  return {
    vendorId,
    vendorName,
    summary,
    assessment,
    topSignals,
    trendSignals,
    statusSummary: {
      currentStock: totalStockUnits,
      recentSales: totalUnitsSold,
      balanceOwed: outstandingBalance,
      collectionRate: paymentMetricsSignal.value.collectionRate,
      stockCoverageDays: stockRemainingValue,
    },
    salesVolume: salesVolumeSignal,
    salesVelocity: salesVelocitySignal,
    currentInventory: currentInventorySignal,
    stockRemaining: stockRemainingSignal,
    lastVisit: lastVisitSignal,
    visitFrequency: visitFrequencySignal,
    outstandingBalance: outstandingBalanceSignal,
    paymentMetrics: paymentMetricsSignal,
    productPerformance: productPerformanceSignal,
    risks: vendorRisks,
    opportunities: vendorOpportunities,
    productIntelligence,
    dataQualitySignals,
  };
}

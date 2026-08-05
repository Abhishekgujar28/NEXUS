export interface FeasibilityAssessment {
  businessFeasibilityScore: number; // 0 - 100
  technicalFeasibilityScore: number; // 0 - 100
  overallViability: 'high' | 'medium' | 'low';
  keyRisks: string[];
  recommendations: string[];
}

export const evaluateFeasibility = (
  projectTitle: string,
  description: string,
  gapsCount: number,
  solutionsCount: number
): FeasibilityAssessment => {
  const technicalFeasibilityScore = Math.max(40, Math.min(95, 90 - gapsCount * 5));
  const businessFeasibilityScore = Math.max(50, Math.min(95, 75 + solutionsCount * 3));

  const avg = (technicalFeasibilityScore + businessFeasibilityScore) / 2;
  const overallViability = avg >= 75 ? 'high' : avg >= 55 ? 'medium' : 'low';

  return {
    businessFeasibilityScore,
    technicalFeasibilityScore,
    overallViability,
    keyRisks: [
      'Integration complexity with external APIs',
      'Scalability bottlenecks under peak concurrent load',
      'Evolving domain regulatory constraints',
    ],
    recommendations: [
      'Implement asynchronous job queues for long-running workflows',
      'Deploy multi-layer caching to reduce external provider latency',
      'Adopt decoupled microservice boundaries for core domain entities',
    ],
  };
};

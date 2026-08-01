export interface QualityScores {
  scalabilityScore: number;
  securityScore: number;
  maintainabilityScore: number;
  performanceScore: number;
}

export const computeQualityScores = (
  sourcesCount: number,
  gapsCount: number,
  critiqueScore?: number
): QualityScores => {
  const base = Math.min(90, 60 + sourcesCount * 2);
  const penalty = gapsCount * 3;

  return {
    scalabilityScore: Math.max(30, Math.min(98, base - penalty + 10)),
    securityScore: Math.max(40, Math.min(95, base - penalty + 5)),
    maintainabilityScore: Math.max(40, Math.min(95, base - penalty + 8)),
    performanceScore: Math.max(35, Math.min(96, Math.round((critiqueScore || 80) * 0.95))),
  };
};

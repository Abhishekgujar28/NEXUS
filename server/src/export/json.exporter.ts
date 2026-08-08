import { ResearchExportData } from './export.types.js';

export const buildJsonReport = (data: ResearchExportData): string => {
  return JSON.stringify(
    {
      nexusVersion: '2.0.0',
      exportedAt: new Date().toISOString(),
      report: data,
    },
    null,
    2
  );
};

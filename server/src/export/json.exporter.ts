import { ProjectExportData } from './markdown.exporter.js';

export const buildJsonReport = (data: ProjectExportData): string => {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: '2.0.0',
      data,
    },
    null,
    2
  );
};

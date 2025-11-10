import { ExportFormat, ExportOptions } from '../types';

export interface ExportService {
  exportTestData(batchId: string, format: ExportFormat, options?: ExportOptions): Promise<string>;
}

export class TestExportService implements ExportService {
  async exportTestData(batchId: string, format: ExportFormat, options?: ExportOptions): Promise<string> {
    try {
      const { ExportTestData } = await import('../wailsjs/go/main/App');
      return await ExportTestData(batchId, format, options || {});
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Failed to export test data: ${error}`);
    }
  }
}

export const exportService = new TestExportService();
import { useState } from 'react';
import { ExportFormat, ExportOptions } from '../types';

export interface ExportState {
  isExporting: boolean;
  error: string | null;
}

export const useExport = () => {
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    error: null
  });

  const exportData = async (batchId: string, format: ExportFormat, options?: ExportOptions) => {
    setExportState({ isExporting: true, error: null });

    try {
      const { ExportTestData } = await import('../wailsjs/go/main/App');
      const filePath = await ExportTestData(batchId, format, options || {});

      setExportState({ isExporting: false, error: null });
      return filePath;
    } catch (error) {
      const errorMessage = `导出失败: ${error}`;
      setExportState({ isExporting: false, error: errorMessage });
      throw error;
    }
  };

  return {
    exportState,
    exportData
  };
};
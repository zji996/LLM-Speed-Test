import { useCallback, useEffect, useState } from 'react';

export interface ExportDirectoryState {
  directory: string;
  loading: boolean;
  error: string | null;
}

export const useExportDirectory = () => {
  const [state, setState] = useState<ExportDirectoryState>({
    directory: '',
    loading: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));
      try {
        const { GetExportDirectory } = await import('../wailsjs/go/main/App');
        const dir = await GetExportDirectory();
        if (!cancelled) {
          setState({ directory: dir, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState(prev => ({
            ...prev,
            loading: false,
            error: `获取导出目录失败: ${String(err)}`,
          }));
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const setDirectory = useCallback(async (path: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { SetExportDirectory } = await import('../wailsjs/go/main/App');
      await SetExportDirectory(path);
      setState(prev => ({ ...prev, directory: path, loading: false }));
      return path;
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: `设置导出目录失败: ${String(err)}`,
      }));
      throw err;
    }
  }, []);

  const chooseDirectory = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const { ChooseExportDirectory } = await import('../wailsjs/go/main/App');
      const dir = await ChooseExportDirectory();
      setState(prev => ({
        ...prev,
        directory: dir || prev.directory,
        loading: false,
      }));
      return dir;
    } catch (err) {
      const message = `选择导出目录失败: ${String(err)}`;
      setState(prev => ({
        ...prev,
        loading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  const openDirectory = useCallback(async () => {
    try {
      const { OpenExportDirectory } = await import('../wailsjs/go/main/App');
      await OpenExportDirectory();
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: `打开导出目录失败: ${String(err)}`,
      }));
      throw err;
    }
  }, []);

  return {
    exportDirectoryState: state,
    setExportDirectory: setDirectory,
    chooseExportDirectory: chooseDirectory,
    openExportDirectory: openDirectory,
  };
};

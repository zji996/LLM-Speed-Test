import type {
  PersistedAppConfig,
  TestConfiguration,
  TestBatch,
  TestResult,
  TelemetryUpdate,
  ProgressUpdate,
  ComparisonResult,
  ExportOptions,
} from '../../../types';

export function ValidateAPIKey(arg1:string,arg2:string):Promise<void>;
export function GetAvailableModels(arg1:string,arg2:string):Promise<Array<string>>;
export function StartSpeedTest(arg1:TestConfiguration):Promise<TestBatch>;
export function StopSpeedTest(arg1:string):Promise<void>;
export function GetTestProgress():Promise<Array<ProgressUpdate>>;
export function GetTestResults():Promise<Array<TestResult>>;
export function GetTelemetryUpdates():Promise<Array<TelemetryUpdate>>;
export function GetTestBatch(arg1:string):Promise<TestBatch>;
export function GetAllTestBatches():Promise<Array<TestBatch>>;
export function CompareTestBatches(arg1:Array<string>):Promise<ComparisonResult>;
export function ExportTestData(arg1:string,arg2:string,arg3:ExportOptions):Promise<string>;
export function GetExportDirectory():Promise<string>;
export function GetDefaultTestConfiguration():Promise<TestConfiguration>;
export function GetPromptTypes():Promise<Array<string>>;
export function GetDefaultPromptLengths():Promise<Array<number>>;
export function ValidatePromptConfig(arg1:string,arg2:number):Promise<void>;
export function GetAppConfig():Promise<PersistedAppConfig>;
export function SaveAppConfig(arg1:PersistedAppConfig):Promise<void>;

/**
 * 第三层：健壮的 Excel 解析引擎 (Robust Parser)
 * 
 * 核心挑战：教练给的 Excel 表头错位、数据缺失、格式混乱是常态
 * 
 * 工程解法：xlsx + Zod 防御性编程
 * 
 * 1. 读取层：xlsx 读取 Sheet1
 * 2. 映射层：半自动字段映射 UI
 * 3. 校验层：Zod Schema 验证，脏数据高亮
 */

'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, AlertCircle, Check, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { z } from 'zod';
import * as XLSX from 'xlsx';

// 标准字段定义
export const STANDARD_FIELDS = [
  { key: 'name', label: '姓名', required: true },
  { key: 'number', label: '号码', required: true },
  { key: 'position', label: '位置', required: true },
  { key: 'attackKills', label: '扣球得分', required: false },
  { key: 'attackErrors', label: '扣球失误', required: false },
  { key: 'attackAttempts', label: '扣球次数', required: false },
  { key: 'blocks', label: '拦网得分', required: false },
  { key: 'digs', label: '防守', required: false },
  { key: 'aces', label: '发球得分', required: false },
  { key: 'serviceErrors', label: '发球失误', required: false },
] as const;

// Zod Schema 验证
const PlayerDataSchema = z.object({
  name: z.string().min(1, '姓名不能为空'),
  number: z.string().min(1, '号码不能为空'),
  position: z.string().min(1, '位置不能为空'),
  attackKills: z.coerce.number().min(0).optional().default(0),
  attackErrors: z.coerce.number().min(0).optional().default(0),
  attackAttempts: z.coerce.number().min(0).optional().default(0),
  blocks: z.coerce.number().min(0).optional().default(0),
  digs: z.coerce.number().min(0).optional().default(0),
  aces: z.coerce.number().min(0).optional().default(0),
  serviceErrors: z.coerce.number().min(0).optional().default(0),
});

export type PlayerData = z.infer<typeof PlayerDataSchema>;

// 字段映射建议
const FIELD_SUGGESTIONS: Record<string, string[]> = {
  name: ['姓名', '名字', 'name', 'player', '球员', '队员', '姓名/Name'],
  number: ['号码', '球衣号', 'number', 'num', '背号', '球号'],
  position: ['位置', '站位', 'position', 'pos', 'role', '场上位置'],
  attackKills: ['扣球得分', '进攻得分', 'attack_kills', 'kills', 'attacks', '扣杀'],
  attackErrors: ['扣球失误', '进攻失误', 'attack_errors', 'errors', '失误'],
  attackAttempts: ['扣球次数', '进攻次数', 'attack_attempts', 'attempts'],
  blocks: ['拦网', 'block', 'blocks', '拦网得分'],
  digs: ['防守', '救球', 'digs', 'dig', '防守成功'],
  aces: ['发球得分', 'ace', 'aces', '发球直接得分'],
  serviceErrors: ['发球失误', 'service_errors', '发球错误'],
};

interface ExcelParserProps {
  onParsed: (data: PlayerData[]) => void;
  onError?: (errors: string[]) => void;
}

interface MappingState {
  headers: string[];
  mappings: Record<string, string>; // standardKey -> headerKey
  preview: Record<string, unknown>[];
}

export function ExcelParser({ onParsed, onError }: ExcelParserProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'validating' | 'complete'>('upload');
  const [mapping, setMapping] = useState<MappingState | null>(null);
  const [validationResults, setValidationResults] = useState<{
    valid: PlayerData[];
    invalid: { row: number; data: unknown; errors: z.ZodError }[];
  }>({ valid: [], invalid: [] });
  const [isProcessing, setIsProcessing] = useState(false);

  // 自动建议映射
  const suggestMappings = (headers: string[]): Record<string, string> => {
    const mappings: Record<string, string> = {};
    
    STANDARD_FIELDS.forEach(field => {
      const suggestions = FIELD_SUGGESTIONS[field.key] || [];
      
      // 寻找匹配
      const match = headers.find(h => {
        const normalizedH = h.toLowerCase().trim();
        return suggestions.some(s => 
          normalizedH === s.toLowerCase() || 
          normalizedH.includes(s.toLowerCase())
        );
      });
      
      if (match) {
        mappings[field.key] = match;
      }
    });
    
    return mappings;
  };

  // 处理文件上传
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      if (jsonData.length < 2) {
        onError?.(['文件中没有足够的数据']);
        return;
      }

      // 提取表头
      const headers = jsonData[0].map(h => String(h).trim());
      
      // 提取预览数据
      const preview = jsonData.slice(1, 6).map(row => {
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => {
          obj[h] = row[i];
        });
        return obj;
      });

      // 自动建议映射
      const suggestedMappings = suggestMappings(headers);

      setMapping({
        headers,
        mappings: suggestedMappings,
        preview,
      });
      setStep('mapping');
    } catch (error) {
      onError?.(['解析 Excel 文件失败']);
    } finally {
      setIsProcessing(false);
    }
  }, [onError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  // 更新映射
  const updateMapping = (standardKey: string, headerKey: string) => {
    setMapping(prev => {
      if (!prev) return null;
      return {
        ...prev,
        mappings: {
          ...prev.mappings,
          [standardKey]: headerKey,
        },
      };
    });
  };

  // 验证数据
  const validateData = async () => {
    if (!mapping) return;

    setStep('validating');
    setIsProcessing(true);

    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 转换预览数据
    const results = {
      valid: [] as PlayerData[],
      invalid: [] as { row: number; data: unknown; errors: z.ZodError }[],
    };

    mapping.preview.forEach((row, index) => {
      // 根据映射转换数据
      const converted: Record<string, unknown> = {};
      
      Object.entries(mapping.mappings).forEach(([standardKey, headerKey]) => {
        if (headerKey && row[headerKey] !== undefined) {
          converted[standardKey] = row[headerKey];
        }
      });

      // Zod 验证
      const parseResult = PlayerDataSchema.safeParse(converted);
      
      if (parseResult.success) {
        results.valid.push(parseResult.data);
      } else {
        results.invalid.push({
          row: index + 2,
          data: converted,
          errors: parseResult.error,
        });
      }
    });

    setValidationResults(results);
    setStep('complete');
    setIsProcessing(false);

    if (results.valid.length > 0) {
      onParsed(results.valid);
    }
  };

  // 重新上传
  const reset = () => {
    setStep('upload');
    setMapping(null);
    setValidationResults({ valid: [], invalid: [] });
  };

  // 上传步骤
  if (step === 'upload') {
    return (
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-400" />
          Excel 数据导入
        </h3>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-cyan-500 bg-cyan-500/10' 
              : 'border-zinc-700 hover:border-zinc-600'
          }`}
        >
          <input {...getInputProps()} />
          
          {isProcessing ? (
            <div className="py-8">
              <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-4" />
              <p className="text-zinc-400">正在解析文件...</p>
            </div>
          ) : (
            <>
              <FileSpreadsheet className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-zinc-400 mb-2">
                {isDragActive ? '松开以导入' : '拖拽文件到此处，或点击上传'}
              </p>
              <p className="text-zinc-600 text-sm">支持 .xlsx, .xls, .csv 格式</p>
            </>
          )}
        </div>

        <div className="mt-4 bg-zinc-800/50 rounded-lg p-4">
          <p className="text-zinc-500 text-sm mb-2">💡 支持字段自动识别：</p>
          <div className="flex flex-wrap gap-2">
            {['姓名', '号码', '位置', '扣球', '拦网', '发球'].map(tag => (
              <span key={tag} className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 映射步骤
  if (step === 'mapping' && mapping) {
    const requiredFields = STANDARD_FIELDS.filter(f => f.required);
    const optionalFields = STANDARD_FIELDS.filter(f => !f.required);
    
    const isComplete = requiredFields.every(f => mapping.mappings[f.key]);

    return (
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-cyan-400" />
            字段映射
          </h3>
          <button
            onClick={reset}
            className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            重新上传
          </button>
        </div>

        <p className="text-zinc-400 text-sm mb-4">
          请将你的表头与系统标准字段对应。系统已自动识别部分字段。
        </p>

        {/* 必填字段 */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-zinc-300">必填字段</p>
          {requiredFields.map(field => (
            <div key={field.key} className="flex items-center gap-4">
              <span className="w-24 text-sm text-zinc-400">{field.label}</span>
              <select
                value={mapping.mappings[field.key] || ''}
                onChange={(e) => updateMapping(field.key, e.target.value)}
                className={`flex-1 px-3 py-2 bg-zinc-800 border rounded-lg text-sm focus:outline-none focus:border-cyan-500 ${
                  mapping.mappings[field.key] ? 'border-green-500/50' : 'border-zinc-700'
                }`}
              >
                <option value="">-- 选择对应列 --</option>
                {mapping.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {mapping.mappings[field.key] && (
                <Check className="w-5 h-5 text-green-400" />
              )}
            </div>
          ))}
        </div>

        {/* 可选字段 */}
        <div className="space-y-3 mb-6">
          <p className="text-sm font-medium text-zinc-300">可选字段</p>
          {optionalFields.map(field => (
            <div key={field.key} className="flex items-center gap-4">
              <span className="w-24 text-sm text-zinc-500">{field.label}</span>
              <select
                value={mapping.mappings[field.key] || ''}
                onChange={(e) => updateMapping(field.key, e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">-- 选择对应列 --</option>
                {mapping.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* 预览 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-zinc-300 mb-2">数据预览</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-800">
                <tr>
                  {STANDARD_FIELDS.filter(f => mapping.mappings[f.key]).map(f => (
                    <th key={f.key} className="px-3 py-2 text-left text-zinc-400">
                      {f.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mapping.preview.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800">
                    {STANDARD_FIELDS.filter(f => mapping.mappings[f.key]).map(f => (
                      <td key={f.key} className="px-3 py-2 text-zinc-300">
                        {String(row[mapping.mappings[f.key]] || '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={validateData}
          disabled={!isComplete || isProcessing}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              正在验证数据...
            </>
          ) : (
            <>
              下一步：验证数据
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    );
  }

  // 验证结果
  if (step === 'complete') {
    const { valid, invalid } = validationResults;
    
    return (
      <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          {invalid.length === 0 ? (
            <>
              <Check className="w-5 h-5 text-green-400" />
              验证通过
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              部分数据需要修正
            </>
          )}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-500/10 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-400">{valid.length}</p>
            <p className="text-zinc-400 text-sm">有效记录</p>
          </div>
          <div className={`${invalid.length > 0 ? 'bg-red-500/10' : 'bg-zinc-800'} rounded-xl p-4 text-center`}>
            <p className={`text-3xl font-bold ${invalid.length > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
              {invalid.length}
            </p>
            <p className="text-zinc-400 text-sm">无效记录</p>
          </div>
        </div>

        {/* 错误详情 */}
        {invalid.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-zinc-300 mb-2">错误详情：</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {invalid.map((item, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm font-medium">第 {item.row} 行</p>
                  <ul className="mt-1 space-y-1">
                    {item.errors.errors.map((err, j) => (
                      <li key={j} className="text-red-300 text-xs">
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-3 bg-zinc-800 text-white font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
          >
            重新上传
          </button>
          {valid.length > 0 && (
            <button
              onClick={() => onParsed(valid)}
              className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
              导入 {valid.length} 条数据
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

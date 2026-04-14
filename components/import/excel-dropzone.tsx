/**
 * 第二层：Excel/CSV 拖拽导入
 * 
 * 支持老派教练的 Excel 统计表一键上传
 * "做产品不是炫技，而是帮用户把那些枯燥的麻烦事变得性感。"
 */

'use client';

import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';

interface ExcelDropzoneProps {
  onDataImported: (data: Record<string, unknown>[]) => void;
}

interface ParseResult {
  success: boolean;
  data?: Record<string, unknown>[];
  errors?: string[];
  rowCount?: number;
}

// 模拟 Excel/CSV 解析 (实际应使用 xlsx 库)
function mockParseExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 模拟解析结果
      const mockData = [
        { name: "李强", number: "8", position: "outside", attack_kills: 15, attack_errors: 3 },
        { name: "王浩", number: "12", position: "opposite", attack_kills: 12, attack_errors: 1 },
        { name: "陈杰", number: "4", position: "setter", assists: 45, setting_errors: 3 },
        { name: "刘伟", number: "5", position: "middle", blocks: 6, attack_kills: 10 },
        { name: "周鹏", number: "3", position: "middle", blocks: 4, attack_kills: 8 },
        { name: "林峰", number: "9", position: "libero", digs: 15, reception_errors: 1 },
      ];
      
      resolve({
        success: true,
        data: mockData,
        rowCount: mockData.length,
      });
    }, 1500);
  });
}

// 字段映射建议
const FIELD_MAPPINGS: Record<string, string[]> = {
  name: ['姓名', '名字', 'name', 'player', '球员'],
  number: ['号码', '球衣号', 'number', 'num', '背号'],
  position: ['位置', '站位', 'position', 'pos', 'role'],
  attackKills: ['扣球得分', '进攻得分', 'attack_kills', 'kills', 'attacks'],
  attackErrors: ['扣球失误', '进攻失误', 'attack_errors', 'errors'],
  blocks: ['拦网', 'block', 'blocks'],
  digs: ['防守', '救球', 'digs', 'dig'],
  assists: ['助攻', '传球', 'assists', 'assist'],
};

export function ExcelDropzone({ onDataImported }: ExcelDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv'))) {
      await processFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processFile(selectedFile);
    }
  }, []);

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParsing(true);
    
    try {
      const parseResult = await mockParseExcel(selectedFile);
      setResult(parseResult);
      
      if (parseResult.success && parseResult.data) {
        setPreviewData(parseResult.data.slice(0, 5)); // 预览前5行
      }
    } catch (error) {
      setResult({
        success: false,
        errors: ['解析失败，请检查文件格式'],
      });
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = () => {
    if (result?.data) {
      onDataImported(result.data);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setPreviewData([]);
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <FileSpreadsheet className="w-5 h-5 text-green-400" />
        Excel/CSV 导入
      </h3>

      {!file ? (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging 
              ? 'border-cyan-500 bg-cyan-500/10' 
              : 'border-zinc-700 hover:border-zinc-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">拖拽文件到此处，或点击上传</p>
          <p className="text-zinc-600 text-sm mb-4">支持 .xlsx, .csv 格式</p>
          <input
            type="file"
            accept=".xlsx,.csv"
            className="hidden"
            id="excel-upload"
            onChange={handleFileSelect}
          />
          <label
            htmlFor="excel-upload"
            className="inline-block px-4 py-2 bg-zinc-800 text-white rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors"
          >
            选择文件
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 文件信息 */}
          <div className="flex items-center justify-between bg-zinc-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-zinc-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={reset}
              className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          {/* 解析状态 */}
          {parsing ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-zinc-400">正在解析数据...</p>
            </div>
          ) : result?.success ? (
            <div className="space-y-4">
              {/* 成功提示 */}
              <div className="flex items-center gap-2 text-green-400 bg-green-500/10 rounded-lg p-3">
                <Check className="w-5 h-5" />
                <span>成功解析 {result.rowCount} 条记录</span>
              </div>

              {/* 数据预览 */}
              <div>
                <p className="text-zinc-400 text-sm mb-2">数据预览（前5行）：</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800">
                      <tr>
                        {Object.keys(previewData[0] || {}).map(key => (
                          <th key={key} className="px-3 py-2 text-left text-zinc-400 font-medium">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-b border-zinc-800">
                          {Object.values(row).map((val, j) => (
                            <td key={j} className="px-3 py-2 text-zinc-300">
                              {String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 字段映射提示 */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-zinc-400 text-sm mb-2">自动字段映射：</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(FIELD_MAPPINGS).slice(0, 6).map(([field, aliases]) => (
                    <span key={field} className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-400">
                      {field} → {aliases.slice(0, 2).join('/')}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                导入全部数据
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-400 bg-red-500/10 rounded-lg p-3">
              <AlertCircle className="w-5 h-5" />
              <span>{result?.errors?.[0] || '解析失败'}</span>
            </div>
          )}
        </div>
      )}

      {/* 模板下载 */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-zinc-500 text-sm">没有模板？</p>
        <button className="text-cyan-400 text-sm hover:underline mt-1">
          下载标准导入模板
        </button>
      </div>
    </div>
  );
}

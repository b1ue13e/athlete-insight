/**
 * 第二层：OCR 视觉识别 - 拍照识阵容
 * 
 * 赛前教练都有纸质首发名单，拍照直接转化为系统球员卡片
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { Camera, Upload, Check, X, Loader2, RefreshCw } from 'lucide-react';

export interface OCRPlayer {
  name: string;
  number: string;
  position: string;
  confidence: number;
}

interface RosterOCRProps {
  onPlayersDetected: (players: OCRPlayer[]) => void;
}

// 模拟 OCR 识别 (实际应调用 Google Vision API 或 Tesseract.js)
async function mockOCRRecognize(imageData: string): Promise<OCRPlayer[]> {
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 模拟识别结果 (实际应从图片中提取)
  return [
    { name: "李强", number: "8", position: "主攻", confidence: 0.94 },
    { name: "王浩", number: "12", position: "接应", confidence: 0.91 },
    { name: "陈杰", number: "4", position: "二传", confidence: 0.96 },
    { name: "刘伟", number: "5", position: "副攻", confidence: 0.89 },
    { name: "周鹏", number: "3", position: "副攻", confidence: 0.92 },
    { name: "林峰", number: "9", position: "自由人", confidence: 0.88 },
  ];
}

export function RosterOCR({ onPlayersDetected }: RosterOCRProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedPlayers, setDetectedPlayers] = useState<OCRPlayer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const imageData = reader.result as string;
      setCapturedImage(imageData);
      setIsProcessing(true);
      
      try {
        const players = await mockOCRRecognize(imageData);
        setDetectedPlayers(players);
      } catch (error) {
        console.error('OCR failed:', error);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const handleConfirm = () => {
    onPlayersDetected(detectedPlayers);
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setDetectedPlayers([]);
    fileInputRef.current?.click();
  };

  const updatePlayer = (index: number, field: keyof OCRPlayer, value: string) => {
    setDetectedPlayers(prev => prev.map((p, i) => 
      i === index ? { ...p, [field]: value } : p
    ));
  };

  const removePlayer = (index: number) => {
    setDetectedPlayers(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Camera className="w-5 h-5 text-cyan-400" />
        拍照识别名单
      </h3>

      {!capturedImage ? (
        <div className="space-y-4">
          <div 
            className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <p className="text-zinc-400 mb-2">点击拍照或上传名单照片</p>
            <p className="text-zinc-600 text-sm">支持 JPG、PNG 格式</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <div className="bg-zinc-800/50 rounded-lg p-4">
            <p className="text-zinc-500 text-sm mb-2">💡 提示：</p>
            <ul className="text-zinc-500 text-sm space-y-1">
              <li>• 确保光线充足，文字清晰可见</li>
              <li>• 尽量保持照片正面拍摄</li>
              <li>• 支持手写和打印名单</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 预览图 */}
          <div className="relative">
            <img 
              src={capturedImage} 
              alt="Captured roster" 
              className="w-full h-48 object-cover rounded-xl"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-2" />
                  <p className="text-white text-sm">正在识别...</p>
                </div>
              </div>
            )}
          </div>

          {/* 识别结果 */}
          {!isProcessing && detectedPlayers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-zinc-400 text-sm">识别到 {detectedPlayers.length} 名球员</p>
                <button
                  onClick={handleRetry}
                  className="text-sm text-cyan-400 flex items-center gap-1 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  重新拍照
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {detectedPlayers.map((player, index) => (
                  <div 
                    key={index}
                    className="bg-zinc-800 rounded-lg p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                      {player.number}
                    </div>
                    
                    {editingIndex === index ? (
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => updatePlayer(index, 'name', e.target.value)}
                          className="bg-zinc-700 text-white text-sm rounded px-2 py-1"
                          placeholder="姓名"
                        />
                        <input
                          type="text"
                          value={player.number}
                          onChange={(e) => updatePlayer(index, 'number', e.target.value)}
                          className="bg-zinc-700 text-white text-sm rounded px-2 py-1"
                          placeholder="号码"
                        />
                        <input
                          type="text"
                          value={player.position}
                          onChange={(e) => updatePlayer(index, 'position', e.target.value)}
                          className="bg-zinc-700 text-white text-sm rounded px-2 py-1"
                          placeholder="位置"
                        />
                      </div>
                    ) : (
                      <div className="flex-1">
                        <p className="text-white font-medium">{player.name}</p>
                        <p className="text-zinc-500 text-sm">{player.position}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        player.confidence > 0.9 ? 'bg-green-500/20 text-green-400' :
                        player.confidence > 0.7 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {(player.confidence * 100).toFixed(0)}%
                      </span>
                      <button
                        onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                        className="p-1 hover:bg-zinc-700 rounded"
                      >
                        {editingIndex === index ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <span className="text-xs text-zinc-400">编辑</span>
                        )}
                      </button>
                      <button
                        onClick={() => removePlayer(index)}
                        className="p-1 hover:bg-zinc-700 rounded"
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                确认并导入 ({detectedPlayers.length}人)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

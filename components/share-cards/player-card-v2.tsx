/**
 * Player Card V2 - 高阶球星卡系统
 * 集成埋点追踪、性能监控、高清导出
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { toPng } from 'html-to-image';
import { analytics, useTelemetry } from '@/lib/telemetry/analytics-client';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Upload, Download, Share2, RotateCcw, ZoomIn, Check, X, Loader2 } from 'lucide-react';

// 类型定义
interface PlayerStats {
  attack: number;
  block: number;
  serve: number;
  defense: number;
  set: number;
  receive: number;
}

interface PlayerData {
  name: string;
  number: string;
  position: string;
  team: string;
  stats: PlayerStats;
  tier: 'LEGENDARY' | 'ELITE' | 'RARE' | 'COMMON';
  overall: number;
  analysisId: string;
}

interface Point { x: number; y: number }
interface CroppedArea { x: number; y: number; width: number; height: number }

// 图片裁剪模态框
interface ImageCropModalProps {
  image: string;
  aspect: number;
  onComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

function ImageCropModal({ image, aspect, onComplete, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedArea | null>(null);
  const [adjustments, setAdjustments] = useState(0);
  const startTime = useRef(Date.now());
  const { track } = useTelemetry();

  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: CroppedArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
    setAdjustments(prev => prev + 1);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    const timeSpent = Date.now() - startTime.current;
    
    try {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = image;
      await new Promise((resolve) => { img.onload = resolve; });

      // 输出 1200px 宽度，保持高清
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const outputWidth = 1200;
      const outputHeight = outputWidth / aspect;

      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      ctx.drawImage(
        img,
        croppedAreaPixels.x * scaleX,
        croppedAreaPixels.y * scaleY,
        croppedAreaPixels.width * scaleX,
        croppedAreaPixels.height * scaleY,
        0,
        0,
        outputWidth,
        outputHeight
      );

      const croppedImage = canvas.toDataURL('image/jpeg', 0.92);
      
      // 埋点：裁剪完成
      track('PHOTO_CROPPED', {
        ratio: aspect === 1 ? '1:1' : aspect === 3/4 ? '3:4' : '9:16',
        time_spent_ms: timeSpent,
        zoom_level: zoom,
        crop_adjustments: adjustments,
      });

      onComplete(croppedImage);
    } catch (error) {
      console.error('Crop failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-950 border-b border-zinc-800">
        <h3 className="text-white font-semibold">调整照片</h3>
        <button onClick={onCancel} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* 裁剪区域 */}
      <div className="flex-1 relative">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          classes={{
            containerClassName: 'cropper-container',
            mediaClassName: 'cropper-media',
          }}
        />
      </div>

      {/* 控制栏 */}
      <div className="px-6 py-6 bg-zinc-950 border-t border-zinc-800 space-y-4">
        <div className="flex items-center gap-4">
          <ZoomIn className="w-5 h-5 text-zinc-500" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
        <button
          onClick={handleConfirm}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          确认裁剪
        </button>
      </div>
    </div>
  );
}

// 主卡片组件
interface PlayerCardV2Props {
  data: PlayerData;
  playerImage?: string | null;
  onImageUpload?: (image: string) => void;
}

export function PlayerCardV2({ data, playerImage, onImageUpload }: PlayerCardV2Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(playerImage || null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const { track, trackFunnel, trackPerformance } = useTelemetry();
  const customizationStartTime = useRef<number>(Date.now());

  // 转换数据为雷达图格式
  const radarData = [
    { subject: '进攻', A: data.stats.attack, fullMark: 100 },
    { subject: '拦网', A: data.stats.block, fullMark: 100 },
    { subject: '发球', A: data.stats.serve, fullMark: 100 },
    { subject: '防守', A: data.stats.defense, fullMark: 100 },
    { subject: '传球', A: data.stats.set, fullMark: 100 },
    { subject: '接发', A: data.stats.receive, fullMark: 100 },
  ];

  // 等级配置
  const tierConfig = {
    LEGENDARY: {
      gradient: 'from-amber-500 via-orange-500 to-red-600',
      glow: 'shadow-amber-500/50',
      badge: '传说',
    },
    ELITE: {
      gradient: 'from-cyan-400 via-blue-500 to-indigo-600',
      glow: 'shadow-cyan-500/50',
      badge: '精英',
    },
    RARE: {
      gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
      glow: 'shadow-emerald-500/50',
      badge: '稀有',
    },
    COMMON: {
      gradient: 'from-zinc-400 via-zinc-500 to-zinc-600',
      glow: 'shadow-zinc-500/50',
      badge: '普通',
    },
  };

  const tier = tierConfig[data.tier];

  // 处理图片上传
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    track('PHOTO_UPLOAD_INITIATED', {
      file_size_mb: file.size / 1024 / 1024,
      file_type: file.type.split('/')[1] as 'jpg' | 'png' | 'webp' | 'heic',
      device_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
    });

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setTempImage(result);
      setIsCropping(true);
      onImageUpload?.(result);
    };
    reader.readAsDataURL(file);
  };

  // 完成裁剪
  const handleCropComplete = (cropped: string) => {
    setCroppedImage(cropped);
    setIsCropping(false);
    setTempImage(null);
    trackFunnel('crop', true);
  };

  // 导出卡片
  const handleExport = async () => {
    if (!cardRef.current) return;

    const startTime = Date.now();
    setIsExporting(true);
    setExportProgress(0);

    try {
      // 模拟进度
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 80));
      }, 100);

      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3, // 3x for 4K clarity
        cacheBust: true,
        backgroundColor: '#09090b',
        quality: 0.95,
      });

      clearInterval(progressInterval);
      setExportProgress(100);

      const exportTime = Date.now() - startTime;
      const sizeInKB = Math.round((dataUrl.length * 3) / 4 / 1024);

      // 性能埋点
      trackPerformance('card_export', exportTime, true);
      
      // 导出事件埋点
      track('CARD_EXPORTED', {
        format: 'png',
        size_kb: sizeInKB,
        export_time_ms: exportTime,
        pixel_ratio: 3,
        success: true,
      });

      // 下载
      const link = document.createElement('a');
      link.download = `${data.name}_${data.team}_球星卡.png`;
      link.href = dataUrl;
      link.click();

      trackFunnel('export', true, { tier: data.tier });
    } catch (error) {
      trackPerformance('card_export', Date.now() - startTime, false);
      console.error('Export failed:', error);
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 500);
    }
  };

  // 分享
  const handleShare = async (platform: 'wechat' | 'instagram' | 'twitter' | 'download') => {
    const startTime = Date.now();
    
    if (platform === 'download') {
      await handleExport();
    }

    track('CARD_SHARED', {
      platform,
      share_time_ms: Date.now() - startTime,
    });

    trackFunnel('share', true, { platform });
  };

  // 初始化埋点
  useEffect(() => {
    track('CARD_GENERATION_STARTED', {
      source: 'dashboard',
      sport_type: 'volleyball',
      user_tier: 'pro',
      timestamp: Date.now(),
    });

    return () => {
      // 离开页面时记录定制时长
      track('CARD_CUSTOMIZED', {
        tier_selected: data.tier,
        stats_modified: false,
        theme_changed: false,
        time_spent_ms: Date.now() - customizationStartTime.current,
      });
    };
  }, []);

  return (
    <>
      {/* 裁剪模态框 */}
      {isCropping && tempImage && (
        <ImageCropModal
          image={tempImage}
          aspect={3 / 4}
          onComplete={handleCropComplete}
          onCancel={() => {
            setIsCropping(false);
            setTempImage(null);
            trackFunnel('crop', false);
          }}
        />
      )}

      {/* 导出进度遮罩 */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mx-auto" />
            <p className="text-white font-medium">正在生成高清卡片...</p>
            <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
            <p className="text-zinc-500 text-sm">{exportProgress}%</p>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-zinc-950 py-8 px-4">
        {/* 卡片主体 */}
        <div
          ref={cardRef}
          className="max-w-md mx-auto relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800"
        >
          {/* 背景网格 */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }} />
          </div>

          {/* 顶部渐变条 */}
          <div className={`h-2 bg-gradient-to-r ${tier.gradient}`} />

          {/* 等级徽章 */}
          <div className="absolute top-4 right-4">
            <span className={`px-3 py-1 text-xs font-bold rounded-full bg-gradient-to-r ${tier.gradient} text-white`}>
              {tier.badge}
            </span>
          </div>

          {/* 照片区域 */}
          <div className="relative h-80 bg-zinc-900/50">
            {croppedImage ? (
              <img
                src={croppedImage}
                alt={data.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-zinc-500" />
                </div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                  <span className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm hover:bg-zinc-700 transition-colors">
                    上传照片
                  </span>
                </label>
              </div>
            )}

            {/* 重拍按钮 */}
            {croppedImage && (
              <label className="absolute bottom-4 right-4 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className="p-2 bg-black/60 backdrop-blur-sm rounded-full hover:bg-black/80 transition-colors">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
              </label>
            )}
          </div>

          {/* 信息区域 */}
          <div className="p-6 space-y-6">
            {/* 球员信息 */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black text-white">{data.name}</span>
                <span className={`text-lg font-bold bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}>
                  #{data.number}
                </span>
              </div>
              <p className="text-zinc-400">{data.position} · {data.team}</p>
            </div>

            {/* 总体评分 */}
            <div className="flex justify-center">
              <div className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${tier.gradient} p-1`}>
                <div className="w-full h-full rounded-full bg-zinc-950 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent`}>
                    {data.overall}
                  </span>
                  <span className="text-xs text-zinc-500">综合</span>
                </div>
              </div>
            </div>

            {/* 雷达图 */}
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#71717a', fontSize: 12 }}
                  />
                  <Radar
                    name={data.name}
                    dataKey="A"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="#06b6d4"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* 数据网格 */}
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(data.stats).map(([key, value]) => {
                const labels: Record<string, string> = {
                  attack: '进攻',
                  block: '拦网',
                  serve: '发球',
                  defense: '防守',
                  set: '传球',
                  receive: '接发',
                };
                return (
                  <div key={key} className="bg-zinc-900/50 rounded-lg p-3 text-center">
                    <p className="text-zinc-500 text-xs mb-1">{labels[key]}</p>
                    <p className="text-xl font-bold text-white">{value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 底部装饰 */}
          <div className={`h-1 bg-gradient-to-r ${tier.gradient} opacity-50`} />
        </div>

        {/* 操作按钮 */}
        <div className="max-w-md mx-auto mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => handleShare('download')}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            下载卡片
          </button>
          <button
            onClick={() => handleShare('wechat')}
            className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            分享
          </button>
        </div>
      </div>
    </>
  );
}

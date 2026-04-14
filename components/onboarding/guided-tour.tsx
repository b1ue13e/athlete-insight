/**
 * 第一层：新手指引与 AHA Moment 的强制注射
 * 
 * 剧本式引导流 (The Guided Tour)
 * 
 * 第一幕：看痛点 - 高亮雷达图短板
 * 第二幕：看 AI 处方 - 滚动到处方卡片
 * 第三幕：收网钩子 - 高亮导入按钮
 * 
 * "用户很懒，如果不告诉他们看哪里，他们只会觉得花里胡哨"
 */

'use client';

import { useEffect, useCallback } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

interface GuidedTourProps {
  isActive: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function GuidedTour({ isActive, onComplete, onSkip }: GuidedTourProps) {
  const startTour = useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      progressText: '第 {{current}} 步，共 {{total}} 步',
      nextBtnText: '下一步',
      prevBtnText: '上一步',
      doneBtnText: '开始体验',
      allowClose: true,
      onDestroyed: () => {
        onSkip?.();
      },
      steps: [
        // 第一幕：看痛点
        {
          element: '#radar-chart-defense',
          popover: {
            title: '🎯 发现致命短板',
            description: '看这里！虽然张三进攻得分高达 88 分，但防守端的凹陷（仅 52 分），正是第三局被逆转的致命伤。',
            side: 'bottom',
            align: 'center',
          },
        },
        // 第二幕：看 AI 处方
        {
          element: '#ai-prescription-card',
          popover: {
            title: '💊 AI 自动开处方',
            description: '不用你自己想对策，系统已经识别出问题，并开出了针对性的防守训练处方。',
            side: 'left',
            align: 'start',
          },
          onDeselected: () => {
            // 自动滚动到处方卡片
            document.getElementById('ai-prescription-card')?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          },
        },
        // 第三幕：收网钩子
        {
          element: '#import-data-button',
          popover: {
            title: '🚀 看看你自己的球队',
            description: '花 90 秒导入数据，看看你的球队里藏着哪些致命漏洞和未发现的明星球员。',
            side: 'bottom',
            align: 'center',
          },
        },
      ],
    });

    driverObj.drive();
    
    // 监听完成事件
    const checkComplete = setInterval(() => {
      if (!driverObj.isActive()) {
        clearInterval(checkComplete);
        onComplete?.();
      }
    }, 1000);

    return () => {
      clearInterval(checkComplete);
      driverObj.destroy();
    };
  }, [onComplete, onSkip]);

  useEffect(() => {
    if (isActive) {
      const cleanup = startTour();
      return cleanup;
    }
  }, [isActive, startTour]);

  return null;
}

// 简化的引导按钮
export function TourStartButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-full shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center gap-2 animate-bounce"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-medium">查看引导</span>
    </button>
  );
}

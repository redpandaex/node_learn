import { useState, useEffect } from 'react';

interface MobileInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  isLandscape: boolean;
}

export const useMobile = (): MobileInfo => {
  const [mobileInfo, setMobileInfo] = useState<MobileInfo>(() => {
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    return {
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      deviceType: 'desktop',
      screenWidth,
      screenHeight,
      isLandscape: screenWidth > screenHeight,
    };
  });

  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // 检测移动端
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent,
        ) || screenWidth <= 768;

      // 检测iOS
      const isIOS = /iPad|iPhone|iPod/.test(userAgent);

      // 检测Android
      const isAndroid = /Android/i.test(userAgent);

      // 确定设备类型
      let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (screenWidth <= 768) {
        deviceType = 'mobile';
      } else if (screenWidth <= 1024) {
        deviceType = 'tablet';
      }

      // 检测横屏
      const isLandscape = screenWidth > screenHeight;

      const newMobileInfo = {
        isMobile,
        isIOS,
        isAndroid,
        deviceType,
        screenWidth,
        screenHeight,
        isLandscape,
      };

      // 只有在值真正改变时才更新状态，避免不必要的重渲染
      setMobileInfo((prev) => {
        if (
          prev.isMobile !== newMobileInfo.isMobile ||
          prev.isIOS !== newMobileInfo.isIOS ||
          prev.isAndroid !== newMobileInfo.isAndroid ||
          prev.deviceType !== newMobileInfo.deviceType ||
          Math.abs(prev.screenWidth - newMobileInfo.screenWidth) > 50 || // 只有显著变化才更新
          Math.abs(prev.screenHeight - newMobileInfo.screenHeight) > 50 ||
          prev.isLandscape !== newMobileInfo.isLandscape
        ) {
          return newMobileInfo;
        }
        return prev;
      });
    };

    // 初始检测
    detectDevice();

    // 防抖函数，避免频繁更新
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(detectDevice, 300); // 300ms 防抖
    };

    // 监听设备方向变化
    let orientationTimer: NodeJS.Timeout;
    const handleOrientationChange = () => {
      clearTimeout(orientationTimer);
      // 延迟检测，等待方向变化完成
      orientationTimer = setTimeout(detectDevice, 500);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      clearTimeout(resizeTimer);
      clearTimeout(orientationTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return mobileInfo;
};

// 移动端优化工具函数
export const mobileUtils = {
  // 防止iOS Safari橡皮筋效果
  preventBounce: () => {
    document.addEventListener(
      'touchmove',
      (e) => {
        if (e.touches.length === 1) {
          e.preventDefault();
        }
      },
      { passive: false },
    );
  },

  // 隐藏地址栏
  hideAddressBar: () => {
    setTimeout(() => {
      window.scrollTo(0, 1);
    }, 100);
  },

  // 检测是否为全屏模式
  isFullscreen: (): boolean => {
    return (
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true
    );
  },

  // 获取安全区域
  getSafeArea: () => {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0'),
      right: parseInt(style.getPropertyValue('--sar') || '0'),
      bottom: parseInt(style.getPropertyValue('--sab') || '0'),
      left: parseInt(style.getPropertyValue('--sal') || '0'),
    };
  },

  // 优化移动端性能
  optimizePerformance: () => {
    // 禁用不必要的动画
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('reduced-motion');
    }

    // 优化滚动性能
    document.body.style.touchAction = 'pan-y';

    // 禁用双击缩放
    let lastTouchEnd = 0;
    document.addEventListener(
      'touchend',
      (event) => {
        const now = new Date().getTime();
        if (now - lastTouchEnd <= 300) {
          event.preventDefault();
        }
        lastTouchEnd = now;
      },
      false,
    );
  },
};

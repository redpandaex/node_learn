# 组件架构重构说明

## 重构概述

原来的 `App.tsx` 文件有 500+ 行代码，包含了所有的UI逻辑。现在已经被重构为模块化的组件架构，提高了代码的可维护性和复用性。

## 组件结构

### 布局组件 (Layout Components)

#### `Header.tsx`
- 桌面端头部组件
- 显示应用标题和连接状态
- 支持自定义标题和连接数量显示

#### `MobileHeader.tsx`
- 移动端头部组件
- 包含侧边抽屉菜单
- 显示连接状态徽章

#### `MobileLayout.tsx`
- 移动端完整布局
- 集成移动端头部和主要内容区域
- 处理移动端特有的交互逻辑

#### `DesktopLayout.tsx`
- 桌面端完整布局
- 侧边栏 + 主内容区域布局
- 显示错误信息

### 功能组件 (Feature Components)

#### `ConnectionPanel.tsx`
- 连接设置面板
- 处理连接/断开连接逻辑
- 客户端名称输入和连接状态显示

#### `DeviceList.tsx`
- 设备列表组件
- 显示所有在线设备
- 支持向其他设备发送文件

#### `FileUpload.tsx`
- 文件上传组件
- 文件选择和预览
- 支持移动端和桌面端不同样式

#### `TransferRecord.tsx`
- 传输历史记录组件
- 显示所有文件传输记录
- 支持清除所有记录

#### `TransferItem.tsx`
- 单个传输记录项组件
- 显示传输进度、状态和操作按钮
- 支持下载和删除操作

#### `ControlPanel.tsx`
- 控制面板组合组件
- 整合连接面板和设备列表
- 根据连接状态显示不同内容

### 工具函数 (Utilities)

#### `lib/formatters.ts`
- `formatFileSize()` - 格式化文件大小
- `formatTimestamp()` - 格式化时间戳
- `formatDateTime()` - 格式化日期时间

## 主要改进

### 1. 模块化设计
- 每个组件职责单一，易于理解和维护
- 组件间通过props传递数据，依赖关系清晰

### 2. 代码复用
- `TransferItem` 组件支持移动端和桌面端不同样式
- `FileUpload` 组件通过 `isMobile` 属性适配不同设备
- 工具函数统一处理格式化逻辑

### 3. 类型安全
- 所有组件都有完整的 TypeScript 类型定义
- Props 接口清晰，减少运行时错误

### 4. 响应式设计
- 移动端和桌面端使用不同的布局组件
- 组件内部支持响应式样式调整

### 5. 性能优化
- 使用 `useCallback` 和 `useMemo` 优化渲染性能
- 组件拆分减少不必要的重新渲染

## 使用示例

```typescript
// 在 App.tsx 中使用
import { MobileLayout, DesktopLayout } from './components';

// 根据设备类型选择布局
return (
  <TooltipProvider>
    {isMobile ? (
      <MobileLayout {...commonProps} />
    ) : (
      <DesktopLayout {...commonProps} />
    )}
    <Toaster />
  </TooltipProvider>
);
```

## 文件结构

```
src/
├── components/
│   ├── Header.tsx              # 桌面端头部
│   ├── MobileHeader.tsx        # 移动端头部
│   ├── MobileLayout.tsx        # 移动端布局
│   ├── DesktopLayout.tsx       # 桌面端布局
│   ├── ConnectionPanel.tsx     # 连接面板
│   ├── DeviceList.tsx          # 设备列表
│   ├── FileUpload.tsx          # 文件上传
│   ├── TransferRecord.tsx     # 传输历史
│   ├── TransferItem.tsx        # 传输项
│   ├── ControlPanel.tsx        # 控制面板
│   └── index.ts                # 组件导出
├── lib/
│   └── formatters.ts           # 格式化工具
└── App.tsx                     # 主应用（简化后）
```

## 扩展建议

1. **添加测试**: 为每个组件编写单元测试
2. **国际化**: 将硬编码的中文文本提取到语言文件
3. **主题系统**: 支持深色/浅色主题切换
4. **动画效果**: 为组件状态变化添加过渡动画
5. **错误边界**: 添加错误边界组件处理组件错误
# 玩具版 webpack

简单实现一个 webpack ， 用于掌握其核心流程，加深理解。

依然采用 TDD 模式，先使用原生查看输出，再依照源码阅读的认知来分解实现过程，逐步分析、实现、测试。

## 功能概述

核心概念： entry 、 output 、 loader 、 plugins 。

核心阶段：初始化阶段(参数、 Compiler 、plugins)、编译阶段(获取入口、 loader 转换、处理依赖、递归分析、 chunk 模板)、输出阶段(写入文件系统)。

核心钩子： entryOption 、 afterPlugins 、 run 、 compile 、 afterCompile 、 emit 、 done 。

# 一、项目创建

> webpack 作为一个 npm 工具包，支持命令行调用

# 二、初始化

> 参数处理、创建 Compiler 、加载 plugins

# 三、开始编译

> 处理路径、AST 编译(esprima 解析、 escodegen 更新、 estraverse 转换)

# 四、文件产出(chunk)

> ejs 模板处理

# 五、支持 loader

# 六、支持 plugin
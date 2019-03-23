# 玩具版 webpack

简单实现一个 webpack ， 用于掌握其核心流程，加深理解。

依然采用 TDD 模式，先使用原生查看输出，再依照源码阅读的认知来分解实现过程，逐步分析、实现、测试。

## 功能概述

核心概念： entry 、 output 、 loader 、 plugins 。

核心阶段：初始化阶段(参数、 Compiler 、plugins)、编译阶段(获取入口、 loader 转换、处理依赖、递归分析、 chunk 模板)、输出阶段(写入文件系统)。

核心钩子： entryOption 、 afterPlugins 、 run 、 compile 、 afterCompile 、 emit 、 done 。

## 补充

1. 使用 vscode 可以打开多个终端，一个操作 webpack 一个操作 test 

# 一、项目创建

> webpack 作为一个 npm 工具包，支持命令行调用

## 1. 配置启动脚本

```javascript
{
    "bin": {
        "moonpack": "./bin/webpack.js"
    },
}
```

## 2. 链接到全局

npm link 命令可以将一个任意位置的 npm 包链接到全局执行环境，从而在任意位置使用命令行都可以直接运行该 npm 包。方便本地包测试。

创建链接：
```bash
$ npm link
```

执行效果如下：
```bash
/usr/local/bin/moonpack -> /usr/local/lib/node_modules/moon-webpack/bin/webpack.js
/usr/local/lib/node_modules/moon-webpack -> /Users/moon/store/webpack-like/webpack
```

进入 test 目录测试：
```bash
$ moonpack
```

# 二、初始化

> 参数处理、创建 Compiler 、加载 plugins

## 1. 参数处理

直接读取 config 文件作为初始化参数，未处理命令行入参及默认配置。正规操作下，应该使用 yargs 配置并获取命令行参数，此处简化处理，省略这一步。

注意：需要获取的是命令执行的路径。

## 2. 初始化

### 创建钩子

```bash
$ npm i tapable -S
```
```javascript
// webpack/lib/Compiler.js
const { SyncBailHook } = require('tapable');
this.hooks = {
    entryOption: new SyncBailHook(["options"]), // 读取配置完成
};
```

### 发射钩子

```javascript
// webpack/bin/webpack.js
compiler.hooks.entryOption.call(options);
```

## 3. 加载 plugins

> 此处约定插件必须有 apply 方法，未支持 function 类型插件

```javascript
// webpack/lib/Compiler.js
let plugins = this.options.plugins;
if(Array.isArray(plugins) && plugins.length > 0) {
    plugins.forEach(plugin => {
        plugin.apply(this);
    })
}
```

## 4. 测试 plugin

```javascript
// test/plugins/entry-option-plugin.js
class EntryOptionPlugin {
    apply (compiler) {
        compiler.hooks.entryOption.tap('xxx', options => {
            console.log('entryOption hooks:', options);
        })
    }
}
```

# 三、开始编译

> 处理路径、AST 编译(esprima 解析、 escodegen 更新、 estraverse 转换)

# 四、文件产出(chunk)

> ejs 模板处理

# 五、支持 loader

# 六、支持 plugin

> 二、初始化 - 4. 测试 已经支持了 plugin
# 玩具版 webpack

简单实现一个 webpack ， 用于掌握其核心流程，加深理解。

依然采用 TDD 模式，先使用原生查看输出，再依照源码阅读的认知来分解实现过程，逐步分析、实现、测试。

## 功能概述

核心概念： entry 、 output 、 loader 、 plugins 。

核心阶段：初始化阶段(参数、 Compiler 、plugins)、编译阶段(获取入口、 loader 转换、处理依赖、递归分析、 chunk 模板)、输出阶段(写入文件系统)。

对应钩子： entryOption 、 afterPlugins 、 run 、 compile 、 afterCompile 、 emit 、 done 。

## 补充

1. 使用 vscode 可以打开多个终端，一个操作 webpack 一个操作 test 
2. entryOption 、 afterPlugins 钩子在 v5即将废弃, 原生 webpack 中 run 和 compile 不同，但此处简单实现二者相同
3. 简单起见，流程大多都是采用的同步操作，而在实际上有一部分是需要异步处理的，可以比对源码实现感受一哈
4. 简单起见，错误处理流程省略了，而在实际中错误处理是非常关键的，是保证软件稳健运行的基础

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

说明：简化处理，省略 import 转换为 require ，直接使用 CommonJS 规范测试。

```bash
$ npm i esprima estraverse escodegen -S
```

## 编译流程

1. 触发钩子 run compile
2. 解析入口模块，传入绝对路径
    - 通用模块解析方法 parseModule
    1. 获取模块相对根路径的路径名，用于补全处理其内部相对引用模块的路径
        - 查看构建生成文件，自执行函数的参数中，key 作为文件的路径，均是 `./src/xxx` 的格式
    2. 读取模块文件内容
    3. 解析模块 AST ，处理引用，获取依赖关系
        - 通用文件解析方法
        1. 解析成 AST
        2. 借助 [在线转换 AST](https://astexplorer.net/) 对比差异，获取转换策略（见下图）
            - let text = require('./page/a');
            - let text = require('./page/a');
        3. 更新 AST ，处理引用路径，并缓存
            - require 表达式
            - arguments[0].value 引用路径
        4. 使用 AST 重新生成代码
        5. 返回 { 代码, 引用关系 }
    4. 调用 parseModule 递归处理依赖
    5. 记录 ID(path) 和 code 对应关系，用于后续输出
    6. 触发钩子 afterCompile

路径引用转换前后的差异对比：
<img src="./images/require-path.png">

# 四、文件产出(chunk)

> ejs 模板处理

说明：简化处理，只处理了主入口模板，未处理按需加载

```bash
$ npm i ejs -S
```

## 1. 配置模板

```javascript
/******/ (function(modules) { // webpackBootstrap
/******/    // 其他固定模板内容 ... 
/******/ 	return __webpack_require__(__webpack_require__.s = "<%-entryId%>");
/******/ })
/************************************************************************/
/******/ ({

<% for(let moduleId in modules){ let source = modules[moduleId]; %>

/***/ "<%-moduleId%>":
/*!**********************!*\
    !*** <%-moduleId%> ***!
    \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("<%-source%>");

/***/ }),

<% } %>

/******/ });
```

## 2. 调用模板

说明：除了 this.modules 还需要一个入口模块的 id 需要传入

```javascript
run () {
    this.entryId = entry; // 此处简化处理，只处理单入口单配置
    let tmpl = fs.readFileSync(path.join(__dirname,'main.ejs'),'utf8');
    let bundle = ejs.compile(tmpl)({
        modules: this.modules,
        entryId: this.entryId
    });
    this.hooks.emit.call(this);
    fs.writeFileSync(path.join(dist, filename), bundle);
    this.hooks.done.call(this);
}
```

问题1：直接输出会报错，\n 在输出的时候直接换行了，出现下面的情况

```javascript
eval("let text = require('./src/page/b.js');
module.exports = text;");
```

- 处理换行符转义

```javascript
source = source.replace(/\n/g, '\\n');
```

问题2： ReferenceError: require is not defined

- 替换成 __webpack_require__

```javascript
node.callee.name = '__webpack_require__';
```

问题3： TypeError: Cannot read property 'call' of undefined at __webpack_require__

- 路径 id 匹配不上，参数中的为 './src/xxx'，缓存的为 'src/xxx'

```javascript
let moduleId = './' + path.relative(root, modulePath);
```

# 五、支持 loader

# 六、支持 plugin

> 二、初始化 - 4. 测试 已经支持了 plugin
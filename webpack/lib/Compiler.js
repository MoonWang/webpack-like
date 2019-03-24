const path = require('path');
const fs = require('fs');
const { SyncHook, SyncBailHook, AsyncSeriesHook } = require('tapable'); // 各类型钩子
const esprima = require('esprima'); // 解析成 AST 
const estraverse = require('estraverse'); // 遍历更新 AST
const escodegen = require('escodegen'); // AST 转源码

class Compiler {
    constructor(options) {
        this.options = options;

        // 1. 创建钩子
        this.hooks = {
            entryOption: new SyncBailHook(["options"]), // 读取配置完成（v5即将废弃）
            afterPlugins: new SyncHook(["compiler"]), // 插件加载完成
            // run: new AsyncSeriesHook(["compiler"]), // 启动一次新的编译，异步串行钩子(原生)
            run: new SyncHook(["compiler"]), // 此处简化成同步钩子
            compile: new SyncHook(["compiler"]), // 通知插件启动一次新的编译(原生中和 run 中间还有一个 readRecords )
        };

        // 3. 声明属性
        this.modules = {}; // 存储对应关系 path: code

        // 2. 遍历装载插件
        let plugins = this.options.plugins;
        if(Array.isArray(plugins) && plugins.length > 0) {
            plugins.forEach(plugin => {
                plugin.apply(this);
            })
        }
        this.hooks.afterPlugins.call(this);
    }

    // 执行编译
    run () {
        let { root, entry } = this.options;

        this.hooks.run.call(this);
        this.hooks.compile.call(this);

        // 递归解析模块，从入口开始
        this.parseModule(path.resolve(root, entry));

        console.log(this.modules);
    }

    // 解析模块及依赖模块
    // 注意：参数模块路径需要是绝对路径
    parseModule (modulePath) {
        // console.log('解析模块：', modulePath); // /Users/moon/store/webpack-like/test/src/index.js

        // 1. 获取当前模块相对于 =构建根路径= 计算的 =相对路径= 的 =路径名= dirname
        // 目的：用于给当前模块中的相对 =当前模块= 引用路径补全为相对 =根路径= 的引用路径
        let { root } = this.options; // /Users/moon/store/webpack-like/test
        let moduleId = path.relative(root, modulePath); // src/index.js (从 root 到 modulePath)
        let parentPath = path.dirname(moduleId); // src 获取目录名
        
        // 2. 读取文件内容，等待处理
        let source = fs.readFileSync(modulePath, 'utf8');

        // 3. 解析当前模块
        let parseResult = this.parse(source, parentPath);

        let requires = parseResult.requires;
        // 4. 递归处理模块的依赖
        if(requires && requires.length > 0){
            requires.forEach(require => {
                this.parseModule(path.join(root, require))
            });
        }
        // 5. 记录 ID 和转换后代码的对应关系，用于后续输出
        this.modules[moduleId] = parseResult.source;
    }

    // 解析单个文件，处理引用模块路径，获取转换后的代码及其依赖
    parse (source, parentPath) {
        // 1. 解析成 AST 
        let ast = esprima.parse(source);
        // console.log(ast.body[0].declarations[0].init);
        let requires = [];
        // 2. 更新 AST 
        estraverse.replace(ast, {
            // 注意：是 enter 不是 entry
            enter (node, parent) {
                // require 表达式
                if(node.type == 'CallExpression' && node.callee.name == 'require'){
                    // 待处理的路径值 ./page/a
                    let name = node.arguments[0].value;
                    // 后缀名补全，./page/a.js 此处省略 extensions 匹配过程 
                    name += (name.lastIndexOf('.') > 0 ? '' : '.js');
                    // 补全路径为 ./src/page/a.js
                    let moduleId = './' + path.join(parentPath, name);
                    // 保留该模块的依赖关系，用于后续处理
                    requires.push(moduleId);
                    // 更新 AST 中的内容
                    node.arguments = [{ 
                        type: 'Literal',
                        value: moduleId
                    }];
                    return node;
                }
                return node;
            }
        });
        // 3. 重新生成代码
        source = escodegen.generate(ast);
        // 4. 返回代码及依赖关系
        return { source, requires };
    }
}

module.exports = Compiler;
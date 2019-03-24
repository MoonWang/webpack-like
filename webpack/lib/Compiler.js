const path = require('path');
const fs = require('fs');
const { SyncHook, SyncBailHook, AsyncSeriesHook } = require('tapable'); // 各类型钩子
const esprima = require('esprima'); // 解析成 AST 
const estraverse = require('estraverse'); // 遍历更新 AST
const escodegen = require('escodegen'); // AST 转源码
const ejs = require('ejs'); // 模板

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
            // afterCompile: new AsyncSeriesHook(["compilation"]), // 编译完成(原生异步串行)
            afterCompile: new SyncHook(["compiler"]), // 编译完成
            // emit: new AsyncSeriesHook(["compilation"]),
            emit: new SyncHook(["compiler"]), // 即将输出
            // done: new AsyncSeriesHook(["stats"]),
            done: new SyncHook(["compiler"]), // 输出完成
        };

        // 3. 声明属性
        this.modules = {}; // 存储对应关系 path: code
        this.entryId = null;

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
        let { 
            root, 
            entry, 
            output: {
                path: dist,
                filename
            }
        } = this.options;

        this.hooks.run.call(this);
        this.hooks.compile.call(this);

        // 递归解析模块，从入口开始
        this.parseModule(path.resolve(root, entry), true);
        // console.log(this.modules);
        this.hooks.afterCompile.call(this);

        // 输出 chunk
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

    // 解析模块及依赖模块
    // 注意：参数模块路径需要是绝对路径
    parseModule (modulePath) {
        // console.log('解析模块：', modulePath); // /Users/moon/store/webpack-like/test/src/index.js

        // 1. 获取当前模块相对于 =构建根路径= 计算的 =相对路径= 的 =路径名= dirname
        // 目的：用于给当前模块中的相对 =当前模块= 引用路径补全为相对 =根路径= 的引用路径
        let { root, module: { rules }, resolveLoader: { modules: loaderPath } } = this.options; // /Users/moon/store/webpack-like/test
        let moduleId = './' + path.relative(root, modulePath); // ./src/index.js (从 root 到 modulePath)  注意： moduleId 也需要带上 ./ ，不然匹配不上
        let parentPath = path.dirname(moduleId); // src 获取目录名
        
        // 2. 读取文件内容，等待处理
        let source = fs.readFileSync(modulePath, 'utf8');

        // 6. 使用 loader 处理
        // console.log(rules);
        for(let i = 0; i < rules.length; i++){
            let rule = rules[i];
            if(rule.test.test(modulePath)){
                let loaders = rule.use || rule.loader;
                if(Array.isArray(loaders)){
                    // 注意是从后向前
                    for(let j = loaders.length - 1 ; j >= 0; j--){
                        // 简单处理，只写了一个 loaderPath ，实际可以设置多个
                        let loader = require(path.resolve(loaderPath, loaders[j]));
                        // 上一个 loader 处理的输出是下一个 loader 输入
                        source = loader(source);
                    }
                } else {
                    let loader = require(path.resolve(loaderPath, typeof use == 'string' ? use : use.loader));
                    source = loader(source);
                }
                break;
            }
        }

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
        // 注意，此处的 moduleId 也需要带上 ./ 
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
                    // 更改 require 方法名
                    node.callee.name = '__webpack_require__';
                    return node;
                }
                return node;
            }
        });
        // 3. 重新生成代码
        source = escodegen.generate(ast);
        // 处理换行问题
        source = source.replace(/\n/g, '\\n');
        // 4. 返回代码及依赖关系
        return { source, requires };
    }
}

module.exports = Compiler;
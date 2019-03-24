// 测试插件
class EntryOptionPlugin {
    constructor (opt) {
        
    }
    apply (compiler) {
        // compiler.hooks.entryOption.tap('xxx', (context, entry) => {
        //     console.log('entryOption hooks:', context, entry);
        // });
        // compiler.hooks.run.tapAsync('xxx', (compiler) => {
        //     console.log('run hooks:', compiler);
        // });
        // compiler.hooks.compile.tap('xxx', (params) => {
        //     console.log('entryOption hooks:', params); // { NormalModuleFactory , ContextModuleFactory, compilationDependencies }
        // });
    }
}

module.exports = EntryOptionPlugin;
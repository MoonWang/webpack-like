// 测试插件
class EntryOptionPlugin {
    constructor (opt) {
        
    }
    apply (compiler) {
        compiler.hooks.entryOption.tap('xxx', (context, entry) => {
            console.log('entryOption hooks:', context, entry);
        })
    }
}

module.exports = EntryOptionPlugin;
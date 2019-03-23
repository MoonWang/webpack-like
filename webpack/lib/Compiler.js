const { SyncHook, SyncBailHook } = require('tapable');

class Compiler {
    constructor(options) {
        this.options = options;

        // 1. 创建钩子
        this.hooks = {
            entryOption: new SyncBailHook(["options"]), // 读取配置完成
        };

        // 2. 遍历装载插件
        let plugins = this.options.plugins;
        if(Array.isArray(plugins) && plugins.length > 0) {
            plugins.forEach(plugin => {
                plugin.apply(this);
            })
        }
    }
}

module.exports = Compiler;
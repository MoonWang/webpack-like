const path = require('path');

const EntryOptionPlugin = require('./plugins/entry-option-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    // 配置可以先从项目目录查找 loader
    resolveLoader: {
        modules: path.resolve(__dirname, 'loaders') // 简化处理，规范要求必须是一个数组
        // modules: [
        //     path.resolve(__dirname, 'loaders'),
        //     path.resolve(__dirname, 'node_modules')
        // ]
    },
    module: {
        rules: [
            {
                test: /\.less/,
                loader: ['style-loader', 'less-loader']
            },
        ]
    },
    plugins: [
        new EntryOptionPlugin()
    ]
}
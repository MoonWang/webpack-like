const path = require('path');

const EntryOptionPlugin = require('./plugins/entry-option-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'bundle.js'
    },
    plugins: [
        new EntryOptionPlugin()
    ]
}
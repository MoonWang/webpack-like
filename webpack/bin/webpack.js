#! /usr/bin/env node
// lib
const path = require('path');

const Compiler = require('../lib/Compiler');

// 1. 获取执行命令的目录
const root = process.cwd();
// 2. 加载配置文件
const options = require(path.join(root, '/webpack.config.js'));
// 3. 初始化 Compiler
const compiler = new Compiler(options);
// 4. 发射 entryOption 钩子（原生传递的数据是 context 和 entry ，这里自由发挥）
compiler.hooks.entryOption.call(options);

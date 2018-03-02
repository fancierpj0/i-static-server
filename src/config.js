let debug = require('debug')('static:config');
let path = require('path');

let config = {
  host: 'localhost' //主机
  , port: 8080 //端口号
  , root: path.resolve(__dirname,'..','test-dir') //静态文件根目录
};

debug('默认配置:',config);
module.exports = config;
let debug = require('debug')('static:config');
let path = require('path');

let config = {
  host: 'localhost' //主机
  , port: 8080 //端口号
  , root: path.resolve(__dirname,'..','test-dir') //静态文件根目录
};

debug('默认配置:',config);
module.exports = config;

let fs = require('fs');
let path = require('path');
fs.stat(path.join(__dirname,'..','说明.txt'),(err,statObj)=>{
  if(err) return console.log(err);
  console.log(new Date(statObj.ctime).getTime()); //2018-03-02T17:02:59.900Z
  //1520010179900
})
// -d 静态文件根目录
// -o --host 主机
// -p --port 端口号
let yargs = require('yargs');
let Server = require('../src/app.js');
let argv = yargs.option('d',{
  alias:'root'
  ,demand:'false' //是否必填
  ,default:process.cwd()
  ,type:'string'
  ,description:'静态文件根目录'
}).option('o',{
  alias:'host'
  ,demand:'false' //是否必填
  ,default:'localhost'
  ,type:'string'
  ,description:'请配置监听的主机'
}).option('p',{
  alias:'port'
  ,demand:'false' //是否必填
  ,default:8080
  ,type:'number'
  ,description:'请配置端口号'
})
//usage 命令格式
  .usage('static-server [options]')
  // example 用法实例
  .example(
    'static-server -d / -p 9090 -o localhost'
    ,'在本机9090的端口上监听客户端的请求'
  )
  .help('h').argv;

//argv = {d,root,o,host,p,port}
let server = new Server(argv);
server.start();
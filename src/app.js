let config = require('./config.js');
let http = require('http');
let chalk = require('chalk');
let path = require('path');
let url = require('url');
let {inspect,promisify} = require('util');
let fs = require('fs');
let stat = promisify(fs.stat);
let readdir = promisify(fs.readdir);
let mime = require('mime');
let zlib = require('zlib');
let handlebars = require('handlebars');
//编译模板，得到一个渲染的方法，然后传入实际数据就可以得到渲染后的HTML
function list(){ //因为只在系统启动使用一次，使用同步异步无所谓
  let tmpl = fs.readFileSync(path.resolve(__dirname,'template','list.html'),'utf8');
  return handlebars.compile(tmpl);
}
let debug = require('debug')('static:app');
//这是一个在控制台输出的模块，引入时返回一个函数
//这个函数执行后又会返回一个函数
//是否在控制台打印取决于环境变量中DEBUG的值是否等于static:app
//设置的环境变量有特点，约定第一部分是项目名，第二部分是模块名

/**
 * 1. 显示目录下面的文件列表和返回内容
 * 2. 实现压缩的功能
 * 3. 实现缓存
 */
class Server {
  constructor(argv){
    this.list = list();
    this.config = Object.assign({},config,argv); //后面覆盖前面
  }
  start(){
    let server = http.createServer();
    server.on('request',this.request.bind(this));
    server.listen(this.config.port,()=>{
      let url = `${this.config.host}:${this.config.port}`;
      debug(`server started at ${chalk.green(url)}`);
    });
  }
  //静态文件服务器
  async request(req,res){
    //先取到客户端向访问的文件或文件夹路径
    let{pathname} = url.parse(req.url);
    if(pathname === '/favicon.ico') return; //网站图标
    let filepath = path.join(this.config.root,pathname);
    try{
      let statObj = await stat(filepath);
      if(statObj.isDirectory()){ //如果是目录，应该显示目录下的文件列表
        let files = await readdir(filepath);
        files = files.map(file=>({
          name:file,
          url:path.join(pathname,file) //  /images,/index.css,/index.html
        }));
        let html = this.list({
          title:pathname,
          files
        });
        res.setHeader('Content-Type','text/html');
        res.end(html);
      }else{
        this.sendFile(req,res,filepath,statObj);
      }

    }catch(e){
      debug(inspect(e)); //inspect把一个toString后的对象仍然能展开显示
      this.sendError(req,res);
    }
  }

  sendFile(req,res,filepath,statObj){
    if(this.handleCache(req,res,filepath,statObj))return; //如果走缓存，则直接返回
    res.setHeader('Content-type',mime.getType(filepath)+';charset=utf-8'); //.jpg
    let encoding = this.getEncoding(req,res);
    let rs = this.getStream(req,res,filepath,statObj);
    if(encoding){
      rs.pipe(encoding).pipe(res);
    }else{
      rs.pipe(res);
    }
  }
  getStream(req,res,filepath,statObj){
    let start = 0;
    let end = statObj.size - 1;
    let range = req.headers['range'];
    if(range){
      res.setHeader('Accept-Range','bytes');
      res.statusCode = 206; //返回整个数据的一块
      let result = range.match(/bytes=(\d*)-(\d*)/); //不可能有小数，网络传输的最小单位为一个字节
      if(result){
        start = isNaN(result[1])?0:parseInt(result[1]);
        end = isNaN(result[2])?end:parseInt(result[2]) - 1;
      }
    }
    return fs.createReadStream(filepath,{
      start,end
    });
  }
  sendError(req,res){
    res.statusCode = 500;
    res.end(`there is something wrong in the server! please try later!`);
  }
  getEncoding(req,res){
    let acceptEncoding = req.headers['accept-encoding'];
    if(/\bgzip\b/.test(acceptEncoding)){
      res.setHeader('Content-Encoding','gzip');
      return zlib.createGzip();
    }else if(/\bdeflate\b/.test(acceptEncoding)){
      res.setHeader('Content-Encoding','deflate');
      return zlib.createDeflate();
    }else{
      return null;
    }
  }
  handleCache(req,res,filepath,statObj){
    let ifModifiedSince = req.headers['if-modified-since'];
    let isNoneMatch = req.headers['is-none-match'];
    res.setHeader('Cache-Control','private,max-age=30');
    res.setHeader('Expires',new Date(Date.now()+30*1000).toGMTString()); //这个expires的强制缓存的时间格式不能随便写
    let etag = statObj.size;
    let lastModified = statObj.ctime.toGMTString();
    res.setHeader('ETag',etag);
    res.setHeader('Last-Modified',lastModified);

    if(isNoneMatch && isNoneMatch != etag)return false;
    if(ifModifiedSince && ifModifiedSince != lastModified)return false;
    if(isNoneMatch || ifModifiedSince){
      res.writeHead(304);
      res.end();
      return true;
    }else{
      return false;
    }
  }

}

// let server = new Server();
// server.start(); //启动服务

module.exports = Server;
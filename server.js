const http = require('http');
const path = require('path');
const port = process.env.PORT || 8080;
const Koa = require('koa');
const koaBody = require('koa-body');
const cors = require('koa2-cors');
//const cors = require('@koa/cors');
//const multer = require('@koa/multer');
const koaStatic = require('koa-static');
const WS = require('ws');
const commandManager = require('./commandManager');
const Router = require('koa-router');
//const Router = require('@koa/router');
const app = new Koa();
const router = new Router();
const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });
const users = [];

app.use(
  cors({
    origin: '*',
    credentials: true,
    'Access-Control-Allow-Origin': true,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  })
);

app.use(koaBody({
  json: true, 
  text: true, 
  urlencoded: true, 
  multipart: true,
}));

const data = [
  {id: '255', message: 'text text text', created: new Date().toLocaleString('ru'), type: 'text'},
  {id: '258', message: 'testtest', created: new Date().toLocaleString('ru'), type: 'text'},
  {id: '275', message: 'link https://google.com https://meduza.io/', created: new Date().toLocaleString('ru'), type: 'link'},
  {id: '345', message: 'photo.jpeg', created: new Date().toLocaleString('ru'), type: 'image'},
  {id: '346', message: 'Ocean83621.mp4', created: new Date().toLocaleString('ru'), type: 'video'},
  {id: '678', message: 'DostoevskiyDvoinik01.mp3', created: new Date().toLocaleString('ru'), type: 'audio'},
  {id: '679', message: 'book.pdf', created: new Date().toLocaleString('ru'), type: 'file'},
  {id: '301', message: 'text text text', created: new Date().toLocaleString('ru'), type: 'text'},
  {id: '105', message: 'Автором текста для «Тотального диктанта» в 2022 году стала писательница Марина Степнова. Для просветительской акции литератор подготовила историю, которую придумала после поездки в Воронеж на Платоновский фестиваль, сказала она во время онлайн-марафона «Русский язык: прошлое, настоящее, будущее» в среду, 8 сентября.', created: new Date().toLocaleString('ru'), type: 'text'},
  {id: '564', message: 'Главный специалист погодного центра «Фобос» Евгений Тишковец сообщил, что в Москве случится обвал полярного холода', created: new Date().toLocaleString('ru'), type: 'text'},
  {id: '444', message: 'Фотографии с резко похудевшим Ким Чен Ыном появились в Сети', created: new Date().toLocaleString('ru'), type: 'text'},
];

const fileDir = path.join(__dirname, '/public');
//const upload = multer();
app.use(koaStatic(fileDir));

wsServer.on('connection', (ws, req) => {
  users.push(ws);
  const manager = new commandManager(ws, users, data, fileDir);
  manager.init();

  router.post('/upload', async ctx => {
   console.log(ctx.request.body.file);
   console.log(ctx.request.body);
    manager.loadFiles(ctx.request.files.file).then((response) => {
      users.forEach((item) => {
        item.sendMsg(response);
      });
      // for (const user of users) {
      //   user.send(JSON.stringify({...response, command: 'newMessage'}))
      // }
    });
    ctx.response.status = 204;
  });

  ws.on('close', () => {
    const index = users.indexOf(ws);
    if (index !== -1) {
      users.splice(index, 1);
    }
  });

  ws.on('error', (event) => {
    console.log(event.code, event.reason);
  })
});

app.use(router.routes()).use(router.allowedMethods());
server.listen(port, () => console.log('Server started'));
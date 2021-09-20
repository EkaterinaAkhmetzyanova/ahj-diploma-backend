const uuid = require('uuid');
const path = require('path');
const fs = require('fs');

module.exports = class commandManager {
    constructor(ws, users, data, filesDir, categories, favorites) {
      this.ws = ws;
      this.users = users;
      this.data = data;
      this.filesDir = filesDir;
      this.counter = this.data.length;
      this.categories = categories;
      this.favorites = favorites;
    }

    init() {
      this.ws.send(this.countByCategory());
      this.ws.on('message', (msg) => {
          const message = JSON.parse(msg);
          switch (message.command) {
              case 'loadLatest':
                  this.loadLatest();
                  return;
              case 'newMessage':
                  this.newMessage(message);
                  return;
              case 'msgSearch': 
                  this.msgSearch(message);
                  return;  
              case 'sendGeo':
                  this.sendGeo(message);
                  this.sendMsg(this.countByCategory());
                  return;
              case 'addFavorite':
                  this.addFavorite(message);
                  return;
              case 'getCategory':
                  this.getCategory(message);
                  return;
              case 'update': 
                  this.counter = this.data.length;
                  this.loadLatest();
                  this.ws.send(this.countByCategory());
                  return;
          }
      });
    }

    loadLatest() {
       if (this.counter <= 10) {
           const latest = this.data.slice(0, this.counter);
           this.counter = 0;
           this.ws.send(
               JSON.stringify({
                   command: 'loadLatest',
                   data: latest.reverse(),
               })
           );
           return;
       } else {
           const latest = this.data.slice(this.counter - 10, this.counter);
           this.counter -= 10;
           this.ws.send(
            JSON.stringify({
                command: 'loadLatest',
                data: latest.reverse(),
            })
        );
        return;
       }
    }
    
    newMessage(msg) {
      let type;
      if (this.checkLink(msg.message)) {
          type = 'link';
      } else {
        type = 'text';
      }
      const item = {
          id: uuid.v1(),
          message: msg.message,
          created: new Date().toLocaleString('ru'),
          type: type,
      };
      console.log(msg.message);
      this.data.push(item);
      msg.data = item;
      console.log(msg);
      this.sendMsg(JSON.stringify(msg));
      this.sendMsg(this.countByCategory());
      return;
    }

    sendMsg(message) {
        this.users.forEach((item) => {
            item.send(message);
        });
        return;
    }

    sendGeo(msg) {
        const item = {
            id: uuid.v1(),
            message: msg.message,
            created: new Date().toLocaleString('ru'),
            type: 'geo',
        };
        this.data.push(item);
        msg.data = item;
        console.log(msg);
        this.sendMsg(JSON.stringify(msg));
        return;
    }

    msgSearch(message) {
        const value = message.message;
        const founded = this.data.filter((item) => {
            if (item.message.indexOf(value) !== 1) {
                return item;
            }
        });
        message.data = founded;
        this.ws.send(JSON.stringify(message));
    }

    checkLink(string) {
        const link = new RegExp(/^((ftp|http|https):\/\/)?(www\.)?([A-Za-zА-Яа-я0-9]{1}[A-Za-zА-Яа-я0-9\-]*\.?)*\.{1}[A-Za-zА-Яа-я0-9-]{2,8}(\/([\w#!:.?+=&%@!\-\/])*)?/);
        return link.test(string);
    }

    loadFiles(file) {
        return new Promise((resolve, reject) => {
            //const fName = file.name;
            let fType = file.type.split('/')[0];
            const types = ['audio', 'video', 'image'];
            if (!types.includes(fType)) {
                fType = 'file';
            }
            const oldDir = file.path;
            const newDir = path.join(this.filesDir, file.name);
            console.log(newDir);
            const readStream = fs.createReadStream(oldDir);
            const writeStream = fs.createWriteStream(newDir);
            const callback = (error) => reject(error);
            readStream.on('error', callback);
            writeStream.on('error', callback);
            readStream.on('close', () => {
                fs.unlink(oldDir, callback);
                const item = {
                    id: uuid.v1(),
                    message: file.name,
                    created: new Date().toLocaleString('ru'),
                    type: fType,
                    fileType: 'file',
                    fileFormat: file.type.split("/")[1],
                };
                this.data.push(item);
                console.log(item);
                resolve(
                    JSON.stringify({
                        command: 'newMessage',
                        data: item,
                    })
                );
            });
            readStream.pipe(writeStream);
        });
    }

    getCategory(message) {
        if (message.data === 'images') {
            message.data = this.data.filter((item) => {
                if (item.type === 'image') {
                    return item;
                }
            });
            this.ws.send(JSON.stringify(message));
        }
        if (message.data === 'audio') {
            message.data = this.data.filter((item) => {
                if (item.type === 'audio') {
                    return item;
                }
            });
            this.ws.send(JSON.stringify(message));
        }
        if (message.data === 'video') {
            message.data = this.data.filter((item) => {
                if (item.type === 'video') {
                    return item;
                }
            });
            this.ws.send(JSON.stringify(message));
        }
        if (message.data === 'files') {
            message.data = this.data.filter((item) => {
                if (item.type === 'file') {
                    return item;
                }
            });
            this.ws.send(JSON.stringify(message));
        }
        if (message.data === 'links') {
            message.data = this.data.filter((item) => {
                if (item.type === 'link') {
                    return item;
                }
            });
            this.ws.send(JSON.stringify(message));
        }
        if (message.data === 'messages') {
            this.counter = this.data.length;
            this.loadLatest();
        }
        if (message.data === 'posts') {
            message.data = this.data.filter((item) => {
                if (item.type === 'text') {
                    return item;
                }
            });
            this.ws.send(JSON.stringify(message));
        }
        if (message.data === 'favorites') {
            message.data = this.data.filter((item) => {
                this.favorites.has(item.id);
            });
            this.ws.send(JSON.stringify(message));
        }
    }

    countByCategory() {
        const links = this.data.filter((item) => {
            if (item.type === 'link') {
                return item;
            }
        });
        const audio = this.data.filter((item) => {
            if (item.type === 'audio') {
                return item;
            }
        });
        const video = this.data.filter((item) => {
            if (item.type === 'video') {
                return item;
            }
        });
        const images = this.data.filter((item) => {
            if (item.type === 'image') {
                return item;
            }
        });
        const files = this.data.filter((item) => {
            if (item.type === 'file') {
                return item;
            }
        });
        const textMsg = this.data.filter((item) => {
            if (item.type === 'text') {
                return item;
            }
        });
        const favorites = this.data.filter((item) => {
            if (this.favorites.has(item.id)) {
                return item;
            }
        });
        // if (links.length < 0 || audio.length < 0 || video.length < 0 || files.length < 0 || images.length < 0 || textMsg.length < 0 || favorites.length) {
        //     return;
        // }
        this.categories.links = links.length;
        this.categories.audio = audio.length;
        this.categories.video = video.length;
        this.categories.images = images.length;
        this.categories.files = files.length;
        this.categories.messages = this.data.length;
        this.categories.posts = textMsg.length;
        this.categories.favorites = favorites.length;
        return JSON.stringify({command: 'categoriesNum', data: this.categories})
    }

    addFavorite(id) {
        this.favorites.add(id);
        this.users.forEach((item) => {
            item.send(JSON.stringify({
                command: 'addFavorite',
                id: id,
            }));
        });
    }
}
const uuid = require('uuid');
const path = require('path');
const fs = require('fs');

module.exports = class commandManager {
    constructor(ws, users, data, filesDir) {
      this.ws = ws;
      this.users = users;
      this.data = data;
      this.filesDir = filesDir;
      this.counter = this.data.length;
    }

    init() {
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
          }
      })
    }
    
    // lazy load
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
    
    // new message
    newMessage(message) {
    const {text} = message;
      let type = 'text';
      if (this.checkLink(message.text)) {
          type = 'link';
      }
      const item = {
          id: uuid.v1(),
          message: text,
          created: new Date().toLocaleString('ru'),
          type: type,
          //geo
      };
      this.data.push(item);
      message.data = item;
      this.sendMsg(JSON.stringify(message));
      return;
    }

    sendMsg(message) {
        this.users.forEach((item) => {
            item.send(message);
        });
        return;
    }

    msgSearch(id) {
        const result = this.data.find((item) => item.id === id);
        this.ws.send(JSON.stringify(result));
    }

    checkLink(string) {
        const link = new RegExp(/^((ftp|http|https):\/\/)?(www\.)?([A-Za-zА-Яа-я0-9]{1}[A-Za-zА-Яа-я0-9\-]*\.?)*\.{1}[A-Za-zА-Яа-я0-9-]{2,8}(\/([\w#!:.?+=&%@!\-\/])*)?/);
        return link.test(string);
    }

    loadFiles(file) {
        return new Promise((resolve, reject) => {
            //const fName = file.name;
            const fType = file.type.split('/')[0];
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
        })
    }
}
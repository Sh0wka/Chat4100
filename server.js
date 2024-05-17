const express = require('express');
const { is } = require('type-is');
const app = express();
const port = 5555;
const server = app.listen(port, () => {
  console.log('Server działa na porcie ', port);
});
app.use(express.static(__dirname + '/public'));
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

let historia = {
  All: [],
};

let klient = [];
function getClient(sok) {
  let k = klient.filter((e) => e.socket == sok);
  if (k.length > 0) return k[0];
  return null;
}

function getClientNick(nick) {
  let k = klient.filter((e) => e.nick == nick);
  if (k.length > 0) return k[0];
  return null;
}

setInterval(() => {
  let usun = klient.filter((e) => new Date() - e.keepalive > 30000 && !e.room);
  usun.forEach((k) => {
    if (k.nick) io.sockets.emit('GoscWyszedl', k.nick);
  });
  klient = klient.filter((e) => new Date() - e.keepalive < 30000 || e.room);
}, 30000);

klient.push({
  socket: null,
  keepalive: new Date(),
  nick: 'All',
  room: true,
});

io.on('connection', (s) => {
  console.log('Nastąpiło połączenie');
  //  s.emit("wiadomosc", "Witaj")
  s.emit('wiadomosc', { klient: 'server', mess: 'Witaj' });
  klient.push({
    socket: s,
    keepalive: new Date(),
    room: false,
  });

  s.on('disconnect', () => {
    let k = getClient(s);
    if (k) {
      klient = klient.filter((e) => e.socket != s);
      if (k.nick) io.sockets.emit('GoscWyszedl', k.nick);
      console.log('disconect', k.nick);
    }

    console.log('disconect', s.id);
  });

  function wyslijGosci(socket) {
    klient.forEach((el) => {
      if (el.nick) socket.emit('nowyGosc', el.nick, el.room);
    });
  }
  function wyslijWiadomosci(socket) {
    historia.All.forEach((el) => {
      //console.log(el);
      if (el.klient) {
        socket.emit('wiadomosc', { mess: el.mess, klient: el.klient });
      }
    });
  }

  s.on('roomreg', (room) => {
    s.join(room);
    // console.log("dodaj do pokoju", room)
    // console.log(s.room)
  });

  s.on('zmianapokoju', (room) => {
    let odb = getClientNick(room);
    let odb1 = getClient(s);

    if (odb && odb1 && odb.nick != odb1.nick && !odb.room && !odb1.room) {
      let res = [];
      if (historia[odb1.nick + '|' + odb.nick])
        res.concat(
          historia[odb1.nick + '|' + odb.nick].filter(
            (e) => (e.pv && e.klient == odb1.nick) || e.klient == odb.nick
          )
        );
      if (historia[odb.nick + '|' + odb1.nick])
        res.concat(
          historia[odb.nick + '|' + odb1.nick].filter(
            (e) => (e.pv && e.klient == odb1.nick) || e.klient == odb.nick
          )
        );
      s.emit('wiadomosciPoZmianiePokoju', res);
    } else
      s.emit('wiadomosciPoZmianiePokoju', historia[room] ? historia[room] : []);
  });

  s.on('roomunreg', (room) => {
    s.leave(room);
  });

  s.on('nick', (nick) => {
    s.join('All');
    wyslijGosci(s);
    wyslijWiadomosci(s);
    io.sockets.emit('nowyGosc', nick);
  });

  s.on('jestem', () => {
    let k = getClient(s);
    if (k) {
      k.keepalive = new Date();
    }
  });
  setInterval(
    () =>
      klient.forEach((element) => {
        element.messCount = 0;
      }),
    10000
  );

  s.on('wiadomosc', (wiadomosc, nick) => {
    let k = getClient(s);
    console.log({ k, nick });

    wiadomosc = wiadomosc.replaceAll(/on([\S])\w+\=/gi, '');
    console.log({ wiadomosc });

    if (k != null && k.nick) {
      if (!k.messCount) k.messCount = 0;
      k.messCount++;
      if (k.messCount < 10) {
        if (!nick) {
          historia.All.push({
            klient: k.nick,
            ts: new Date(),
            pv: false,
            mess: wiadomosc,
          });
          if (historia.All.length > 100) historia.All.unshift();
          io.sockets.emit('wiadomosc', { klient: k.nick, mess: wiadomosc });
        } else {
          let odb = getClientNick(nick);
          if (!odb) {
            s.emit('wiadomosc', { klient: 'server', mess: 'brak odbiorcy!!!' });
            return;
          }
          if (odb.room) {
            console.log(odb, nick);

            io.to(odb.nick).emit('wiadomosc', {
              klient: k.nick,
              mess: wiadomosc,
            });
            if (!historia[nick]) {
              historia[nick] = [];
              // console.log("resetuje pok", nick);
            }

            historia[nick].push({
              klient: k.nick,
              ts: new Date(),
              pv: false,
              mess: wiadomosc,
            });
          } else {
            odb.socket.emit('wiadomosc', { klient: k.nick, mess: wiadomosc });
            let newnick = k.nick + '|' + odb.nick;
            if (!historia[newnick]) {
              historia[newnick] = [];
            }
            historia[newnick].push({
              klient: k.nick,
              ts: new Date(),
              pv: true,
              mess: wiadomosc,
            });

            s.emit('wiadomosc', { klient: k.nick, mess: wiadomosc });
          }
        }
        console.log('serwer wysyła wiadomosc', k.messCount, wiadomosc);
      }
    } else
      s.emit('wiadomosc', { klient: 'server', mess: 'Nie podałeś nick-u' });
  });
});

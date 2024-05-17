const socket = io('ws://localhost:5555');
// const socket = io("ws://10.10.28.231:5555");

let ROOM = '';

let mojNick = prompt('Podaj NICK', '');

socket.emit('nick', mojNick);

socket.on('GoscWyszedl', (gosc) => {
  let li = document.querySelector(`.left li#id${gosc}`);
  if (!li) return;

  li.remove();
});

socket.on('nowyGosc', (gosc, room) => {
  let li = document.querySelector(`.left li#id${gosc}`);
  if (li) return;
  let ul = document.querySelector(`.left ul`);
  let newLi = document.createElement('li');
  newLi.setAttribute('room', room);
  newLi.id = `id` + gosc;
  newLi.innerHTML = gosc;
  ul.append(newLi);
});

socket.on('wiadomosciPoZmianiePokoju', (wiadomosci) => {
  let mess = document.querySelector('.right');
  mess.innerHTML = '';
  wiadomosci.forEach((wiad) => wiadomosc(wiad));
});

function wiadomosc(wiad) {
  let mess = document.querySelector('.right');
  let span = document.createElement('span');
  span.innerHTML = wiad.mess;
  let txtMess = span.innerText;
  // console.log(/(<.+?)(?<=\s)on[a-z]+\s*=\s*(?:([\'"])(?!\2).+?\2|(?:\S+?\(.*?\)(?=[\s>])))(.*?>)/.test(txtMess));
  let img = null;
  if ((img = span.querySelector('img')))
    tetMess += `<img src="${img.src}" alt="">`;
  mess.innerHTML =
    `<div><span>${wiad.klient}:<span> ${txtMess}</div>` + mess.innerHTML;
  //   console.log("dostałeś wiadomość ", wiad)
}

socket.on('wiadomosc', (wiad) => {
  wiadomosc(wiad);
});

socket.on('connect', (wiad) => {
  console.log('Jesteś połączony');
  socket.emit('nick', mojNick);
});

setInterval(() => {
  socket.emit('jestem');
}, 10000);

function WyslijWiadomosc() {
  let nick = document.querySelector('.left li.select');
  if (!!nick?.getAttribute('room')) {
    if (ROOM != '') {
      socket.emit('roomunreg', nick.innerText);
    }

    if (nick.innerText != 'All') {
      socket.emit('roomreg', nick.innerText);
      ROOM = nick.innerText;
    } else ROOM = '';
  }
  if (!nick) {
    let mess = document.querySelector('.right');
    mess.innerHTML =
      `<div class="big">
                <span>Local:<span>Zaznacz odbiorcę !</div>` + mess.innerHTML;
    return;
  }
  if (nick && nick.innerText == 'All') {
    nick = '';
  } else {
    nick = nick.innerText;
  }
  let tresc = document.querySelector('#mess').value;
  document.querySelector('#mess').value = '';
  socket.emit('wiadomosc', tresc, nick);
}

document.querySelector('#wyslij').addEventListener('click', (e) => {
  WyslijWiadomosc();
});

document.querySelector('.left ul').addEventListener('click', (e) => {
  document.querySelectorAll('.left li').forEach((x) => {
    x.classList.remove('select');
  });
  e.target.classList.add('select');
  socket.emit('zmianapokoju', e.target.innerText);
  console.log(e.target);
});

document.querySelector('#mess').addEventListener('keyup', (event) => {
  if (event.isComposing || event.keyCode === 13) {
    WyslijWiadomosc();
  }
});

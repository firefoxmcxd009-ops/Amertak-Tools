const track = document.getElementById("track");
let cards = document.querySelectorAll(".slider-card");
let index = 0;
let auto;

function visible() {
  if (innerWidth <= 600) return 1;
  if (innerWidth <= 900) return 2;
  return 3;
}

function setupClone() {
  let count = visible();
  cards = document.querySelectorAll(".slider-card");
  for (let i = 0; i < count; i++) {
    let clone = cards[i].cloneNode(true);
    track.appendChild(clone);
  }
}

setupClone();
cards = document.querySelectorAll(".slider-card");

function move() {
  let width = cards[0].offsetWidth + 20;
  track.style.transform = `translateX(-${index * width}px)`;
}

function next() {
  index++;
  track.style.transition = ".5s ease";
  move();

  let max = cards.length - visible();
  if (index >= max) {
    setTimeout(() => {
      track.style.transition = "none";
      index = 0;
      move();
    }, 500);
  }
}

function prev() {
  if (index <= 0) {
    track.style.transition = "none";
    index = cards.length - visible() - 1;
    move();
    setTimeout(() => {
      track.style.transition = ".5s ease";
      index--;
      move();
    }, 20);
  } else {
    index--;
    move();
  }
}

document.querySelector(".next").onclick = () => {
  next();
  restart();
};

document.querySelector(".prev").onclick = () => {
  prev();
  restart();
};

function start() {
  auto = setInterval(() => {
    next();
  }, 3000);
}

function restart() {
  clearInterval(auto);
  setTimeout(() => {
    start();
  }, 5000);
}

start();

window.onresize = () => {
  location.reload();
};
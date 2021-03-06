"use strict";

var canvasWidth = 600;
var canvasHeight = 600;
var blackSpaceFill = 0;
var points = 0;
var textColor;
var ship;
var soundMgr;
var debugMode = false;
var frameDebug = false;

var asteroids = [];
var protonBolts = [];
var aliens = [];

var points_string = '';
var points_string_location;
var FPS_string  = '';
var FPS_string_location;
var Game_Over_string = 'Game Over. Press [Enter] to start again.';
var Game_Over_string_location;
var nextAlienSpawnTime = 0;
var alienSpawnRateInSeconds = 70;

function reset() {
    var canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('sketch-holder');

    frameRate(60);
    background(blackSpaceFill);
    nextAlienSpawnTime = 0;

    textSize(14);
    //textStyle(BOLD);
    textColor = 255;
    textFont('Courier New');

    points = 0;

    ship = new Ship();
    asteroids = [];
    asteroids.push(new Asteroid())

    soundMgr = new SoundManager();

    aliens = [];

    setInterval(halfSecondUpdateLoop,500);
    setInterval(oneSecondUpdateLoop,1000);

    points_string_location = createVector(canvasWidth*(19/24),20);
    FPS_string_location = createVector(10,20);
    protonBolts = [];

    Game_Over_string_location = createVector(canvasWidth/5,canvasHeight/2);
}


function setup() {
  reset();
}

function draw() {

    handleKeyInput();

    background(blackSpaceFill);

    renderText();

    //handle all the asteroids
    for(var i = asteroids.length -1; i >= 0; i--)
    {
      asteroids[i].update();
      asteroids[i].render();
    }

    //handle all the proton bolts
    for (var i = protonBolts.length - 1; i >= 0; --i)
    {
      protonBolts[i].update();
      protonBolts[i].render();

      if(protonBolts[i].deleteFlag)
      {
        protonBolts.splice(i,1);
      }
    }

    for(var i = aliens.length - 1; i >= 0; i--)
    {
      aliens[i].update()
      if(aliens[i].angry && dist(aliens[i].pos.x,aliens[i].pos.y,ship.pos.x,ship.pos.y) < aliens[i].deathRayMaxRange-aliens[i].scl)
      {
        ship.kill();
      }

      aliens[i].render();

      if(aliens[i].deleteFlag)
      {
        aliens.splice(i,1);
      }
    }

    //check for collisions
    for (var i = protonBolts.length - 1; i >= 0; --i)
    {
      let bolt = protonBolts[i];
      for(var j = asteroids.length - 1; j >= 0; j--)
      {
        if(asteroids[j].checkCollision(bolt.pos.x,bolt.pos.y))
        {
          //check if the rock breaks
          var smallRock = asteroids[j].smallerAsteroidSize();
          if(smallRock > 12)
          {
            //record previous position
            var oldPos = asteroids[j].pos

            //create two more on the high end of the array
            asteroids.push(new Asteroid(oldPos.x,oldPos.y,smallRock));
            asteroids.push(new Asteroid(oldPos.x,oldPos.y,smallRock));
          }
          //delete the old asteroid
          asteroids.splice(j,1);
          protonBolts[i].deleteFlag = true;

          points += 10;
          soundMgr.queueSound('asteroid_break');
        }
      }

      for(var j = aliens.length - 1; j >= 0; j--)
      {
        if(aliens[j].checkCollision(bolt.pos.x,bolt.pos.y))
        {
          if(!aliens[j].angry)
          {
            soundMgr.queueSound('alien_angry');
          }
          aliens[j].hit();

          protonBolts[i].deleteFlag = true;
        }
      }

      if(protonBolts[i].deleteFlag)
      {
        protonBolts.splice(i,1);
      }

    }

    //render ship last so it overlays everything
    ship.update();
    ship.render();

    if(ship.dead)
    {
      textColor = color(255,0,0);
      text(Game_Over_string,Game_Over_string_location.x,Game_Over_string_location.y);
    }

    //play all the sounds we've built up this frame
    soundMgr.playAllQueuedSounds();

      //freeze for analysis
      if(frameDebug)
      {
        throw 'freeze';
      }
}


function mousePressed()
{

}

//handles continuous presses
var handleKeyInput = function()
{
    //key handling
    if(keyIsDown(UP_ARROW) || keyIsDown(87) /* w */)
    {
      ship.thrust();
    }
    if(keyIsDown(DOWN_ARROW) || keyIsDown(83) /* s */)
    {
      ship.retro();
    }
    if(keyIsDown(LEFT_ARROW) || keyIsDown(65) /* a */)
    {
      ship.rotateCounterClockwise();
    }
    if(keyIsDown(RIGHT_ARROW) || keyIsDown(68) /* d */)
    {
      ship.rotateClockwise();
    }
    resumeSoundIfContextBlocked();
};

function keyPressed() {
  resumeSoundIfContextBlocked();

  if(key == ' ' && !ship.dead)
  {
    protonBolts.push(new Proton(ship.gunPos.x,ship.gunPos.y,radians(ship.gunOrientation)));
    soundMgr.queueSound('proton_bolt');
  }

  if(key == 'L' && debugMode)
  {
    aliens.push(new Alien());
    soundMgr.queueSound('alien_approach');
  }

  if(key == 'K' && debugMode)
  {
    ship.kill()
  }

  if(key == 'O' && debugMode)
  {
      for(var i = aliens.length - 1; i >= 0; i--)
      {
        aliens[i].getAngry();
      }
  }

  if(key=='I' && debugMode)
  {
     print("ship pos "+str(ship.pos.x.toFixed(1))+','+str(ship.pos.y.toFixed(1)));
     frameDebug = true;

  }

  if(keyCode == ENTER || keyCode == RETURN)
  {
    reset();
  }
};

var addAsteroidsIfNeeded = function()
{
  if(asteroids.length <= 0)
  {
    var toAdd = 3 + (millis()/1000/60); //3 + number of minutes you have been playing
    for(var i=0; i < toAdd;i++)
    {
      asteroids.push(new Asteroid())
    }
  }
}

var addAliensIfNeeded = function()
{
  var currentMillis = millis();
  if(nextAlienSpawnTime < 1)
  {
    nextAlienSpawnTime = currentMillis + 20*1000;
  }
  if (currentMillis > nextAlienSpawnTime)
  {
    aliens.push(new Alien());
    soundMgr.queueSound('alien_approach');
    nextAlienSpawnTime = currentMillis + alienSpawnRateInSeconds*1000;
  }
}


function randomFromInterval(min,max){
    return Math.random()*(max-min+1)+min;
}

function coinFlip()
{
  return (int(Math.random() * 2) == 0);
}

function UI_text_update()
{
  var fps = frameRate();
  FPS_string = "FPS:" + fps.toFixed(0);

  points_string = "Points: " + points;
}

function renderText()
{
    stroke(textColor);
    fill(textColor);
    text(FPS_string, FPS_string_location.x,FPS_string_location.y);
    text(points_string,points_string_location.x,points_string_location.y);
}

function oneSecondUpdateLoop() {
  addAsteroidsIfNeeded();
  addAliensIfNeeded();
  if(ship.dead)
  {
    for(var i = aliens.length - 1; i >= 0; i--)
    {
      aliens[i].calm();
    }
  }
}

function halfSecondUpdateLoop(){
  UI_text_update();
}

function resumeSoundIfContextBlocked()
{
  if (getAudioContext().state !== 'running')
  {
        getAudioContext().resume();
  }
}
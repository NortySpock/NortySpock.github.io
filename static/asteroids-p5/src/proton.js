function Proton(startx,starty,radianDirection,inputvel)  //the bullets of the game
{
  this.pos = createVector(startx,starty);
  if(inputvel)
  {
    this.vel = p5.Vector.fromAngle(radianDirection)
    this.vel.add(inputvel)
  } else
  {
    this.vel = p5.Vector.fromAngle(radianDirection)
  }
  this.protonSpeedMult = 5;
  this.vel.mult(this.protonSpeedMult);
  this.deleteFlag = false;
  this.numberOfXCrossings = 0;
  this.numberOfYCrossings = 0;



  this.update = function()
  {
      this.pos.add(this.vel);

      // transition to other side of screen if crossed,
      // but we might delete it if it has flown too far.
      if(this.pos.x < 0 || this.pos.x > canvasWidth ||
         this.pos.y < 0 || this.pos.y > canvasHeight)
      {
        //appear on other edge if we go offscreen
        if(this.pos.x > canvasWidth)
        {
          this.pos.x = 0;
          this.numberOfXCrossings += 1;
        }
        if(this.pos.x < 0)
        {
          this.pos.x = canvasWidth;
          this.numberOfXCrossings += 1;
        }
        if(this.pos.y > canvasHeight)
        {
          this.pos.y = 0;
          this.numberOfYCrossings += 1;
        }
        if(this.pos.y < 0)
        {
          this.pos.y = canvasHeight;
          this.numberOfYCrossings += 1;
        }
      }

      if(this.numberOfXCrossings > 1 || this.numberOfYCrossings > 1)
      {
        this.deleteFlag = true;
      }
  }

  this.render = function()
  {
    push();
    stroke(255);
    strokeWeight(4);
    point(this.pos.x,this.pos.y);
    pop();
  }
}
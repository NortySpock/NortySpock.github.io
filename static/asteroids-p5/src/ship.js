"use strict";
class Ship
{
    constructor()
    {
        this.pos = createVector(canvasWidth/2,canvasHeight/2);
        this.vel = createVector(0,0);
        this.rotation = 0;
        this.gunOrientation = 0;
        this.gunPos = createVector();
        this.gunRotationOffset = -90;
        this.rotationRate = 4; //degrees
        this.thrustRate = 0.1;
        this.retroMult = 0.98;
        this.showThrusterFiring = false;
        this.coords = [];
        this.scl = min(canvasHeight,canvasWidth) / 30;
        this.dead = false;
        //this.lines = [];
    }

    render()
    {
        var scl = this.scl;
        push();

        translate(this.pos.x,this.pos.y);
        rotate(radians(this.rotation));

        fill(0);
        strokeWeight(1);

        if(this.showThrusterFiring)
        {
          stroke(0,255,255); //cyan
        }
        else if(this.dead)
        {
          stroke(255,0,0,128); //dark red
        }
        else
        {
          stroke(0,255,0); //green
        }

        //I had to adjust the draw location to get
        //the Center of Rotation to feel right for this shape.
        //Center of Rotation is better known as
        //the Center of Gravity
        var CoG_offset = (scl/2)+(scl/10);
        this.coords = [0,        0-scl+CoG_offset,
                       0+(scl/2),0+CoG_offset,
                       0,        0-(scl/2)+CoG_offset,
                       0-(scl/2),0+CoG_offset ];


        quad(this.coords[0],this.coords[1],
             this.coords[2],this.coords[3],
             this.coords[4],this.coords[5],
             this.coords[6],this.coords[7]);

        pop();
        noFill()
        //ellipse(this.pos.x,this.pos.y,this.scl*2.5);
        //reset flag for next cycle
        this.showThrusterFiring = false;
    }

    update()
    {
      this.pos.add(this.vel);

      //appear on other edge if we go offscreen
      if(this.pos.x > canvasWidth)
      {
        this.pos.x = 0;
      }
      if(this.pos.x < 0)
      {
        this.pos.x = canvasWidth;
      }
      if(this.pos.y > canvasHeight)
      {
        this.pos.y = 0;
      }
      if(this.pos.y < 0)
      {
        this.pos.y = canvasHeight;
      }

      this.gunOrientation = this.rotation + this.gunRotationOffset;
      this.gunPos = createVector(this.pos.x,this.pos.y);
    }

    thrust()
    {
      if(!this.dead)
      {
        var xcomponent = this.thrustRate * Math.sin(radians(this.rotation));
        var ycomponent = this.thrustRate * -Math.cos(radians(this.rotation));

        this.vel.add(xcomponent,ycomponent);

        this.showThrusterFiring = true;
      }
    }

    retro()
    {
      if(!this.dead)
      {
        this.vel.mult(this.retroMult);
      }
    }

    rotateClockwise()
    {
      if(!this.dead)
      {
        this.rotation += this.rotationRate;
      }
    }

    rotateCounterClockwise()
    {
      if(!this.dead)
      {
        this.rotation -= this.rotationRate;
      }
    }

    kill()
    {
      this.dead = true;
    }
}